import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load = async () => {
	const allCategories = await db.select().from(categories).orderBy(categories.name);
	return { categories: allCategories };
};

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const description = data.get('description')?.toString();
		const prefix = data.get('prefix')?.toString().toUpperCase();

		if (!name || !prefix) {
			return fail(400, { missing: true });
		}

		try {
			await db.insert(categories).values({
				name,
				description,
				prefix
			});
			return { success: true };
		} catch (e: any) {
			if (e.code === '23505') { // Unique constraint violation
				return fail(400, { duplicate: true, prefix });
			}
			return fail(500, { error: 'Unknown server error' });
		}
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) return fail(400, { missing: true });

		try {
			await db.delete(categories).where(eq(categories.id, id));
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: 'Could not delete category. Ensure no products depend on it.' });
		}
	}
};
