import { db } from '$lib/server/db';
import { inventory, products } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

type DbClient = Pick<typeof db, 'update'>;

/**
 * Applies a new purchase cost to a product, updating the base price used for
 * all pricing calculations. The new cost applies to all units of the product.
 *
 * Accepts an optional `client` so it can be called inside a db.transaction()
 * for atomicity, or standalone when used outside one.
 */
export async function applyPurchaseCost(
	productId: string,
	unitCost: string,
	client: DbClient = db
): Promise<void> {
	await client.update(products)
		.set({ averageLandingCost: unitCost, updatedAt: sql`now()` })
		.where(eq(products.id, productId));

	await client.update(inventory)
		.set({ avgCostPerPiece: unitCost, lastUpdated: sql`now()` })
		.where(eq(inventory.productId, productId));
}
