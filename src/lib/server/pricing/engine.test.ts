import { describe, it, expect } from 'vitest';
import { computePrice } from './engine';

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
