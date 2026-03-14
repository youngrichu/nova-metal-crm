import { error, redirect } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, salesOrderItems, customers, products } from "$lib/server/db/schema";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async () => {
	try {
        // Load customers for the dropdown
		const customersList = await db
			.select({
				id: customers.id,
				name: customers.name,
				companyName: customers.companyName,
			})
			.from(customers)
			.orderBy(customers.name);

        // Load active products
        const productsList = await db
			.select({
				id: products.id,
				sku: products.sku,
                name: products.name,
			})
			.from(products)
			.orderBy(products.name);

		return {
			customers: customersList,
            products: productsList,
		};
	} catch (err) {
		console.error("Failed to load create order form data:", err);
		throw error(500, "Failed to load underlying data");
	}
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) {
            throw error(401, "Unauthorized");
        }

        try {
            const formData = await request.formData();
            const customerId = formData.get("customerId")?.toString() || null;
            const isWalkIn = formData.get("isWalkIn") === "true";
            const walkInPhone = formData.get("walkInPhone")?.toString() || null;
            const walkInPricingTier = formData.get("walkInPricingTier")?.toString() || null;
            const itemsJson = formData.get("items")?.toString();

            // Validation: need either a customer or walk-in mode
            if (!customerId && !isWalkIn) {
                return { error: "Please select a customer or use walk-in mode" };
            }

            if (!itemsJson) {
                return { error: "Missing required fields" };
            }

            const items = JSON.parse(itemsJson);
            if (!items || items.length === 0) {
                return { error: "Order must have at least one valid item" };
            }

            // Resolve the effective pricing tier override for walk-in orders.
            // If customerId is present, the engine will look up the customer tier — no override needed.
            const tierOverride = customerId ? undefined : (walkInPricingTier || 'RETAIL');

            const orderCount = await db.$count(salesOrders);
            const orderNumber = `SO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

            let subtotal = 0;
            let orderDiscountAmount = 0;

            const { calculateDynamicPrice } = await import('$lib/server/pricing/engine');

            const orderItemsData: any[] = [];
            for (const item of items) {
                const quantity = Number(item.quantity) || 0;
                if (quantity <= 0) continue;

                const pricing = await calculateDynamicPrice(
                    item.productId,
                    customerId,
                    quantity,
                    undefined,
                    tierOverride
                );

                subtotal += pricing.lineTotal;
                const itemTotalWithoutDiscount = pricing.unitPriceBeforeDiscount * quantity;
                orderDiscountAmount += (itemTotalWithoutDiscount - pricing.lineTotal);

                orderItemsData.push({
                    productId: item.productId,
                    quantity: quantity.toString(),
                    unitPrice: pricing.unitPriceBeforeDiscount.toString(),
                    discountPercent: pricing.discountPercent.toString(),
                    lineTotal: pricing.lineTotal.toString(),
                });
            }

            const taxAmount = subtotal * 0.15;
            const totalAmount = subtotal + taxAmount;

            let newOrderId = "";

            await db.transaction(async (tx) => {
                const [order] = await tx.insert(salesOrders).values({
                    orderNumber,
                    customerId: customerId || null,
                    walkInPhone: isWalkIn ? (walkInPhone || null) : null,
                    walkInPricingTier: isWalkIn ? (walkInPricingTier || 'RETAIL') : null,
                    status: 'DRAFT',
                    subtotal: subtotal.toString(),
                    taxAmount: taxAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    discountAmount: orderDiscountAmount.toString(),
                    createdBy: user.id
                }).returning({ id: salesOrders.id });

                newOrderId = order.id;

                const insertItems = orderItemsData.map((item: any) => ({
                    orderId: newOrderId,
                    ...item
                }));

                await tx.insert(salesOrderItems).values(insertItems);
            });

            return { success: true, orderId: newOrderId };

        } catch (err) {
            console.error("Order creation error:", err);
            return { error: "An unexpected error occurred during order creation." };
        }
    }
};
