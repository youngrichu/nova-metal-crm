import { db } from '$lib/server/db';
import { inventory, inventoryTransactions, products, warehouses } from '$lib/server/db/schema';
import { salesOrders, salesOrderItems } from '$lib/server/db/schema/sales';
import { categories } from '$lib/server/db/schema/catalog';
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

    // KPIs: Total Sales & Total Profit (Phase 3)
    const { rows: kpiRows } = await db.execute(sql`
        SELECT 
            COALESCE(SUM(so.total_amount), 0) as total_sales,
            COALESCE(SUM(
                soi.line_total - (p.average_landing_cost * soi.quantity)
            ), 0) as total_profit
        FROM sales_orders so
        JOIN sales_order_items soi ON so.id = soi.order_id
        JOIN products p ON soi.product_id = p.id
        WHERE so.status != 'CANCELLED' AND so.status != 'DRAFT'
    `);

    const totalSales = Number(kpiRows[0]?.total_sales || 0);
    const totalProfit = Number(kpiRows[0]?.total_profit || 0);

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

    // Sales trend: daily revenue for last 30 days
    const { rows: trendRows } = await db.execute(sql`
        SELECT
            TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date,
            SUM(total_amount)::float as revenue
        FROM sales_orders
        WHERE status NOT IN ('CANCELLED', 'DRAFT')
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `);

    const salesTrend = trendRows.map((r: any) => ({
        date: r.date as string,
        revenue: Number(r.revenue)
    }));

    // Profit margins by category
    const { rows: marginRows } = await db.execute(sql`
        SELECT
            c.name as category_name,
            ROUND(
                SUM(soi.line_total - (p.average_landing_cost * soi.quantity)) /
                NULLIF(SUM(soi.line_total), 0) * 100,
                1
            )::float as margin_percent
        FROM sales_order_items soi
        JOIN products p ON soi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN sales_orders so ON soi.order_id = so.id
        WHERE so.status NOT IN ('CANCELLED', 'DRAFT')
        GROUP BY c.id, c.name
        ORDER BY margin_percent DESC
    `);

    const marginsByCategory = marginRows.map((r: any) => ({
        categoryName: r.category_name as string,
        marginPercent: Number(r.margin_percent)
    }));

	return {
		user: locals.user,
		productCount: Number(productCountResult.count),
		warehouseCount: Number(warehouseCountResult.count),
		lowStockCount: lowStockItems.length,
		lowStockItems,
		recentTransactions,
        totalSales,
        totalProfit,
        salesTrend,
        marginsByCategory
	};
};
