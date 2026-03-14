import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

// In-process cache for barcode_enabled — this setting changes extremely rarely
// so a per-request DB query on every dashboard page load is unnecessary overhead.
let barcodeCache: { value: boolean; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

export function _invalidateBarcodeCache() {
	barcodeCache = null;
}

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { barcodeEnabled: false };
	try {
		const now = Date.now();
		if (!barcodeCache || now > barcodeCache.expiresAt) {
			const row = await db
				.select()
				.from(systemSettings)
				.where(eq(systemSettings.key, 'barcode_enabled'))
				.limit(1);
			barcodeCache = { value: row[0]?.value === 'true', expiresAt: now + CACHE_TTL_MS };
		}
		return { barcodeEnabled: barcodeCache.value };
	} catch (err) {
		console.error('[layout] Failed to read barcode_enabled — defaulting to false:', err);
		return { barcodeEnabled: false };
	}
};
