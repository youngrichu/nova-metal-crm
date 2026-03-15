import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { redirect, fail } from '@sveltejs/kit';
import { invalidateBarcodeCache } from '$lib/server/barcodeCache';
import type { PageServerLoad, Actions } from './$types';

const SETTING_KEYS = ['vat_rate', 'markup_retail', 'markup_wholesale', 'markup_vip', 'markup_preferred', 'currency_code', 'currency_locale', 'barcode_enabled', 'printer_type', 'printer_address', 'paper_width', 'company_name', 'company_address'] as const;

const DEFAULTS: Record<string, string> = {
    vat_rate: '0.15',
    markup_retail: '1.15',
    markup_wholesale: '1.05',
    markup_vip: '1.05',
    markup_preferred: '1.08',
    currency_code: 'ETB',
    currency_locale: 'en-ET',
    barcode_enabled: 'false',
    printer_type: 'network',
    printer_address: '192.168.1.100',
    paper_width: '80',
    company_name: 'NOVA METAL PLC',
    company_address: 'Addis Ababa, Ethiopia'
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
            if (key === 'currency_locale') {
                if (raw.length > 20) {
                    return fail(400, { error: 'Currency locale value is too long (max 20 characters)' });
                }
                try {
                    new Intl.Locale(raw);
                } catch {
                    return fail(400, { error: 'Invalid locale — use a BCP 47 tag (e.g. en-ET, am-ET, en-US)' });
                }
            }
            if (key === 'barcode_enabled' && !['true', 'false'].includes(raw)) {
                return fail(400, { error: 'Invalid value for barcode_enabled' });
            }
            if (key === 'printer_type' && !['network', 'usb'].includes(raw)) {
                return fail(400, { error: 'Printer type must be "network" or "usb"' });
            }
            if (key === 'paper_width' && !['58', '80'].includes(raw)) {
                return fail(400, { error: 'Paper width must be 58 or 80' });
            }
            if (key === 'printer_address') {
                if (raw.length > 255) {
                    return fail(400, { error: 'Printer address is too long' });
                }
                // Require hostname to start and end with alphanumeric (no leading/trailing dots)
                const addrMatch = raw.match(/^([a-zA-Z0-9]([a-zA-Z0-9\-_.]*[a-zA-Z0-9])?)(?::(\d+))?$/);
                if (!addrMatch) {
                    return fail(400, { error: 'Invalid printer address — use an IP or hostname, optionally with :port (e.g. 192.168.1.100 or 192.168.1.100:9100)' });
                }
                if (addrMatch[3]) {
                    const port = parseInt(addrMatch[3], 10);
                    if (port < 1 || port > 65535) {
                        return fail(400, { error: 'Port must be between 1 and 65535' });
                    }
                }
            }
            if (key === 'company_name') {
                if (raw.length > 100) return fail(400, { error: 'Company name must be 100 characters or fewer' });
                if (/[\x00-\x1F\x7F]/.test(raw)) return fail(400, { error: 'Company name must not contain control characters' });
            }
            if (key === 'company_address') {
                if (raw.length > 200) return fail(400, { error: 'Company address must be 200 characters or fewer' });
                if (/[\x00-\x1F\x7F]/.test(raw)) return fail(400, { error: 'Company address must not contain control characters' });
            }

            updates.push({ key, value: raw });
        }

        // Cross-field: network mode requires a non-empty address.
        // Use the validated updates array (falls back to 'network' default if omitted).
        const resolvedType = updates.find(u => u.key === 'printer_type')?.value ?? 'network';
        const hasAddress = updates.some(u => u.key === 'printer_address');
        if (resolvedType === 'network' && !hasAddress) {
            return fail(400, { error: 'Printer IP address is required for Network connection type' });
        }

        const userId = locals.user.id;
        try {
            await db.transaction(async (tx) => {
                for (const { key, value } of updates) {
                    await tx.insert(systemSettings)
                        .values({ key, value, updatedAt: new Date(), updatedBy: userId })
                        .onConflictDoUpdate({
                            target: systemSettings.key,
                            set: { value, updatedAt: new Date(), updatedBy: userId }
                        });
                }
            });
            invalidateBarcodeCache();
            return { success: true };
        } catch (e) {
            console.error('System settings update error:', e);
            return fail(500, { error: 'Failed to save settings' });
        }
    }
};
