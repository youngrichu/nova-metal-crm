import { error, redirect, fail } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, salesOrderItems, customers, products, payments, inventory, warehouses } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { recordTransaction } from "$lib/server/inventory/recordTransaction";

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

        const VALID_STATUSES = ['DRAFT', 'QUOTE', 'CONFIRMED', 'INVOICED', 'CANCELLED'] as const;
        if (!newStatus || !VALID_STATUSES.includes(newStatus as any)) {
            return fail(400, { error: "Invalid or missing status" });
        }

        try {
            await db.transaction(async (tx) => {
                // 1. Fetch order for orderNumber (needed as referenceDoc), existence check,
                //    and terminal-state guard.
                const [currentOrder] = await tx
                    .select({ status: salesOrders.status, orderNumber: salesOrders.orderNumber })
                    .from(salesOrders)
                    .where(eq(salesOrders.id, params.id))
                    .limit(1);

                if (!currentOrder) throw Object.assign(new Error("Order not found"), { statusCode: 404 });

                // Enforce terminal states. INVOICED→INVOICED is a no-op (idempotent retry).
                if (currentOrder.status === 'INVOICED') {
                    if (newStatus === 'INVOICED') return; // Idempotent — already done
                    throw Object.assign(new Error('Cannot change status: order is already INVOICED'), { statusCode: 400 });
                }
                if (currentOrder.status === 'CANCELLED') {
                    throw Object.assign(new Error('Cannot change status: order is already CANCELLED'), { statusCode: 400 });
                }

                // 2. Compare-and-set update: WHERE status = currentOrder.status prevents a concurrent
                //    request from overwriting a status change that happened after our read.
                const updated = await tx.update(salesOrders)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(and(eq(salesOrders.id, params.id), eq(salesOrders.status, currentOrder.status)))
                    .returning({ id: salesOrders.id });

                if (updated.length === 0) {
                    throw Object.assign(
                        new Error('Order status was changed by another request. Please refresh.'),
                        { statusCode: 409 }
                    );
                }

                // 3. Auto-deduct stock only when transitioning TO INVOICED
                if (newStatus === 'INVOICED') {
                    // Fetch line items with productId and quantity
                    const items = await tx
                        .select({
                            productId: salesOrderItems.productId,
                            quantity: salesOrderItems.quantity,
                        })
                        .from(salesOrderItems)
                        .where(eq(salesOrderItems.orderId, params.id));

                    // Require exactly one active warehouse (deterministic deduction).
                    // Multiple active warehouses would cause nondeterministic stock movements.
                    const activeWarehouses = await tx
                        .select({ id: warehouses.id })
                        .from(warehouses)
                        .where(eq(warehouses.isActive, true));

                    if (activeWarehouses.length !== 1) {
                        throw new Error(
                            `Cannot invoice order: expected exactly 1 active warehouse, found ${activeWarehouses.length}.`
                        );
                    }

                    const [warehouse] = activeWarehouses;

                    // Deduct stock for each line item
                    for (const item of items) {
                        if (!item.productId) continue;
                        // salesOrderItems.quantity is numeric(10,2) — Drizzle returns it as string
                        const qty = Math.round(Number(item.quantity));
                        if (qty <= 0) continue;

                        await recordTransaction(tx, {
                            productId: item.productId,
                            warehouseId: warehouse.id,
                            quantityChange: -qty,
                            transactionType: 'STOCK_OUT',
                            referenceDoc: currentOrder.orderNumber,
                            performedBy: user.id,
                            allowNegative: true, // stock warning was shown at order creation
                        });
                    }
                }
            });

            return { success: true };
        } catch (err: any) {
            console.error("Failed to update status:", err);
            const code = err?.statusCode;
            if (code === 400 || code === 404 || code === 409) {
                return fail(code, { error: err.message });
            }
            return fail(500, { error: "Could not update status" });
        }
	}
};
