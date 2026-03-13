import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const SETTING_KEYS = ['vat_rate', 'markup_retail', 'markup_wholesale', 'markup_vip', 'currency_code', 'currency_locale'] as const;

const DEFAULTS: Record<string, string> = {
    vat_rate: '0.15',
    markup_retail: '1.15',
    markup_wholesale: '1.05',
    markup_vip: '1.05',
    currency_code: 'ETB',
    currency_locale: 'en-ET'
};

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    const rows = await db.select().from(systemSettings);
    const settingsMap: Record<string, string> = { ...DEFAULTS };

    for (const row of rows) {
        settingsMap[row.key] = row.value;
    }

    return { settings: settingsMap };
};

export const actions: Actions = {
    update: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });

        // Only admins can update system settings
        if ((locals.user as any).role !== 'admin') {
            return fail(403, { error: 'Only admins can update system settings' });
        }

        const formData = await request.formData();

        const updates: { key: string; value: string }[] = [];

        for (const key of SETTING_KEYS) {
            const raw = formData.get(key)?.toString().trim();
            if (!raw) continue;

            // Validate numeric fields
            if (['vat_rate', 'markup_retail', 'markup_wholesale', 'markup_vip'].includes(key)) {
                const num = parseFloat(raw);
                if (isNaN(num) || num < 0) {
                    return fail(400, { error: `Invalid value for ${key}` });
                }
            }

            updates.push({ key, value: raw });
        }

        try {
            for (const { key, value } of updates) {
                await db.insert(systemSettings)
                    .values({ key, value, updatedAt: new Date(), updatedBy: locals.user.id })
                    .onConflictDoUpdate({
                        target: systemSettings.key,
                        set: { value, updatedAt: new Date(), updatedBy: locals.user.id }
                    });
            }
            return { success: true };
        } catch (e) {
            console.error('System settings update error:', e);
            return fail(500, { error: 'Failed to save settings' });
        }
    }
};
