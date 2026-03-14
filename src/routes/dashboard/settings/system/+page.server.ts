import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { redirect, fail } from '@sveltejs/kit';
import { invalidateBarcodeCache } from '../+layout.server';
import type { PageServerLoad, Actions } from './$types';

const SETTING_KEYS = ['vat_rate', 'markup_retail', 'markup_wholesale', 'markup_vip', 'markup_preferred', 'currency_code', 'currency_locale', 'barcode_enabled'] as const;

const DEFAULTS: Record<string, string> = {
    vat_rate: '0.15',
    markup_retail: '1.15',
    markup_wholesale: '1.05',
    markup_vip: '1.05',
    markup_preferred: '1.08',
    currency_code: 'ETB',
    currency_locale: 'en-ET',
    barcode_enabled: 'false'
};

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');
    if (locals.user.role !== 'admin') throw redirect(302, '/dashboard');

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
        if (locals.user.role !== 'admin') {
            return fail(403, { error: 'Only admins can update system settings' });
        }

        const formData = await request.formData();

        const updates: { key: string; value: string }[] = [];

        for (const key of SETTING_KEYS) {
            const raw = formData.get(key)?.toString().trim();
            if (!raw) continue;

            // Validate numeric fields
            if (['vat_rate', 'markup_retail', 'markup_wholesale', 'markup_vip', 'markup_preferred'].includes(key)) {
                const num = parseFloat(raw);
                if (isNaN(num) || num < 0) {
                    return fail(400, { error: `Invalid value for ${key}` });
                }
                if (key === 'vat_rate' && num > 1) {
                    return fail(400, { error: 'VAT rate must be between 0 and 1' });
                }
                const MARKUP_KEYS = ['markup_retail', 'markup_wholesale', 'markup_vip', 'markup_preferred'];
                if (MARKUP_KEYS.includes(key) && num < 1) {
                    return fail(400, { error: `${key} must be at least 1.0 (no negative markups)` });
                }
            }

            if (key === 'currency_code' && !/^[A-Z]{3}$/.test(raw)) {
                return fail(400, { error: 'Currency code must be a 3-letter uppercase ISO code (e.g. ETB, USD)' });
            }
            if (key === 'currency_locale' && raw.length > 20) {
                return fail(400, { error: 'Currency locale value is too long (max 20 characters)' });
            }
            if (key === 'barcode_enabled' && !['true', 'false'].includes(raw)) {
                return fail(400, { error: 'Invalid value for barcode_enabled' });
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
            invalidateBarcodeCache();
            return { success: true };
        } catch (e) {
            console.error('System settings update error:', e);
            return fail(500, { error: 'Failed to save settings' });
        }
    }
};
