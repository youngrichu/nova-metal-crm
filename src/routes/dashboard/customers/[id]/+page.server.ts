import { db } from '$lib/server/db';
import { customers, salesOrders } from '$lib/server/db/schema/sales';
import { eq, desc, isNull, and, inArray } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
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

	// Only run the walk-in query when explicitly requested (after customer creation with matching phone)
	let pendingWalkInOrders: { id: string; orderNumber: string; createdAt: Date }[] = [];
	if (url.searchParams.has('linkOrders') && customer.phone) {
		try {
			pendingWalkInOrders = await db
				.select({
					id: salesOrders.id,
					orderNumber: salesOrders.orderNumber,
					createdAt: salesOrders.createdAt
				})
				.from(salesOrders)
				.where(
					and(
						isNull(salesOrders.customerId),
						eq(salesOrders.walkInPhone, customer.phone)
					)
				)
				.orderBy(desc(salesOrders.createdAt));
		} catch {
			// Non-blocking
			pendingWalkInOrders = [];
		}
	}

	return {
		customer,
		orders,
		pendingWalkInOrders
	};
};

export const actions: Actions = {
	linkOrders: async ({ params, request }) => {
		const customerId = params.id;

		const customer = await db.query.customers.findFirst({
			where: eq(customers.id, customerId)
		});

		if (!customer) {
			return { error: 'Customer not found' };
		}

		if (!customer.phone) {
			return { error: 'Customer has no phone number — cannot link walk-in orders' };
		}

		try {
			const formData = await request.formData();
			const orderIdsJson = formData.get('orderIds')?.toString();
			if (!orderIdsJson) return { error: 'No orders to link' };

			const parsed = JSON.parse(orderIdsJson);
			if (!Array.isArray(parsed) || !parsed.every((id: unknown) => typeof id === 'string')) {
				return { error: 'Invalid order IDs' };
			}
			const orderIds: string[] = parsed;
			if (!orderIds.length) return { error: 'No orders to link' };

			// WHERE guards:
			// - inArray(id, orderIds): only the submitted IDs
			// - isNull(customerId): race-condition guard (order not already linked)
			// - eq(walkInPhone, customer.phone): prevent cross-customer linking if orderIds were tampered
			// walkInPhone and walkInPricingTier are intentionally cleared on link:
			// - walkInPhone is now redundant (the customer record holds the phone)
			// - walkInPricingTier was the anonymous pricing tier; the actual prices are
			//   preserved in salesOrderItems.unitPrice and lineTotal, which are never changed
			await db
				.update(salesOrders)
				.set({
					customerId,
					walkInPhone: null,
					walkInPricingTier: null,
					updatedAt: new Date()
				})
				.where(
					and(
						inArray(salesOrders.id, orderIds),
						isNull(salesOrders.customerId),
						eq(salesOrders.walkInPhone, customer.phone)
					)
				);

			return { success: true };
		} catch (err) {
			console.error('Failed to link walk-in orders:', err);
			return { error: 'Failed to link orders. Please try again.' };
		}
	}
};
