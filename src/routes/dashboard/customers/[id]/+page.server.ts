import { db } from '$lib/server/db';
import { customers, salesOrders } from '$lib/server/db/schema/sales';
import { eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = params.id;
	
	const customer = await db.query.customers.findFirst({
		where: eq(customers.id, id)
	});

	if (!customer) {
		throw error(404, 'Customer not found');
	}

	const orders = await db.query.salesOrders.findMany({
		where: eq(salesOrders.customerId, id),
		orderBy: [desc(salesOrders.createdAt)]
	});

	return {
		customer,
		orders
	};
}
