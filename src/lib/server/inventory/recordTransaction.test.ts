import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordTransaction } from './recordTransaction';

// ── DB mock ────────────────────────────────────────────────────────────────
// Drizzle's insert chain: insert(table).values({}).returning() → Promise<row[]>
const mockInsertReturning = vi.fn().mockResolvedValue([{ id: 'new-inv-id' }]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
// For transaction inserts (no .returning() needed): insert(table).values({}) → Promise<void>
// We reuse mockInsertValues for both paths; the transaction insert calls .values() then
// awaits directly — mockInsertValues returns { returning } which is also awaitable via
// the mock resolving. We override per-test as needed.
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

const mockFindFirst = vi.fn();

const mockTx = {
    query: { inventory: { findFirst: mockFindFirst } },
    insert: mockInsert,
    update: mockUpdate,
} as any;

vi.mock('$lib/server/db/schema', () => ({
    inventory: { id: 'id', productId: 'product_id', warehouseId: 'warehouse_id', quantity: 'quantity' },
    inventoryTransactions: {},
}));

// Note: drizzle-orm (eq, and, sql) is NOT mocked — the real functions run against
// the fake schema column strings. The mock ignores arguments, so WHERE condition
// construction is not verified at the unit level; integration tests cover that.

beforeEach(() => vi.clearAllMocks());

// ── Tests ──────────────────────────────────────────────────────────────────

describe('recordTransaction — STOCK_OUT on existing inventory', () => {
    it('deducts quantity and inserts a transaction record', async () => {
        mockFindFirst.mockResolvedValueOnce({ id: 'inv-1', quantity: 10 });
        // Update path: only one insert occurs (transaction record), no .returning() needed.
        // Default mockInsertValues return value is sufficient.

        await recordTransaction(mockTx, {
            productId: 'prod-1',
            warehouseId: 'wh-1',
            quantityChange: -3,
            transactionType: 'STOCK_OUT',
            referenceDoc: 'SO-2026-0001',
            performedBy: 'user-1',
        });

        // Should UPDATE inventory quantity to 7
        expect(mockUpdate).toHaveBeenCalledOnce();
        const setArg = mockUpdateSet.mock.calls[0][0];
        expect(setArg.quantity).toBe(7);

        // Should INSERT a transaction record
        expect(mockInsert).toHaveBeenCalledOnce();
        const insertValuesArg = mockInsertValues.mock.calls[0][0];
        expect(insertValuesArg.transactionType).toBe('STOCK_OUT');
        expect(insertValuesArg.quantityChange).toBe(-3);
        expect(insertValuesArg.referenceDoc).toBe('SO-2026-0001');
    });
});

describe('recordTransaction — manual STOCK_OUT below current quantity (guard active)', () => {
    it('throws when quantity would go negative and allowNegative is false (default)', async () => {
        mockFindFirst.mockResolvedValueOnce({ id: 'inv-1', quantity: 2 });

        await expect(
            recordTransaction(mockTx, {
                productId: 'prod-1',
                warehouseId: 'wh-1',
                quantityChange: -5,
                transactionType: 'STOCK_OUT',
                performedBy: 'user-1',
                // allowNegative defaults to false
            })
        ).rejects.toThrow('Insufficient stock');
    });
});

describe('recordTransaction — auto-invoice STOCK_OUT (allowNegative: true)', () => {
    it('allows stock to go negative when allowNegative is true', async () => {
        mockFindFirst.mockResolvedValueOnce({ id: 'inv-1', quantity: 2 });
        mockInsertValues.mockResolvedValueOnce(undefined);

        await expect(
            recordTransaction(mockTx, {
                productId: 'prod-1',
                warehouseId: 'wh-1',
                quantityChange: -5,
                transactionType: 'STOCK_OUT',
                performedBy: 'user-1',
                allowNegative: true,
            })
        ).resolves.not.toThrow();

        const setArg = mockUpdateSet.mock.calls[0][0];
        expect(setArg.quantity).toBe(-3);
    });
});

describe('recordTransaction — STOCK_IN on new inventory', () => {
    it('creates a new inventory row when none exists', async () => {
        mockFindFirst.mockResolvedValueOnce(null); // no existing row
        // First insert: new inventory row — needs .returning()
        mockInsertValues
            .mockReturnValueOnce({ returning: mockInsertReturning })
            // Second insert: transaction record — resolves directly
            .mockResolvedValueOnce(undefined);

        await recordTransaction(mockTx, {
            productId: 'prod-2',
            warehouseId: 'wh-1',
            quantityChange: 20,
            transactionType: 'STOCK_IN',
            performedBy: 'user-1',
        });

        // Should INSERT new inventory row (not update)
        expect(mockUpdate).not.toHaveBeenCalled();
        // insert called twice: once for inventory row, once for transaction record
        expect(mockInsert).toHaveBeenCalledTimes(2);
    });
});

describe('recordTransaction — STOCK_OUT on non-existent inventory', () => {
    it('throws when trying to stock-out from non-existent inventory row', async () => {
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(
            recordTransaction(mockTx, {
                productId: 'prod-3',
                warehouseId: 'wh-1',
                quantityChange: -1,
                transactionType: 'STOCK_OUT',
                performedBy: 'user-1',
            })
        ).rejects.toThrow('Cannot reduce stock below 0');
    });
});
