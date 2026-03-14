import { db } from '$lib/server/db';
import { inventory, products } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Applies a new purchase cost to a product, updating the base price used for
 * all pricing calculations. The new cost applies to all units of the product.
 */
export async function applyPurchaseCost(productId: string, unitCost: string): Promise<void> {
	await db.update(products)
		.set({ averageLandingCost: unitCost, updatedAt: new Date() })
		.where(eq(products.id, productId));

	await db.update(inventory)
		.set({ avgCostPerPiece: unitCost, lastUpdated: new Date() })
		.where(eq(inventory.productId, productId));
}
