import { error, redirect, fail } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, salesOrderItems, customers, products, systemSettings } from "$lib/server/db/schema";
import { eq, sql } from "drizzle-orm";
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

        const vatRow = await db.select({ value: systemSettings.value })
            .from(systemSettings)
            .where(eq(systemSettings.key, 'vat_rate'))
            .limit(1);
        const vatRate = (() => { const v = parseFloat(vatRow[0]?.value ?? ''); return Number.isFinite(v) ? v : 0.15; })();

		return {
			customers: customersList,
            products: productsList,
            vatRate,
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
            // Normalize phone: strip spaces, dashes, parentheses, dots (preserve +)
            const rawWalkInPhone = formData.get("walkInPhone")?.toString() || null;
            const walkInPhone = rawWalkInPhone ? rawWalkInPhone.replace(/[\s\-().]/g, '') : null;
            const walkInPricingTier = formData.get("walkInPricingTier")?.toString() || null;
            const itemsJson = formData.get("items")?.toString();

            // Validation: need exactly one of customer or walk-in mode
            if (!customerId && !isWalkIn) {
                return fail(400, { error: "Please select a customer or use walk-in mode" });
            }
            // If both are submitted simultaneously, treat as a registered customer order
            // (UI prevents this, but guard here for safety)
            const effectiveIsWalkIn = isWalkIn && !customerId;

            if (!itemsJson) {
                return fail(400, { error: "Missing required fields" });
            }

            const items = JSON.parse(itemsJson);
            if (!items || items.length === 0) {
                return fail(400, { error: "Order must have at least one valid item" });
            }

            // Validate walk-in pricing tier against known enum values
            const VALID_TIERS = ['RETAIL', 'WHOLESALE', 'VIP', 'PREFERRED'] as const;
            type PricingTier = typeof VALID_TIERS[number];
            const effectiveWalkInTier: PricingTier = (walkInPricingTier && VALID_TIERS.includes(walkInPricingTier as PricingTier))
                ? walkInPricingTier as PricingTier
                : 'RETAIL';

            // Resolve the effective pricing tier override for walk-in orders.
            // If customerId is present, the engine will look up the customer tier — no override needed.
            const tierOverride = customerId ? undefined : effectiveWalkInTier;

            let subtotal = 0;
            let orderDiscountAmount = 0;

            const { calculateDynamicPrice, fetchMarkupTiers } = await import('$lib/server/pricing/engine');
            const markupTiers = await fetchMarkupTiers();

            const orderItemsData: any[] = [];
            for (const item of items) {
                const quantity = Number(item.quantity) || 0;
                if (quantity <= 0) continue;

                const pricing = await calculateDynamicPrice(
                    item.productId,
                    customerId,
                    quantity,
                    undefined,
                    tierOverride,
                    markupTiers
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

            if (orderItemsData.length === 0) {
                return fail(400, { error: "Order must have at least one valid item" });
            }

            const vatRow = await db.select({ value: systemSettings.value })
                .from(systemSettings)
                .where(eq(systemSettings.key, 'vat_rate'))
                .limit(1);
            const vatRate = (() => { const v = parseFloat(vatRow[0]?.value ?? ''); return Number.isFinite(v) ? v : 0.15; })();
            const taxAmount = subtotal * vatRate;
            const totalAmount = subtotal + taxAmount;

            let newOrderId = "";

            // Retry loop: under READ COMMITTED, two concurrent transactions can both
            // read the same MAX and attempt to insert the same order number. The UNIQUE
            // constraint on order_number catches the collision; we retry up to 5 times.
            // Each retry re-reads MAX inside a fresh transaction so it sees the committed value.
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    await db.transaction(async (tx) => {
                        const year = new Date().getFullYear();
                        const [{ maxNum }] = await tx
                            .select({ maxNum: sql<number>`coalesce(max(cast(split_part(order_number, '-', 3) as int)), 0)` })
                            .from(salesOrders)
                            .where(sql`order_number like ${'SO-' + year + '-%'}`);
                        const orderNumber = `SO-${year}-${String((maxNum ?? 0) + 1).padStart(4, '0')}`;

                        const [order] = await tx.insert(salesOrders).values({
                            orderNumber,
                            customerId: customerId || null,
                            walkInPhone: effectiveIsWalkIn ? (walkInPhone || null) : null,
                            walkInPricingTier: effectiveIsWalkIn ? effectiveWalkInTier : null,
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
                    break; // success — exit retry loop
                } catch (e: any) {
                    const isOrderNumberCollision = e.code === '23505' &&
                        (e.message ?? '').includes('order_number');
                    if (attempt < 4 && isOrderNumberCollision) {
                        continue; // retry with fresh MAX read
                    }
                    throw e; // rethrow on non-collision error or final attempt
                }
            }

            return { success: true, orderId: newOrderId };

        } catch (err) {
            console.error("Order creation error:", err);
            return fail(500, { error: "An unexpected error occurred during order creation." });
        }
    }
};
