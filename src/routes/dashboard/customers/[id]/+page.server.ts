import { db } from '$lib/server/db';
import { customers, salesOrders } from '$lib/server/db/schema/sales';
import { eq, desc, isNull, and, inArray, notInArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const normalizePhone = (p: string) => p.replace(/[\s\-().]/g, '');

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
			const normalizedPhone = normalizePhone(customer.phone);
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
						eq(salesOrders.walkInPhone, normalizedPhone),
						notInArray(salesOrders.status, ['CANCELLED'])
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
	linkOrders: async ({ params, request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');

		const customerId = params.id;

		const customer = await db.query.customers.findFirst({
			where: eq(customers.id, customerId)
		});

		if (!customer) {
			return fail(404, { error: 'Customer not found' });
		}

		if (!customer.phone) {
			return fail(400, { error: 'Customer has no phone number — cannot link walk-in orders' });
		}

		const normalizedCustomerPhone = normalizePhone(customer.phone);

		try {
			const formData = await request.formData();
			const orderIdsJson = formData.get('orderIds')?.toString();
			if (!orderIdsJson) return fail(400, { error: 'No orders to link' });

			const parsed = JSON.parse(orderIdsJson);
			if (!Array.isArray(parsed) || !parsed.every((id: unknown) => typeof id === 'string')) {
				return fail(400, { error: 'Invalid order IDs' });
			}
			const orderIds: string[] = parsed;
			if (!orderIds.length) return fail(400, { error: 'No orders to link' });

			// WHERE guards:
			// - inArray(id, orderIds): only the submitted IDs
			// - isNull(customerId): race-condition guard (order not already linked)
			// - eq(walkInPhone, customer.phone): prevent cross-customer linking if orderIds were tampered
			// - notInArray(status, ['CANCELLED']): server-side guard; load query excludes them but action must enforce independently
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
						eq(salesOrders.walkInPhone, normalizedCustomerPhone),
						notInArray(salesOrders.status, ['CANCELLED'])
					)
				);

			return { success: true };
		} catch (err) {
			console.error('Failed to link walk-in orders:', err);
			return fail(500, { error: 'Failed to link orders. Please try again.' });
		}
	}
};
