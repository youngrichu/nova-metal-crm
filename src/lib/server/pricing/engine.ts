// src/lib/server/pricing/engine.ts
import { db } from '$lib/server/db';
import { products, customers, salesOrders, salesOrderItems, priceHistory } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

const PRICING_RULES = {
    TIERS: {
        RETAIL: 1.15,      // 15% markup
        WHOLESALE: 1.05,   // 5% markup
        PREFERRED: 1.05,   // 5% markup
        VIP: 1.05          // 5% markup
    },
    BULK_DISCOUNT: {
        TIER_1: { minQty: 50, discount: 0.05 },  // 5% discount
        TIER_2: { minQty: 100, discount: 0.07 }  // 7% discount
    }
};

export type PricingResult = {
    baseCost: number;
    unitPriceBeforeDiscount: number;
    discountPercent: number;
    finalUnitPrice: number;
    lineTotal: number;
};

export function computePrice(baseCost: number, pricingTier: string, quantity: number): PricingResult {
    let markupMultiplier = PRICING_RULES.TIERS.RETAIL; // Default
    
    if (pricingTier) {
        markupMultiplier = PRICING_RULES.TIERS[pricingTier as keyof typeof PRICING_RULES.TIERS] || PRICING_RULES.TIERS.RETAIL;
    }

    const unitPriceBeforeDiscount = baseCost * markupMultiplier;

    // 3. Calculate Bulk Discount
    let discountPercent = 0;
    if (quantity >= PRICING_RULES.BULK_DISCOUNT.TIER_2.minQty) {
        discountPercent = PRICING_RULES.BULK_DISCOUNT.TIER_2.discount;
    } else if (quantity >= PRICING_RULES.BULK_DISCOUNT.TIER_1.minQty) {
        discountPercent = PRICING_RULES.BULK_DISCOUNT.TIER_1.discount;
    }

    const finalUnitPrice = unitPriceBeforeDiscount * (1 - discountPercent);
    const lineTotal = finalUnitPrice * quantity;

    return {
        baseCost,
        unitPriceBeforeDiscount: Number(unitPriceBeforeDiscount.toFixed(2)),
        discountPercent: Number(discountPercent.toFixed(2)),
        finalUnitPrice: Number(finalUnitPrice.toFixed(2)),
        lineTotal: Number(lineTotal.toFixed(2))
    };
}

/**
 * Calculates the dynamic price for a product based on customer tier and quantity.
 * If orderId is provided, checks for a valid quote lock-in and returns the locked price if still valid.
 */
export async function calculateDynamicPrice(
    productId: string,
    customerId: string | null,
    quantity: number = 1,
    orderId?: string  // optional — for quote lock-in check
): Promise<PricingResult> {
    // 1. Fetch Product (Layer 1: Base Cost)
    const product = await db.query.products.findFirst({
        where: eq(products.id, productId)
    });

    if (!product) {
        throw new Error("Product not found");
    }

    const baseCost = Number(product.averageLandingCost || 0);

    // 2. Quote Lock-in Check
    if (orderId) {
        const now = new Date();
        const order = await db.query.salesOrders.findFirst({
            where: eq(salesOrders.id, orderId)
        });

        if (order && order.validUntil && order.validUntil.getTime() >= now.getTime()) {
            // Order is still within the valid quote window — look for a locked item price
            const lockedItem = await db.query.salesOrderItems.findFirst({
                where: and(
                    eq(salesOrderItems.orderId, orderId),
                    eq(salesOrderItems.productId, productId)
                )
            });

            if (lockedItem) {
                const lockedUnitPrice = Number(lockedItem.unitPrice);
                // The lock is per-unit: the unit price is fixed from the original quote,
                // but the quantity is allowed to differ (e.g. the buyer can increase or decrease
                // the order quantity without invalidating the locked unit price).
                const lockedLineTotal = Number((lockedUnitPrice * quantity).toFixed(2));
                return {
                    baseCost,
                    unitPriceBeforeDiscount: lockedUnitPrice,
                    discountPercent: 0,
                    finalUnitPrice: lockedUnitPrice,
                    lineTotal: lockedLineTotal
                };
            }
        }
        // If order not found, expired, or no matching item — fall through to normal calculation
    }

    // 3. Fetch Customer Tier
    let pricingTier = "RETAIL";
    if (customerId) {
        const customer = await db.query.customers.findFirst({
            where: eq(customers.id, customerId)
        });

        if (customer && customer.pricingTier) {
            pricingTier = customer.pricingTier;
        }
    }

    return computePrice(baseCost, pricingTier, quantity);
}

/**
 * Records a manual price override to the price_history audit table.
 */
export async function recordManualPriceOverride(params: {
    productId: string;
    landingCost: number;
    marketPrice: number;
    reason: string;
    performedBy: string; // user id
}): Promise<void> {
    await db.insert(priceHistory).values({
        productId: params.productId,
        landingCost: params.landingCost.toFixed(2),
        marketPrice: params.marketPrice.toFixed(2),
        // Workaround: price_history has no dedicated performedBy column, so the actor is
        // encoded inline in the reason string for auditability.
        reason: `${params.reason} [performedBy: ${params.performedBy}]`,
        recordedAt: new Date()
    });
}
