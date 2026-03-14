import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProductsUpdate = vi.fn();
const mockInventoryUpdate = vi.fn();

vi.mock('$lib/server/db', () => ({
	db: {
		update: vi.fn((table) => {
			if (table === 'products') {
				return { set: vi.fn(() => ({ where: mockProductsUpdate })) };
			}
			return { set: vi.fn(() => ({ where: mockInventoryUpdate })) };
		})
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	products: 'products',
	inventory: 'inventory'
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((col, val) => ({ col, val }))
}));

describe('applyPurchaseCost', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('updates products.averageLandingCost with the new unit cost', async () => {
		const { applyPurchaseCost } = await import('./applyPurchaseCost');
		await applyPurchaseCost('product-123', '250.00');
		expect(mockProductsUpdate).toHaveBeenCalledOnce();
	});

	it('updates inventory.avgCostPerPiece for all inventory records of the product', async () => {
		const { applyPurchaseCost } = await import('./applyPurchaseCost');
		await applyPurchaseCost('product-123', '250.00');
		expect(mockInventoryUpdate).toHaveBeenCalledOnce();
	});

	it('does not throw for valid inputs', async () => {
		const { applyPurchaseCost } = await import('./applyPurchaseCost');
		await expect(applyPurchaseCost('product-abc', '99.50')).resolves.not.toThrow();
	});
});
