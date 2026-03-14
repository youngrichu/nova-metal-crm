import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProductsSet = vi.fn();
const mockProductsWhere = vi.fn();
const mockInventorySet = vi.fn();
const mockInventoryWhere = vi.fn();

mockProductsSet.mockReturnValue({ where: mockProductsWhere });
mockInventorySet.mockReturnValue({ where: mockInventoryWhere });

vi.mock('$lib/server/db', () => ({
	db: {
		update: vi.fn((table) => {
			if (table === 'products') {
				return { set: mockProductsSet };
			}
			return { set: mockInventorySet };
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
		mockProductsSet.mockReturnValue({ where: mockProductsWhere });
		mockInventorySet.mockReturnValue({ where: mockInventoryWhere });
	});

	it('sets averageLandingCost on the product with the correct cost', async () => {
		const { applyPurchaseCost } = await import('./applyPurchaseCost');
		await applyPurchaseCost('product-123', '250.00');

		expect(mockProductsSet).toHaveBeenCalledOnce();
		expect(mockProductsSet).toHaveBeenCalledWith(
			expect.objectContaining({ averageLandingCost: '250.00' })
		);
	});

	it('filters product update by the correct productId', async () => {
		const { applyPurchaseCost } = await import('./applyPurchaseCost');
		await applyPurchaseCost('product-123', '250.00');

		expect(mockProductsWhere).toHaveBeenCalledWith({ col: undefined, val: 'product-123' });
	});

	it('sets avgCostPerPiece on inventory records with the correct cost', async () => {
		const { applyPurchaseCost } = await import('./applyPurchaseCost');
		await applyPurchaseCost('product-123', '250.00');

		expect(mockInventorySet).toHaveBeenCalledOnce();
		expect(mockInventorySet).toHaveBeenCalledWith(
			expect.objectContaining({ avgCostPerPiece: '250.00' })
		);
	});

	it('filters inventory update by the correct productId', async () => {
		const { applyPurchaseCost } = await import('./applyPurchaseCost');
		await applyPurchaseCost('product-123', '250.00');

		expect(mockInventoryWhere).toHaveBeenCalledWith({ col: undefined, val: 'product-123' });
	});

	it('uses the provided client instead of the default db', async () => {
		const mockWhere = vi.fn();
		const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
		const mockClient = { update: vi.fn().mockReturnValue({ set: mockSet }) };

		const { applyPurchaseCost } = await import('./applyPurchaseCost');
		await applyPurchaseCost('product-abc', '99.50', mockClient as any);

		expect(mockClient.update).toHaveBeenCalledTimes(2);
	});
});
