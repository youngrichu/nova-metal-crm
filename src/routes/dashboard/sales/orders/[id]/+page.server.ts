import { error, redirect, fail } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, salesOrderItems, customers, products, payments } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const orderId = params.id;

	try {
        // Fetch order with customer
		const [order] = await db
			.select({
				id: salesOrders.id,
				orderNumber: salesOrders.orderNumber,
                status: salesOrders.status,
                subtotal: salesOrders.subtotal,
                taxAmount: salesOrders.taxAmount,
                totalAmount: salesOrders.totalAmount,
                discountAmount: salesOrders.discountAmount,
                validUntil: salesOrders.validUntil,
                createdAt: salesOrders.createdAt,
				walkInPhone: salesOrders.walkInPhone,
                walkInPricingTier: salesOrders.walkInPricingTier,
                customer: {
                    id: customers.id,
                    name: customers.name,
                    companyName: customers.companyName,
                    phone: customers.phone,
                    email: customers.email,
                    tinNumber: customers.tinNumber,
                }
			})
			.from(salesOrders)
            .leftJoin(customers, eq(salesOrders.customerId, customers.id))
			.where(eq(salesOrders.id, orderId))
			.limit(1);

		if (!order) throw error(404, "Order not found");

        // Fetch items
        const items = await db
            .select({
                id: salesOrderItems.id,
                quantity: salesOrderItems.quantity,
                unitPrice: salesOrderItems.unitPrice,
                discountPercent: salesOrderItems.discountPercent,
                lineTotal: salesOrderItems.lineTotal,
                product: {
                    sku: products.sku,
                    name: products.name
                }
            })
            .from(salesOrderItems)
            .leftJoin(products, eq(salesOrderItems.productId, products.id))
            .where(eq(salesOrderItems.orderId, orderId));

        // Fetch payments
        const orderPayments = await db
            .select()
            .from(payments)
            .where(eq(payments.orderId, orderId));

		return {
			order: {
                ...order,
                customer: order.customer?.id ? order.customer : null
            },
            items,
            payments: orderPayments
		};
	} catch (err) {
		console.error("Failed to load order details:", err);
		throw error(500, "Failed to load order");
	}
};

export const actions: Actions = {
	updateStatus: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) throw error(401, "Unauthorized");

		const formData = await request.formData();
		const newStatus = formData.get("status")?.toString();

        if (!newStatus) return fail(400, { error: "Status is required" });

        try {
            await db.update(salesOrders)
                .set({ status: newStatus as any, updatedAt: new Date() })
                .where(eq(salesOrders.id, params.id));

            return { success: true };
        } catch (err) {
            console.error("Failed to update status:", err);
            return fail(500, { error: "Could not update status" });
        }
	}
};
