import { describe, it, expect, vi } from 'vitest';
import { computePrice, calculateDynamicPrice } from './engine';

// Mock the DB module — must be placed before any test that calls calculateDynamicPrice
vi.mock('$lib/server/db', () => ({
    db: {
        query: {
            products: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 'test-product-id',
                    averageLandingCost: '100.00'
                })
            },
            salesOrders: {
                findFirst: vi.fn().mockResolvedValue(null) // no quote lock-in
            }
        },
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]) // no system settings overrides → use hardcoded defaults
            })
        })
    }
}));

describe('Pricing Engine', () => {
    it('calculates Retail pricing correctly (15% markup)', () => {
        const result = computePrice(100, 'RETAIL', 1);
        expect(result.baseCost).toBe(100);
        expect(result.unitPriceBeforeDiscount).toBe(115);
        expect(result.discountPercent).toBe(0);
        expect(result.finalUnitPrice).toBe(115);
        expect(result.lineTotal).toBe(115);
    });

    it('calculates Wholesale pricing correctly (5% markup)', () => {
        const result = computePrice(100, 'WHOLESALE', 1);
        expect(result.baseCost).toBe(100);
        expect(result.unitPriceBeforeDiscount).toBe(105);
        expect(result.finalUnitPrice).toBe(105);
    });

    it('calculates VIP pricing correctly (5% markup)', () => {
        const result = computePrice(100, 'VIP', 1);
        expect(result.baseCost).toBe(100);
        expect(result.unitPriceBeforeDiscount).toBe(105);
        expect(result.finalUnitPrice).toBe(105);
    });

    it('applies Tier 1 bulk discount correctly (>= 50 items = 5% off)', () => {
        const result = computePrice(100, 'RETAIL', 50);
        // Base: 100 -> Retail: 115
        // Discount: 5% of 115 = 5.75
        // Final: 115 - 5.75 = 109.25
        expect(result.baseCost).toBe(100);
        expect(result.unitPriceBeforeDiscount).toBe(115);
        expect(result.discountPercent).toBe(0.05);
        expect(result.finalUnitPrice).toBe(109.25);
        expect(result.lineTotal).toBe(109.25 * 50);
    });

    it('applies Tier 2 bulk discount correctly (>= 100 items = 7% off)', () => {
        const result = computePrice(100, 'RETAIL', 100);
        // Base: 100 -> Retail: 115
        // Discount: 7% of 115 = 8.05
        // Final: 115 - 8.05 = 106.95
        expect(result.baseCost).toBe(100);
        expect(result.unitPriceBeforeDiscount).toBe(115);
        expect(result.discountPercent).toBe(0.07);
        expect(result.finalUnitPrice).toBe(106.95);
        expect(result.lineTotal).toBe(106.95 * 100);
    });

    it('falls back to RETAIL tier if unknown tier is provided', () => {
        const result = computePrice(100, 'UNKNOWN_TIER', 1);
        expect(result.baseCost).toBe(100);
        expect(result.unitPriceBeforeDiscount).toBe(115);
        expect(result.finalUnitPrice).toBe(115);
    });
});

describe('calculateDynamicPrice with pricingTierOverride', () => {
    it('applies WHOLESALE markup when pricingTierOverride is WHOLESALE and customerId is null', async () => {
        const result = await calculateDynamicPrice('test-product-id', null, 1, undefined, 'WHOLESALE');
        expect(result.unitPriceBeforeDiscount).toBe(105); // 100 * 1.05
        expect(result.finalUnitPrice).toBe(105);
    });

    it('falls back to RETAIL when an unknown override is passed', async () => {
        const result = await calculateDynamicPrice('test-product-id', null, 1, undefined, 'GARBAGE_TIER');
        expect(result.unitPriceBeforeDiscount).toBe(115); // 100 * 1.15 (RETAIL)
    });
});
