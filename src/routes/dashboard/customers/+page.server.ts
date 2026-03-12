import { db } from '$lib/server/db';
import { customers } from '$lib/server/db/schema/sales';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { customerSchema } from '$lib/server/schemas/customer';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('q') || '';
	
	const allCustomers = await db.query.customers.findMany({
		where: search ? or(ilike(customers.name, `%${search}%`), ilike(customers.phone, `%${search}%`), ilike(customers.tinNumber, `%${search}%`)) : undefined,
		orderBy: [desc(customers.createdAt)]
	});

	return {
		customers: allCustomers
	};
}

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);
		
		const parsed = customerSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0].message });
		}

		try {
			await db.insert(customers).values(parsed.data);
			return { success: true };
		} catch (e: any) {
			if (e.code === '23505') { // unique violation
				return fail(400, { error: 'A customer with this TIN already exists' });
			}
			return fail(500, { error: 'Database error' });
		}
	},

	update: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const data = Object.fromEntries(formData);
		
		const parsed = customerSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0].message });
		}
		if (!id) return fail(400, { error: 'ID is required' });

		try {
			await db.update(customers).set({
				...parsed.data,
				updatedAt: new Date()
			}).where(eq(customers.id, id));
			
			return { success: true };
		} catch (e: any) {
			if (e.code === '23505') {
				return fail(400, { error: 'A customer with this TIN already exists' });
			}
			return fail(500, { error: 'Database error' });
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { error: 'ID is required' });

		try {
			await db.delete(customers).where(eq(customers.id, id));
			return { success: true };
		} catch (e) {
			return fail(500, { error: 'Failed to delete customer' });
		}
	}
};
