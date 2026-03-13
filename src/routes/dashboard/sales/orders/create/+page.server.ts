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
			const customerId = formData.get("customerId")?.toString();
			const itemsJson = formData.get("items")?.toString();

            if (!customerId || !itemsJson) {
                return { error: "Missing required fields" };
            }

            const items = JSON.parse(itemsJson);
            if (!items || items.length === 0) {
                return { error: "Order must have at least one valid item" };
            }

            // Generate an order number (e.g., SO-2026-XXXX)
            // In a real system, you'd use a sequence or transaction-safe generator
            const orderCount = await db.$count(salesOrders);
            const orderNumber = `SO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

            // Calculate totals SECURELY via PricingEngine
            let subtotal = 0;
            let orderDiscountAmount = 0;
            
            const { calculateDynamicPrice } = await import('$lib/server/pricing/engine');

            // Process sequentially since we are querying the DB in calculateDynamicPrice
            const orderItemsData: any[] = [];
            for (const item of items) {
                const quantity = Number(item.quantity) || 0;
                let submittedUnitPrice = Number(item.unitPrice) || 0;
                
                if (quantity <= 0) continue;

                // Call the Pricing Engine to get the correct price & discounts
                const pricing = await calculateDynamicPrice(item.productId, customerId, quantity);
                
                subtotal += pricing.lineTotal;
                
                // Track total absolute discount value for the order summary
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

            const taxAmount = subtotal * 0.15; // 15% VAT
            const totalAmount = subtotal + taxAmount;

            let newOrderId = "";

            await db.transaction(async (tx) => {
                // Insert order
                const [order] = await tx.insert(salesOrders).values({
                    orderNumber,
                    customerId,
                    status: 'DRAFT',
                    subtotal: subtotal.toString(),
                    taxAmount: taxAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    discountAmount: orderDiscountAmount.toString(),
                    createdBy: user.id
                }).returning({ id: salesOrders.id });

                newOrderId = order.id;

                // Insert items
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
