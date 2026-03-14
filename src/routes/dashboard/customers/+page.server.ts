import { db } from '$lib/server/db';
import { customers, salesOrders } from '$lib/server/db/schema/sales';
import { isNull, eq, and, desc, ilike, or, notInArray } from 'drizzle-orm';
import { fail, error } from '@sveltejs/kit';
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
	create: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const parsed = customerSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0].message });
		}

		try {
			// Use .returning() to get the new customer's id
			const [newCustomer] = await db.insert(customers).values(parsed.data).returning({ id: customers.id });

			// If a phone was provided, find unlinked walk-in orders with the same phone
			let walkInOrderIds: string[] = [];
			if (parsed.data.phone) {
				try {
					// Normalize phone before comparison (strip spaces, dashes, parens; keep +)
					const normalizedPhone = parsed.data.phone.replace(/[\s\-().]/g, '');
					const unlinked = await db
						.select({ id: salesOrders.id })
						.from(salesOrders)
						.where(
							and(
								isNull(salesOrders.customerId),
								eq(salesOrders.walkInPhone, normalizedPhone),
								notInArray(salesOrders.status, ['CANCELLED'])
							)
						);
					walkInOrderIds = unlinked.map(r => r.id);
				} catch {
					// Non-blocking — customer created successfully even if this query fails
					walkInOrderIds = [];
				}
			}

			return { success: true, customerId: newCustomer.id, walkInOrderIds };
		} catch (e: any) {
			if (e.code === '23505') {
				return fail(400, { error: 'A customer with this TIN already exists' });
			}
			return fail(500, { error: 'Database error' });
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
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

	delete: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
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
