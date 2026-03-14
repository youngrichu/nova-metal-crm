// In-process cache for barcode_enabled — this setting changes extremely rarely
// so a per-request DB query on every dashboard page load is unnecessary overhead.
let cache: { value: boolean; expiresAt: number } | null = null;
const TTL_MS = 60_000; // 60 seconds

export function getBarcodeCache(): boolean | null {
	if (cache && Date.now() < cache.expiresAt) return cache.value;
	return null;
}

export function setBarcodeCache(value: boolean) {
	cache = { value, expiresAt: Date.now() + TTL_MS };
}

export function invalidateBarcodeCache() {
	cache = null;
}
