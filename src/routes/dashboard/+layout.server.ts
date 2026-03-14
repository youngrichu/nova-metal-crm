import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	try {
		const row = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.key, 'barcode_enabled'))
			.limit(1);
		const barcodeEnabled = row[0]?.value === 'true';
		return { barcodeEnabled };
	} catch {
		return { barcodeEnabled: false };
	}
};
