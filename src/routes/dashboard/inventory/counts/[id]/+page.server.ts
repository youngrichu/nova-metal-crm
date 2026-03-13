import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { inventoryCounts, inventoryCountItems, products, warehouses } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const allowedRoles = ['admin', 'warehouse'];
	if (!locals.user || !allowedRoles.includes(locals.user.role)) {
		throw redirect(302, '/dashboard');
	}
	const { id } = params;

	try {
		const [countSession] = await db
			.select({
				count: inventoryCounts,
				warehouse: warehouses
			})
			.from(inventoryCounts)
			.innerJoin(warehouses, eq(inventoryCounts.warehouseId, warehouses.id))
			.where(eq(inventoryCounts.id, id))
			.limit(1);

		if (!countSession) throw error(404, 'Count session not found');

		const items = await db
			.select({
				item: inventoryCountItems,
				product: products
			})
			.from(inventoryCountItems)
			.innerJoin(products, eq(inventoryCountItems.productId, products.id))
			.where(eq(inventoryCountItems.countId, id))
			.orderBy(products.sku);

		return {
			count: countSession.count,
			warehouse: countSession.warehouse,
			items
		};
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error('Failed to load count session:', err);
		throw error(500, 'Failed to load count session');
	}
};

export const actions: Actions = {
	saveItem: async ({ request, locals, params }) => {
		const sessionUser = locals.user;
		if (!sessionUser) return fail(401, { error: 'Unauthorized' });

		const allowedRoles = ['admin', 'warehouse'];
		if (!allowedRoles.includes(sessionUser.role)) {
			return fail(403, { error: 'Access denied' });
		}

		const { id: countId } = params;
		const data = await request.formData();
		const itemId = data.get('itemId')?.toString();
		const physicalQtyStr = data.get('physicalQuantity')?.toString();
		const notes = data.get('notes')?.toString() || null;

		if (!itemId || physicalQtyStr === undefined || physicalQtyStr === '') {
			return fail(400, { error: 'Item ID and physical quantity are required' });
		}

		const physicalQuantity = parseInt(physicalQtyStr, 10);
		if (isNaN(physicalQuantity) || physicalQuantity < 0) {
			return fail(400, { error: 'Physical quantity must be a non-negative integer' });
		}

		try {
			// Verify the count session is still open
			const [countSession] = await db
				.select({ status: inventoryCounts.status })
				.from(inventoryCounts)
				.where(eq(inventoryCounts.id, countId))
				.limit(1);

			if (!countSession) return fail(404, { error: 'Count session not found' });
			if (countSession.status === 'CLOSED') return fail(400, { error: 'This count session is already closed and cannot be modified' });

			// Verify item belongs to this count session
			const [item] = await db
				.select()
				.from(inventoryCountItems)
				.where(and(eq(inventoryCountItems.id, itemId), eq(inventoryCountItems.countId, countId)))
				.limit(1);

			if (!item) return fail(404, { error: 'Count item not found' });

			await db
				.update(inventoryCountItems)
				.set({ physicalQuantity, notes })
				.where(eq(inventoryCountItems.id, itemId));

			return { success: true, itemId };
		} catch (err) {
			console.error('Failed to save count item:', err);
			return fail(500, { error: 'Failed to save item' });
		}
	}
};
