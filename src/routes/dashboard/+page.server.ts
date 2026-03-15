import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { inventory, inventoryTransactions, products, warehouses, salesOrders } from '$lib/server/db/schema';
import { sql, desc, inArray } from 'drizzle-orm';

type DateRange = 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'last-quarter' | 'current-quarter' | 'this-year';
type Period = 'day' | 'week' | 'month';

const VALID_RANGES: DateRange[] = ['last-7-days', 'last-30-days', 'this-month', 'last-month', 'last-quarter', 'current-quarter', 'this-year'];
const VALID_PERIODS: Period[] = ['day', 'week', 'month'];

/**
 * Produce SQL timestamp expressions for the selected date range boundaries.
 *
 * @param range - The named date range to convert into SQL boundary expressions
 * @returns An object with `start` and `end` properties containing SQL expressions to be used as the inclusive lower bound (`start`) and exclusive upper bound (`end`) for filtering timestamps
 */
function getRangeSQL(range: DateRange): { start: string; end: string } {
	switch (range) {
		case 'last-7-days':     return { start: `NOW() - INTERVAL '7 days'`,                             end: `NOW()` };
		case 'last-30-days':    return { start: `NOW() - INTERVAL '30 days'`,                            end: `NOW()` };
		case 'this-month':      return { start: `DATE_TRUNC('month', NOW())`,                            end: `NOW()` };
		case 'last-month':      return { start: `DATE_TRUNC('month', NOW() - INTERVAL '1 month')`,       end: `DATE_TRUNC('month', NOW())` };
		case 'last-quarter':    return { start: `DATE_TRUNC('quarter', NOW() - INTERVAL '3 months')`,    end: `DATE_TRUNC('quarter', NOW())` };
		case 'current-quarter': return { start: `DATE_TRUNC('quarter', NOW())`,                          end: `NOW()` };
		case 'this-year':       return { start: `DATE_TRUNC('year', NOW())`,                             end: `NOW()` };
	}
}

/**
 * Produces SQL fragments for grouping and formatting timestamps according to the requested period.
 *
 * @param period - The grouping period: 'day', 'week', or 'month'
 * @returns An object with `trunc`, an SQL expression to group timestamps, and `format`, the SQL date format string to display the group
 */
function getTrendGrouping(period: Period): { trunc: string; format: string } {
	switch (period) {
		case 'day':   return { trunc: `DATE(created_at)`,                    format: `'YYYY-MM-DD'` };
		case 'week':  return { trunc: `DATE_TRUNC('week', created_at)`,      format: `'YYYY-MM-DD'` };
		case 'month': return { trunc: `DATE_TRUNC('month', created_at)`,     format: `'YYYY-MM'` };
	}
}

export const load = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');

	const isFinancialRole = ['admin', 'sales'].includes(locals.user.role);

	const rawRange  = url.searchParams.get('range')  ?? 'this-month';
	const rawPeriod = url.searchParams.get('period') ?? 'day';
	const range:  DateRange = VALID_RANGES.includes(rawRange as DateRange)   ? (rawRange as DateRange)   : 'this-month';
	const period: Period    = VALID_PERIODS.includes(rawPeriod as Period)     ? (rawPeriod as Period)     : 'day';

	const { start, end } = getRangeSQL(range);

	// Total product count
	const [productCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(products);

	// Total warehouse count
	const [warehouseCountResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(warehouses);

	// Active orders
	const [activeOrdersResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(salesOrders)
		.where(inArray(salesOrders.status, ['PENDING', 'PROCESSING']));

	// Low stock items
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

	// Financial queries only for admin/sales
	let totalSales = 0;
	let totalProfit = 0;
	let salesTrend: { date: string; revenue: number }[] = [];
	let marginsByCategory: { categoryName: string; marginPercent: number }[] = [];

	if (isFinancialRole) {
		const { rows: kpiRows } = await db.execute(sql.raw(`
			SELECT
				COALESCE(SUM(so.total_amount), 0) as total_sales,
				COALESCE(SUM(
					soi.line_total - (p.average_landing_cost * soi.quantity)
				), 0) as total_profit
			FROM sales_orders so
			JOIN sales_order_items soi ON so.id = soi.order_id
			JOIN products p ON soi.product_id = p.id
			WHERE so.status NOT IN ('CANCELLED', 'DRAFT')
			  AND so.created_at >= ${start}
			  AND so.created_at < ${end}
		`));
		totalSales  = Number(kpiRows[0]?.total_sales  || 0);
		totalProfit = Number(kpiRows[0]?.total_profit || 0);

		const { trunc, format } = getTrendGrouping(period);
		const { rows: trendRows } = await db.execute(sql.raw(`
			SELECT
				TO_CHAR(${trunc}, ${format}) as date,
				SUM(total_amount)::float as revenue
			FROM sales_orders
			WHERE status NOT IN ('CANCELLED', 'DRAFT')
			  AND created_at >= ${start}
			  AND created_at < ${end}
			GROUP BY ${trunc}
			ORDER BY ${trunc} ASC
		`));
		salesTrend = trendRows.map((r: any) => ({
			date:    r.date as string,
			revenue: Number(r.revenue)
		}));

		const { rows: marginRows } = await db.execute(sql.raw(`
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
			  AND so.created_at >= ${start}
			  AND so.created_at < ${end}
			GROUP BY c.id, c.name
			ORDER BY margin_percent DESC
		`));
		marginsByCategory = marginRows.map((r: any) => ({
			categoryName:  r.category_name as string,
			marginPercent: Number(r.margin_percent)
		}));
	}

	return {
		user: locals.user,
		productCount:     Number(productCountResult.count),
		warehouseCount:   Number(warehouseCountResult.count),
		activeOrderCount: Number(activeOrdersResult.count),
		lowStockCount:    lowStockItems.length,
		lowStockItems,
		recentTransactions,
		totalSales:        isFinancialRole ? totalSales  : null,
		totalProfit:       isFinancialRole ? totalProfit : null,
		salesTrend,
		marginsByCategory,
		range,
		period
	};
};
