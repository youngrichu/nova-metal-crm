import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { inventory, inventoryTransactions, products, warehouses, salesOrders } from '$lib/server/db/schema';
import { sql, desc, inArray } from 'drizzle-orm';

type DateRange = 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'last-quarter' | 'current-quarter' | 'this-year';
type Period = 'day' | 'week' | 'month';

const VALID_RANGES: DateRange[] = ['last-7-days', 'last-30-days', 'this-month', 'last-month', 'last-quarter', 'current-quarter', 'this-year'];
const VALID_PERIODS: Period[] = ['day', 'week', 'month'];

/**
 * Returns SQL timestamp boundary expressions for the selected date range.
 *
 * @param range - Named date range to convert into SQL boundary expressions
 * @returns `start` (inclusive lower bound) and `end` (exclusive upper bound) as raw SQL strings
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
 * Returns SQL fragments for grouping and formatting timestamps by the requested period.
 *
 * @param period - Aggregation granularity: 'day', 'week', or 'month'
 * @returns `trunc` (GROUP BY expression) and `format` (TO_CHAR format string)
 */
function getTrendGrouping(period: Period): { trunc: string; format: string } {
	switch (period) {
		case 'day':   return { trunc: `DATE(created_at)`,                    format: `'YYYY-MM-DD'` };
		case 'week':  return { trunc: `DATE_TRUNC('week', created_at)`,      format: `'YYYY-MM-DD'` };
		case 'month': return { trunc: `DATE_TRUNC('month', created_at)`,     format: `'YYYY-MM'` };
	}
}

/**
 * SvelteKit server load function for the dashboard page.
 *
 * Reads optional `range` (DateRange) and `period` (Period) query-string parameters
 * to scope financial KPIs, sales trend, and margin data to the selected window.
 * Non-financial fields (product/warehouse counts, active orders, low-stock items,
 * recent transactions) are returned for all authenticated roles.
 * Financial fields (`totalSales`, `totalProfit`, `salesTrend`, `marginsByCategory`)
 * are returned only for `admin` and `sales` roles; they are `null`/empty for `warehouse`.
 *
 * @param locals - SvelteKit request locals (must contain `user`)
 * @param url    - Request URL used to read `range` and `period` params
 * @returns Dashboard data object
 * @throws Redirect to `/login` if `locals.user` is not set
 */
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

	// Active orders: QUOTE and CONFIRMED — intentionally shown to all roles (including warehouse)
	// so staff can see how many orders are in-flight without accessing revenue figures.
	const [activeOrdersResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(salesOrders)
		.where(inArray(salesOrders.status, ['QUOTE', 'CONFIRMED']));

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
		const { rows: kpiRows } = await db.execute(sql`
			SELECT
				COALESCE(SUM(so.total_amount), 0) as total_sales,
				COALESCE(SUM(
					soi.line_total - (p.average_landing_cost * soi.quantity)
				), 0) as total_profit
			FROM sales_orders so
			JOIN sales_order_items soi ON so.id = soi.order_id
			JOIN products p ON soi.product_id = p.id
			WHERE so.status = 'INVOICED'
			  AND so.created_at >= ${sql.raw(start)}
			  AND so.created_at < ${sql.raw(end)}
		`);
		totalSales  = Number(kpiRows[0]?.total_sales  || 0);
		totalProfit = Number(kpiRows[0]?.total_profit || 0);

		const { trunc, format } = getTrendGrouping(period);
		const { rows: trendRows } = await db.execute(sql`
			SELECT
				TO_CHAR(${sql.raw(trunc)}, ${sql.raw(format)}) as date,
				SUM(total_amount)::float as revenue
			FROM sales_orders
			WHERE status = 'INVOICED'
			  AND created_at >= ${sql.raw(start)}
			  AND created_at < ${sql.raw(end)}
			GROUP BY ${sql.raw(trunc)}
			ORDER BY ${sql.raw(trunc)} ASC
		`);
		salesTrend = trendRows.map((r: any) => ({
			date:    r.date as string,
			revenue: Number(r.revenue)
		}));

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
			WHERE so.status = 'INVOICED'
			  AND so.created_at >= ${sql.raw(start)}
			  AND so.created_at < ${sql.raw(end)}
			GROUP BY c.id, c.name
			ORDER BY margin_percent DESC
		`);
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
