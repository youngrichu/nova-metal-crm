import { db } from '$lib/server/db';
import { payments, dailyReconciliations, salesOrders, salesOrderItems, products } from '$lib/server/db/schema';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { sql, gte, lt, and, eq, desc, notInArray } from 'drizzle-orm';
import { user as usersTable } from '$lib/server/db/schema/users';

export const load = async ({ locals }: { locals: App.Locals }) => {
    if (!locals.user) throw redirect(302, '/login');
    // Calculate expected cash for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Fix 3: use startOfNextDay instead of endOfDay with 23:59:59.999
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);

    // Get today's payments (assuming all cash for now, or you could filter by paymentMethod = 'CASH')
    const [result] = await db
        .select({
            totalCollected: sql<number>`SUM(CAST(${payments.amount} AS DECIMAL))`
        })
        .from(payments)
        .where(
            and(
                gte(payments.paymentDate, startOfDay),
                lt(payments.paymentDate, startOfNextDay)
            )
        );

    const expectedCash = Number(result?.totalCollected || 0);

    // Get all past reconciliations using standard joins
    const historyData = await db
        .select({
            id: dailyReconciliations.id,
            date: dailyReconciliations.date,
            expectedCash: dailyReconciliations.expectedCash,
            actualCash: dailyReconciliations.actualCash,
            discrepancy: dailyReconciliations.discrepancy,
            totalProfit: dailyReconciliations.totalProfit,
            notes: dailyReconciliations.notes,
            userName: usersTable.name
        })
        .from(dailyReconciliations)
        .leftJoin(usersTable, eq(dailyReconciliations.closedBy, usersTable.id))
        .orderBy(desc(dailyReconciliations.date))
        .limit(10);

    const history = historyData.map(recon => ({
        ...recon,
        user: { name: recon.userName }
    }));

    return {
        expectedCash,
        history
    };
};

export const actions: Actions = {
    reconcile: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401, { error: 'Unauthorized' });

        const allowedRoles = ['admin', 'sales'];
        if (!allowedRoles.includes(user.role)) {
            return fail(403, { error: 'Access denied' });
        }

        const formData = await request.formData();
        const actualCash = Number(formData.get('actualCash'));
        const notes = formData.get('notes')?.toString() || '';

        if (isNaN(actualCash)) {
            return fail(400, { error: 'Invalid actual cash amount' });
        }

        // Fix 3: use startOfNextDay instead of endOfDay with 23:59:59.999
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfNextDay = new Date(startOfToday);
        startOfNextDay.setDate(startOfNextDay.getDate() + 1);

        try {
            // Fix 4: Recalculate expectedCash server-side instead of trusting form data
            const [cashResult] = await db
                .select({
                    totalCollected: sql<number>`SUM(CAST(${payments.amount} AS DECIMAL))`
                })
                .from(payments)
                .where(
                    and(
                        gte(payments.paymentDate, startOfToday),
                        lt(payments.paymentDate, startOfNextDay)
                    )
                );

            const expectedCash = Number(cashResult?.totalCollected || 0);
            const discrepancy = actualCash - expectedCash;

            // Fix 1: profit query is now inside the try/catch block
            // Fix 3: uses startOfNextDay boundary
            const [profitResult] = await db
                .select({
                    totalProfit: sql<string>`COALESCE(SUM(${salesOrderItems.lineTotal} - (${products.averageLandingCost} * ${salesOrderItems.quantity})), 0)`
                })
                .from(salesOrders)
                .innerJoin(salesOrderItems, eq(salesOrderItems.orderId, salesOrders.id))
                .innerJoin(products, eq(products.id, salesOrderItems.productId))
                .where(
                    and(
                        notInArray(salesOrders.status, ['CANCELLED', 'DRAFT']),
                        gte(salesOrders.createdAt, startOfToday),
                        lt(salesOrders.createdAt, startOfNextDay)
                    )
                );

            const totalProfit = profitResult?.totalProfit ?? '0';

            // Fix 2: Populate totalSales — sum of totalAmount for non-CANCELLED/DRAFT orders today
            const [salesResult] = await db
                .select({
                    totalSales: sql<string>`COALESCE(SUM(CAST(${salesOrders.totalAmount} AS DECIMAL)), 0)`
                })
                .from(salesOrders)
                .where(
                    and(
                        notInArray(salesOrders.status, ['CANCELLED', 'DRAFT']),
                        gte(salesOrders.createdAt, startOfToday),
                        lt(salesOrders.createdAt, startOfNextDay)
                    )
                );

            const totalSales = salesResult?.totalSales ?? '0';

            await db.insert(dailyReconciliations).values({
                date: new Date(),
                expectedCash: expectedCash.toString(),
                actualCash: actualCash.toString(),
                discrepancy: discrepancy.toString(),
                totalProfit,
                totalSales,
                notes,
                closedBy: user.id
            });

            return { success: true };
        } catch (error) {
            console.error('Reconciliation error:', error);
            return fail(500, { error: 'Failed to save reconciliation record' });
        }
    }
};
