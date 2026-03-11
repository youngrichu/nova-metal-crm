import { db } from '$lib/server/db';
import { inventory, inventoryTransactions, products, warehouses } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq, sql, and } from 'drizzle-orm';

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

	return {
		stockLevels,
		products: allProducts,
		warehouses: allWarehouses
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

		if (!type || !productId || !warehouseId || !quantityStr) {
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

		try {
			await db.transaction(async (tx) => {
				// 1. Upsert or get existing inventory record
				let invRecord = await tx.query.inventory.findFirst({
					where: and(
						eq(inventory.productId, productId),
						eq(inventory.warehouseId, warehouseId)
					)
				});

				let currentInventoryId;
				
				if (!invRecord) {
					// Disallow stock-out from non-existent inventory
					if (quantityChange < 0) throw new Error('Cannot reduce stock below 0');
					
					const newInv = await tx.insert(inventory).values({
						productId,
						warehouseId,
						quantity: quantityChange
					}).returning();
					
					currentInventoryId = newInv[0].id;
				} else {
					const newQuantity = invRecord.quantity + quantityChange;
					
					// Optional: Disallow negative stock? (Depending on business rules, sometimes allowed temporarily)
					// Let's enforce >= 0 for strict tracking.
					if (newQuantity < 0) throw new Error(`Insufficient stock. Current: ${invRecord.quantity}`);

					await tx.update(inventory)
						.set({ 
							quantity: newQuantity,
							lastUpdated: sql`now()`
						})
						.where(eq(inventory.id, invRecord.id));
						
					currentInventoryId = invRecord.id;
				}

				// 2. Insert append-only transaction entry
				await tx.insert(inventoryTransactions).values({
					inventoryId: currentInventoryId,
					transactionType: type,
					quantityChange,
					referenceDoc,
					notes,
					performedBy: sessionUser.id
				});
			});

			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Transaction failed' });
		}
	}
};
