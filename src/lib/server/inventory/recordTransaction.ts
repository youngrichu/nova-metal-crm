import { db } from '$lib/server/db';
import { inventory, inventoryTransactions } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// Follow the applyPurchaseCost pattern: Pick the operations we need so both
// db itself and a db.transaction() callback parameter are accepted.
export type DbClient = Pick<typeof db, 'query' | 'insert' | 'update'>;

export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

export interface RecordTransactionParams {
    productId: string;
    warehouseId: string;
    /** Negative for STOCK_OUT, positive for STOCK_IN/ADJUSTMENT */
    quantityChange: number;
    transactionType: TransactionType;
    referenceDoc?: string;
    notes?: string;
    performedBy: string;
    /** STOCK_IN only — ignored for other types */
    unitCost?: string;
    /**
     * When true, allows stock to go negative (used for auto-deduction on
     * invoice, where the stock warning was shown at order creation time).
     * Defaults to false — manual inventory entries will be rejected if they
     * would bring stock below zero.
     */
    allowNegative?: boolean;
}

/**
 * Upserts the inventory row for (productId, warehouseId) and appends an
 * immutable transaction record. Call this inside a db.transaction() for
 * atomicity with surrounding operations.
 */
export async function recordTransaction(
    tx: DbClient,
    params: RecordTransactionParams
): Promise<void> {
    const {
        productId, warehouseId, quantityChange, transactionType,
        referenceDoc, notes, performedBy, unitCost, allowNegative = false
    } = params;

    // 1. Find existing inventory row for this product + warehouse
    const invRecord = await tx.query.inventory.findFirst({
        where: and(
            eq(inventory.productId, productId),
            eq(inventory.warehouseId, warehouseId)
        )
    });

    let currentInventoryId: string;

    if (!invRecord) {
        // No row exists — only STOCK_IN can create one. allowNegative does not
        // apply here: a missing inventory row means the product was never stocked
        // in this warehouse, which is always an error regardless of the caller.
        if (quantityChange < 0) {
            throw new Error('Cannot reduce stock below 0');
        }

        const [newInv] = await tx.insert(inventory).values({
            productId,
            warehouseId,
            quantity: quantityChange,
        }).returning();

        currentInventoryId = newInv.id;
    } else {
        const newQuantity = invRecord.quantity + quantityChange;

        // Guard against negative stock unless explicitly opted out (e.g. auto-invoice deduction)
        if (newQuantity < 0 && !allowNegative) {
            throw new Error(`Insufficient stock. Current: ${invRecord.quantity}`);
        }

        await tx.update(inventory)
            .set({ quantity: newQuantity, lastUpdated: sql`now()` })
            .where(eq(inventory.id, invRecord.id));

        currentInventoryId = invRecord.id;
    }

    // 2. Append immutable transaction record
    await tx.insert(inventoryTransactions).values({
        inventoryId: currentInventoryId,
        transactionType,
        quantityChange,
        unitCost: unitCost ?? null,
        referenceDoc: referenceDoc ?? null,
        notes: notes ?? null,
        performedBy,
    });
}
