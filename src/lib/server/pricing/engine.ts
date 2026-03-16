// src/lib/server/pricing/engine.ts
import { db } from '$lib/server/db';
import { products, customers, salesOrders, salesOrderItems, priceHistory, systemSettings, inventory, warehouses } from '$lib/server/db/schema';
import { eq, and, inArray, sum } from 'drizzle-orm';

const PRICING_RULES = {
    TIERS: {
        RETAIL: 1.15,      // 15% markup
        WHOLESALE: 1.05,   // 5% markup
        PREFERRED: 1.08,   // 8% markup
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
    availableStock: number; // total units in stock across all warehouses
};

export function computePrice(baseCost: number, pricingTier: string, quantity: number, tiersOverride?: typeof PRICING_RULES.TIERS): Omit<PricingResult, 'availableStock'> {
    const tiers = tiersOverride ?? PRICING_RULES.TIERS;
    let markupMultiplier = tiers.RETAIL; // Default

    if (pricingTier) {
        markupMultiplier = tiers[pricingTier as keyof typeof tiers] || tiers.RETAIL;
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
 * If pricingTierOverride is provided, it takes precedence over the customer's CRM tier (used for walk-in orders).
 * Tier resolution order: quote lock-in → pricingTierOverride → customer tier lookup → RETAIL default.
 */
export type MarkupTiers = {
    RETAIL: number;
    WHOLESALE: number;
    VIP: number;
    PREFERRED: number;
};

/**
 * Fetches markup multipliers from system_settings once.
 * Pass the result as `prefetchedTiers` to `calculateDynamicPrice` when pricing
 * multiple items in a loop to avoid one DB query per item.
 */
export async function fetchMarkupTiers(): Promise<MarkupTiers> {
    const markupKeys = ['markup_retail', 'markup_wholesale', 'markup_vip', 'markup_preferred'];
    const settingRows = await db.select().from(systemSettings)
        .where(inArray(systemSettings.key, markupKeys));
    // Use Number.isFinite so corrupt/non-numeric DB values fall back to defaults
    // rather than silently propagating NaN through all price calculations.
    const settingsMap = Object.fromEntries(
        settingRows.map(r => {
            const parsed = parseFloat(r.value);
            return [r.key, Number.isFinite(parsed) ? parsed : null];
        })
    );
    return {
        RETAIL:    settingsMap['markup_retail']     ?? PRICING_RULES.TIERS.RETAIL,
        WHOLESALE: settingsMap['markup_wholesale']  ?? PRICING_RULES.TIERS.WHOLESALE,
        VIP:       settingsMap['markup_vip']        ?? PRICING_RULES.TIERS.VIP,
        PREFERRED: settingsMap['markup_preferred']  ?? PRICING_RULES.TIERS.PREFERRED,
    };
}

export async function calculateDynamicPrice(
    productId: string,
    customerId: string | null,
    quantity: number = 1,
    orderId?: string,
    pricingTierOverride?: string,
    prefetchedTiers?: MarkupTiers
): Promise<PricingResult> {
    // 1. Fetch Product (Layer 1: Base Cost)
    const product = await db.query.products.findFirst({
        where: eq(products.id, productId)
    });

    if (!product) {
        throw new Error("Product not found");
    }

    const baseCost = Number(product.averageLandingCost || 0);

    // Fetch available stock — sum across active warehouses for this product.
    const stockRows = await db
        .select({ totalQty: sum(inventory.quantity) })
        .from(inventory)
        .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
        .where(and(eq(inventory.productId, productId), eq(warehouses.isActive, true)));
    const availableStock = Number(stockRows[0]?.totalQty ?? 0);

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
                    lineTotal: lockedLineTotal,
                    availableStock,
                };
            }
        }
        // If order not found, expired, or no matching item — fall through to normal calculation
    }

    // 3. Resolve Pricing Tier
    // Full resolution order (steps 1–2 already handled above by the quote lock-in block):
    //   1. Quote lock-in (handled above — returns early if locked)
    //   2. pricingTierOverride provided → use it directly
    //   3. customerId provided → look up customer tier from DB
    //   4. Default → RETAIL
    let pricingTier = "RETAIL";
    if (pricingTierOverride) {
        pricingTier = pricingTierOverride;
    } else if (customerId) {
        const customer = await db.query.customers.findFirst({
            where: eq(customers.id, customerId)
        });

        if (customer && customer.pricingTier) {
            pricingTier = customer.pricingTier;
        }
    }

    // 4. Load markup multipliers from system_settings, falling back to hardcoded defaults.
    // Callers processing multiple items should pass prefetchedTiers to avoid N DB queries.
    const dynamicTiers = prefetchedTiers ?? await fetchMarkupTiers();

    return {
        ...computePrice(baseCost, pricingTier, quantity, dynamicTiers),
        availableStock,
    };
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
        reason: params.reason,
        performedBy: params.performedBy,
        recordedAt: new Date()
    });
}
