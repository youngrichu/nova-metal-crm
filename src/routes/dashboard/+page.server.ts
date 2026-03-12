import { db } from '$lib/server/db';
import { inventory, inventoryTransactions, products, warehouses } from '$lib/server/db/schema';
import { sql, lte, desc } from 'drizzle-orm';

export const load = async ({ locals }) => {
	// Total product count
	const [productCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(products);

	// Total warehouse count
	const [warehouseCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(warehouses);

	// Low stock items: inventory rows where quantity <= product.minStockLevel
	const lowStockItems = await db
		.select({
			productName: products.name,
			sku: products.sku,
			quantity: inventory.quantity,
			minStockLevel: products.minStockLevel
		})
		.from(inventory)
		.innerJoin(products, sql`${inventory.productId} = ${products.id}`)
		.where(sql`${inventory.quantity} <= ${products.minStockLevel}`);

	// Recent 5 inventory transactions for activity feed
	const recentTransactions = await db
		.select({
			id: inventoryTransactions.id,
			transactionType: inventoryTransactions.transactionType,
			quantityChange: inventoryTransactions.quantityChange,
			referenceDoc: inventoryTransactions.referenceDoc,
			notes: inventoryTransactions.notes,
			createdAt: inventoryTransactions.createdAt,
			productName: products.name,
			productSku: products.sku,
			warehouseName: warehouses.name
		})
		.from(inventoryTransactions)
		.innerJoin(inventory, sql`${inventoryTransactions.inventoryId} = ${inventory.id}`)
		.innerJoin(products, sql`${inventory.productId} = ${products.id}`)
		.innerJoin(warehouses, sql`${inventory.warehouseId} = ${warehouses.id}`)
		.orderBy(desc(inventoryTransactions.createdAt))
		.limit(5);

	return {
		user: locals.user,
		productCount: Number(productCountResult.count),
		warehouseCount: Number(warehouseCountResult.count),
		lowStockCount: lowStockItems.length,
		lowStockItems,
		recentTransactions
	};
};
