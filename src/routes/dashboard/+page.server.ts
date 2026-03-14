import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { inventory, inventoryTransactions, products, warehouses, salesOrders } from '$lib/server/db/schema';
import { sql, desc, inArray } from 'drizzle-orm';

export const load = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const isFinancialRole = ['admin', 'sales'].includes(locals.user.role);

	// Total product count
	const [productCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(products);

	// Total warehouse count
	const [warehouseCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(warehouses);

    // Active orders: PENDING or PROCESSING — intentionally shown to all roles (including warehouse)
    // so staff can see how many pick-lists are queued without accessing revenue figures.
    const [activeOrdersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(salesOrders)
        .where(inArray(salesOrders.status, ['PENDING', 'PROCESSING']));

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

	// Financial queries only run for admin/sales roles — skip for warehouse users
	let totalSales = 0;
	let totalProfit = 0;
	let salesTrend: { date: string; revenue: number }[] = [];
	let marginsByCategory: { categoryName: string; marginPercent: number }[] = [];

	if (isFinancialRole) {
		// KPIs: Total Sales & Total Profit
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
		totalSales = Number(kpiRows[0]?.total_sales || 0);
		totalProfit = Number(kpiRows[0]?.total_profit || 0);

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
		salesTrend = trendRows.map((r: any) => ({
			date: r.date as string,
			revenue: Number(r.revenue)
		}));

		// Profit margins by category
		const { rows: marginRows } = await db.execute(sql`
			SELECT
				c.name as category_name,
				ROUND(
					(SUM(soi.line_total - (p.average_landing_cost * soi.quantity)) /
					 NULLIF(SUM(soi.line_total), 0)) * 100,
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
		marginsByCategory = marginRows.map((r: any) => ({
			categoryName: r.category_name as string,
			marginPercent: Number(r.margin_percent)
		}));
	}

	return {
		user: locals.user,
		productCount: Number(productCountResult.count),
		warehouseCount: Number(warehouseCountResult.count),
		activeOrderCount: Number(activeOrdersResult.count),
		lowStockCount: lowStockItems.length,
		lowStockItems,
		recentTransactions,
		totalSales:        isFinancialRole ? totalSales : null,
		totalProfit:       isFinancialRole ? totalProfit : null,
		salesTrend,
		marginsByCategory
	};
};
