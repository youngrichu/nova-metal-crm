import { error, redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { inventory, inventoryCounts, inventoryCountItems, products, warehouses } from '$lib/server/db/schema';
import { user } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const counts = await db
			.select({
				count: inventoryCounts,
				warehouse: warehouses,
				performedByName: user.name
			})
			.from(inventoryCounts)
			.innerJoin(warehouses, eq(inventoryCounts.warehouseId, warehouses.id))
			.innerJoin(user, eq(inventoryCounts.performedBy, user.id))
			.orderBy(desc(inventoryCounts.startedAt));

		// For each count, get item progress (total items, items with physicalQuantity filled)
		const countIds = counts.map((c) => c.count.id);
		let itemStats: Record<string, { total: number; entered: number }> = {};
		if (countIds.length > 0) {
			const allItems = await db
				.select({
					countId: inventoryCountItems.countId,
					physicalQuantity: inventoryCountItems.physicalQuantity
				})
				.from(inventoryCountItems)
				.where(
					inArray(inventoryCountItems.countId, countIds)
				);
			for (const item of allItems) {
				if (!itemStats[item.countId]) itemStats[item.countId] = { total: 0, entered: 0 };
				itemStats[item.countId].total++;
				if (item.physicalQuantity !== null) itemStats[item.countId].entered++;
			}
		}

		const allWarehouses = await db.select().from(warehouses).orderBy(warehouses.name);

		return {
			counts: counts.map((c) => ({
				...c,
				itemStats: itemStats[c.count.id] ?? { total: 0, entered: 0 }
			})),
			warehouses: allWarehouses
		};
	} catch (err) {
		console.error('Failed to load inventory counts:', err);
		throw error(500, 'Failed to load inventory counts');
	}
};

export const actions: Actions = {
	startCount: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser) return fail(401, { error: 'Unauthorized' });

		const allowedRoles = ['admin', 'warehouse'];
		if (!allowedRoles.includes(sessionUser.role)) {
			return fail(403, { error: 'Access denied' });
		}

		const data = await request.formData();
		const warehouseId = data.get('warehouseId')?.toString();

		if (!warehouseId) return fail(400, { error: 'Warehouse is required' });

		const warehouseRecord = await db.query.warehouses.findFirst({ where: eq(warehouses.id, warehouseId) });
		if (!warehouseRecord) return fail(400, { error: 'Warehouse not found' });

		try {
			// Capture current inventory for this warehouse
			const currentInventory = await db
				.select({
					inv: inventory,
					product: products
				})
				.from(inventory)
				.innerJoin(products, eq(inventory.productId, products.id))
				.where(eq(inventory.warehouseId, warehouseId));

			let newCountId = '';

			await db.transaction(async (tx) => {
				// Insert count session
				const [newCount] = await tx
					.insert(inventoryCounts)
					.values({
						warehouseId,
						status: 'IN_PROGRESS',
						performedBy: sessionUser.id
					})
					.returning({ id: inventoryCounts.id });

				newCountId = newCount.id;

				// Insert count items for each inventory row in this warehouse
				if (currentInventory.length > 0) {
					await tx.insert(inventoryCountItems).values(
						currentInventory.map((row) => ({
							countId: newCountId,
							productId: row.inv.productId,
							expectedQuantity: row.inv.quantity,
							physicalQuantity: null as number | null,
							notes: null as string | null
						}))
					);
				}
			});

			redirect(303, `/dashboard/inventory/counts/${newCountId}`);
		} catch (err: any) {
			if (err?.status === 303) throw err;
			console.error('Failed to start count:', err);
			return fail(500, { error: 'Failed to start inventory count' });
		}
	}
};
