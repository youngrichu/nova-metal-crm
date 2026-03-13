// src/lib/server/pricing/engine.ts
import { db } from '$lib/server/db';
import { products, customers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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
 */
export async function calculateDynamicPrice(
    productId: string, 
    customerId: string | null, 
    quantity: number = 1
): Promise<PricingResult> {
    // 1. Fetch Product (Layer 1: Base Cost)
    const product = await db.query.products.findFirst({
        where: eq(products.id, productId)
    });

    if (!product) {
        throw new Error("Product not found");
    }

    const baseCost = Number(product.averageLandingCost || 0);

    // 2. Fetch Customer Tier
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
