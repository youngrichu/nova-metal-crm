import { db } from '$lib/server/db';
import { inventory, inventoryTransactions, products, warehouses } from '$lib/server/db/schema';
import { applyPurchaseCost } from '$lib/server/inventory/applyPurchaseCost';
import { recordTransaction } from '$lib/server/inventory/recordTransaction';
import { fail } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';

export const load = async () => {
	// Load all active inventory grouped by warehouse and product
	const stockLevels = await db
		.select({
			stock: inventory,
			product: products,
			warehouse: warehouses
		})
		.from(inventory)
		.innerJoin(products, eq(inventory.productId, products.id))
		.innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id));

	// Load data for the transaction dropdowns
	const allProducts = await db.select().from(products).orderBy(products.sku);
	const allWarehouses = await db.select().from(warehouses).orderBy(warehouses.name);

	// Recent transaction audit trail
	const recentTransactions = await db
		.select({
			tx: inventoryTransactions,
			productName: products.name,
			productSku: products.sku,
			warehouseName: warehouses.name
		})
		.from(inventoryTransactions)
		.innerJoin(inventory, eq(inventoryTransactions.inventoryId, inventory.id))
		.innerJoin(products, eq(inventory.productId, products.id))
		.innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
		.orderBy(desc(inventoryTransactions.createdAt))
		.limit(50);

	return {
		stockLevels,
		products: allProducts,
		warehouses: allWarehouses,
		recentTransactions
	};
};

export const actions = {
	transact: async ({ request, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const type = data.get('type')?.toString(); // STOCK_IN, STOCK_OUT, ADJUSTMENT
		const productId = data.get('productId')?.toString();
		const warehouseId = data.get('warehouseId')?.toString();
		const quantityStr = data.get('quantity')?.toString();
		const referenceDoc = data.get('referenceDoc')?.toString() || null;
		const notes = data.get('notes')?.toString() || null;
		const submittedUnitCost = data.get('unitCost')?.toString().trim() || null;
		if (type !== 'STOCK_IN' && submittedUnitCost) {
			return fail(400, { error: 'Purchase cost is only allowed for STOCK_IN' });
		}
		const unitCostStr = type === 'STOCK_IN' ? submittedUnitCost : null;

		if (!type || !['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'].includes(type)) {
			return fail(400, { error: 'Invalid transaction type' });
		}

		if (!productId || !warehouseId || !quantityStr) {
			return fail(400, { missing: true });
		}

		let quantityChange = parseInt(quantityStr, 10);
		if (isNaN(quantityChange) || quantityChange === 0) {
			return fail(400, { error: 'Invalid quantity' });
		}

		if (type === 'STOCK_OUT' && quantityChange > 0) {
			quantityChange = -quantityChange; // Enforce negative change for dispatch
		} else if (type === 'STOCK_IN' && quantityChange < 0) {
			quantityChange = Math.abs(quantityChange);
		}

		if (type === 'STOCK_IN' && unitCostStr) {
			if (!/^\d{1,12}(\.\d{1,2})?$/.test(unitCostStr)) {
				return fail(400, { error: 'Invalid purchase cost' });
			}
			const cost = Number(unitCostStr);
			if (!Number.isFinite(cost) || cost < 0.01) {
				return fail(400, { error: 'Invalid purchase cost' });
			}
		}

		try {
			await db.transaction(async (tx) => {
				await recordTransaction(tx, {
					productId,
					warehouseId,
					quantityChange,
					transactionType: type as 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT',
					referenceDoc: referenceDoc ?? undefined,
					notes: notes ?? undefined,
					performedBy: sessionUser.id,
					unitCost: unitCostStr ?? undefined,
				});

				// Apply new purchase cost inside the same transaction for atomicity
				if (type === 'STOCK_IN' && unitCostStr) {
					await applyPurchaseCost(productId, unitCostStr, tx);
				}
			});

			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Transaction failed' });
		}
	}
};
