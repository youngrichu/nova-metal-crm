import { db } from '$lib/server/db';
import { warehouses } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load = async () => {
	const allWarehouses = await db.select().from(warehouses).orderBy(warehouses.name);
	return { warehouses: allWarehouses };
};

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const location = data.get('location')?.toString();

		if (!name) {
			return fail(400, { missing: true });
		}

		try {
			await db.insert(warehouses).values({
				name,
				location
			});
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: 'Unknown server error' });
		}
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) return fail(400, { missing: true });

		try {
			await db.delete(warehouses).where(eq(warehouses.id, id));
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: 'Could not delete warehouse. Ensure no inventory is linked to it.' });
		}
	},
	update: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString();
		const location = data.get('location')?.toString() || null;

		if (!id || !name) return fail(400, { missing: true });

		try {
			await db.update(warehouses)
				.set({ name, location })
				.where(eq(warehouses.id, id));
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: 'Could not update warehouse.' });
		}
	}
};
