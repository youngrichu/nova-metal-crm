import { db } from '$lib/server/db';
import { payments, dailyReconciliations } from '$lib/server/db/schema';
import { fail, type Actions } from '@sveltejs/kit';
import { sql, gte, lt, and, eq, desc } from 'drizzle-orm';
import { user as usersTable } from '$lib/server/db/schema/users';

export const load = async () => {
    // Calculate expected cash for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's payments (assuming all cash for now, or you could filter by paymentMethod = 'CASH')
    const [result] = await db
        .select({
            totalCollected: sql<number>`SUM(CAST(${payments.amount} AS DECIMAL))`
        })
        .from(payments)
        .where(
            and(
                gte(payments.paymentDate, startOfDay),
                lt(payments.paymentDate, endOfDay)
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

        const formData = await request.formData();
        const actualCash = Number(formData.get('actualCash'));
        const expectedCash = Number(formData.get('expectedCash'));
        const notes = formData.get('notes')?.toString() || '';

        if (isNaN(actualCash)) {
            return fail(400, { error: 'Invalid actual cash amount' });
        }

        const discrepancy = actualCash - expectedCash;

        try {
            await db.insert(dailyReconciliations).values({
                date: new Date(),
                expectedCash: expectedCash.toString(),
                actualCash: actualCash.toString(),
                discrepancy: discrepancy.toString(),
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
