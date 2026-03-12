import { error, redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, payments, customers } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const orderId = params.id;

	try {
		const [order] = await db
			.select({
				id: salesOrders.id,
				orderNumber: salesOrders.orderNumber,
                status: salesOrders.status,
                totalAmount: salesOrders.totalAmount,
                createdAt: salesOrders.createdAt,
				customer: {
                    name: customers.name,
                }
			})
			.from(salesOrders)
            .leftJoin(customers, eq(salesOrders.customerId, customers.id))
			.where(eq(salesOrders.id, orderId))
			.limit(1);

		if (!order) throw error(404, "Order not found");

        if (order.status !== 'CONFIRMED' && order.status !== 'INVOICED') {
            throw error(400, "Payments can only be recorded for confirmed or invoiced orders");
        }

        const orderPayments = await db
            .select()
            .from(payments)
            .where(eq(payments.orderId, orderId))
            .orderBy(payments.createdAt);

		return {
			order,
            payments: orderPayments
		};
	} catch (err) {
		console.error("Failed to load payment details:", err);
		throw error(500, "Failed to load payment form");
	}
};

export const actions: Actions = {
	record: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, "Unauthorized");

		const formData = await request.formData();
		const amount = parseFloat(formData.get("amount")?.toString() || "0");
        const paymentMethod = formData.get("paymentMethod")?.toString();
        const referenceNumber = formData.get("referenceNumber")?.toString() || null;

        if (amount <= 0 || !paymentMethod) {
            return { error: "Amount and Payment Method are required" };
        }

        try {
            await db.insert(payments).values({
                orderId: params.id,
                amount: amount.toString(),
                paymentMethod,
                referenceNumber,
                recordedBy: user.id
            });

            return { success: true };
        } catch (err) {
            console.error("Failed to record payment:", err);
            return { error: "Could not record payment" };
        }
	}
};
