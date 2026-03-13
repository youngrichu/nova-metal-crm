import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	inventory,
	inventoryCounts,
	inventoryCountItems,
	inventoryTransactions,
	products,
	warehouses
} from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
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

		// Compute deltas
		const itemsWithDelta = items.map((row) => ({
			...row,
			delta:
				row.item.physicalQuantity !== null
					? row.item.physicalQuantity - row.item.expectedQuantity
					: null
		}));

		const totalDiscrepancies = itemsWithDelta.filter((r) => r.delta !== null && r.delta !== 0).length;
		const surplusItems = itemsWithDelta.filter((r) => r.delta !== null && r.delta > 0).length;
		const shortageItems = itemsWithDelta.filter((r) => r.delta !== null && r.delta < 0).length;

		return {
			count: countSession.count,
			warehouse: countSession.warehouse,
			items: itemsWithDelta,
			totalDiscrepancies,
			surplusItems,
			shortageItems
		};
	} catch (err: any) {
		if (err?.status === 404) throw err;
		console.error('Failed to load reconciliation data:', err);
		throw error(500, 'Failed to load reconciliation data');
	}
};

export const actions: Actions = {
	closeCount: async ({ request, locals, params }) => {
		const sessionUser = locals.user;
		if (!sessionUser) return fail(401, { error: 'Unauthorized' });

		const allowedRoles = ['admin', 'warehouse'];
		if (!allowedRoles.includes(sessionUser.role)) {
			return fail(403, { error: 'Access denied' });
		}

		const { id: countId } = params;

		try {
			// Verify the count exists and is IN_PROGRESS
			const [countSession] = await db
				.select()
				.from(inventoryCounts)
				.where(eq(inventoryCounts.id, countId))
				.limit(1);

			if (!countSession) return fail(404, { error: 'Count session not found' });
			if (countSession.status === 'CLOSED') return fail(400, { error: 'Count is already closed' });

			// Fetch all items with physical quantities
			const items = await db
				.select({
					item: inventoryCountItems
				})
				.from(inventoryCountItems)
				.where(eq(inventoryCountItems.countId, countId));

			const uncountedItems = items.filter(item => item.item.physicalQuantity === null);
			if (uncountedItems.length > 0) {
				return fail(400, {
					error: `${uncountedItems.length} item(s) have not been counted yet. Please complete all entries before closing.`
				});
			}

			await db.transaction(async (tx) => {
				for (const { item } of items) {
					if (item.physicalQuantity === null) continue;

					const delta = item.physicalQuantity - item.expectedQuantity;
					if (delta === 0) continue;

					// Find the inventory record for this product in this warehouse
					const [invRecord] = await tx
						.select()
						.from(inventory)
						.where(
							and(
								eq(inventory.productId, item.productId),
								eq(inventory.warehouseId, countSession.warehouseId)
							)
						)
						.limit(1);

					if (!invRecord) continue;

					// Update inventory to physical quantity
					await tx
						.update(inventory)
						.set({
							quantity: item.physicalQuantity,
							lastUpdated: sql`now()`
						})
						.where(eq(inventory.id, invRecord.id));

					// Create ADJUSTMENT transaction
					await tx.insert(inventoryTransactions).values({
						inventoryId: invRecord.id,
						transactionType: 'ADJUSTMENT',
						quantityChange: delta,
						unitCost: null,
						referenceDoc: 'STOCK_TAKE',
						performedBy: sessionUser.id,
						notes: `Stock-take count ID: ${countId}`
					});
				}

				// Close the count session
				await tx
					.update(inventoryCounts)
					.set({
						status: 'CLOSED',
						completedAt: sql`now()`
					})
					.where(eq(inventoryCounts.id, countId));
			});

			redirect(303, '/dashboard/inventory/counts');
		} catch (err: any) {
			if (err?.status === 303) throw err;
			console.error('Failed to close count:', err);
			return fail(500, { error: 'Failed to close count and apply adjustments' });
		}
	}
};
