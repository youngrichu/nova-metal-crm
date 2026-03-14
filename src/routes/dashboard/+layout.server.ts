import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { getBarcodeCache, setBarcodeCache } from '$lib/server/barcodeCache';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { barcodeEnabled: false };
	try {
		const cached = getBarcodeCache();
		if (cached !== null) return { barcodeEnabled: cached };

		const row = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.key, 'barcode_enabled'))
			.limit(1);
		const value = row[0]?.value === 'true';
		setBarcodeCache(value);
		return { barcodeEnabled: value };
	} catch (err) {
		console.error('[layout] Failed to read barcode_enabled — defaulting to false:', err);
		return { barcodeEnabled: false };
	}
};
