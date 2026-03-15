# Auto Stock Deduction on Invoice — Design Spec

**Date:** 2026-03-15
**Status:** Approved

---

## Problem

Sales orders and inventory are currently managed separately. Confirming or invoicing an order does not affect stock levels. The warehouse team must manually record a Stock Out after every sale, which is error-prone and easy to forget.

Additionally, when creating an order, staff have no visibility into whether the quantity they are entering is available in the warehouse.

---

## Goals

1. Show an inline warning on the order creation form when the quantity entered for a line item exceeds available stock.
2. Automatically create Stock Out transactions for every line item when an order is moved to INVOICED.

---

## Non-Goals

- Blocking order creation when stock is insufficient (warning only).
- Blocking invoice generation when stock is insufficient (auto-deduct and allow negative stock).
- Multi-warehouse selection per order (only one warehouse is in use).
- Reserving stock when an order is CONFIRMED (out of scope for this iteration).

---

## Transaction Type Values

The `transaction_type` column in `inventory_transactions` is a plain `text` column with no CHECK constraint. The authoritative values — as used by the existing inventory page server — are:

- `'STOCK_IN'`
- `'STOCK_OUT'`
- `'ADJUSTMENT'`

The schema file comment saying `'IN', 'OUT', 'ADJUSTMENT'` is stale and incorrect. All new code must use `STOCK_IN` / `STOCK_OUT` / `ADJUSTMENT`.

---

## Design

### 1. Stock warning at order creation

**Files changed:**
- `src/lib/server/pricing/engine.ts`
- `src/routes/dashboard/sales/orders/create/+page.svelte`

> Note: `src/routes/api/pricing/+server.ts` needs no code change. It already does `return json(pricing)`, so the new `availableStock` field on `PricingResult` will be included in the response automatically.

**How it works:**

The create order form already calls `POST /api/pricing` every time a product is selected or a quantity changes. We add `availableStock: number` to the `PricingResult` type and query the `inventory` table inside `calculateDynamicPrice` to populate it.

**Stock query:** Sum `quantity` across all warehouse rows for the given `productId`:
```sql
SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = $1
```
This gives the total available stock regardless of warehouse. Since there is currently only one active warehouse this is equivalent to a per-warehouse lookup. If a second warehouse is added later, the warning will show aggregate stock — this is acceptable for advisory purposes.

**N+1 note:** `calculateDynamicPrice` is called once per line item per user interaction (product select or quantity change). Adding one inventory query per call is acceptable at this scale. If this becomes a concern, a `prefetchedStock` parameter can be added later (following the existing `prefetchedTiers` pattern).

**Separation of concerns note:** Adding `availableStock` to `PricingResult` couples inventory state into a pricing type. This is a deliberate pragmatic decision — it avoids an extra API call by piggybacking on the existing pricing fetch. If the pricing engine is ever extracted into a separate service, `availableStock` should be moved to a separate response envelope.

**Client behaviour:** The Svelte component stores `availableStock` alongside each line item in state. The existing `priceRevision` guard already handles stale responses correctly. When `item.quantity > item.availableStock`, an inline warning is rendered on that row (e.g. `"Only 4 in stock"`). The warning is advisory — the Save Order button remains enabled.

---

### 2. Reusable inventory transaction function

**File:** `src/lib/server/inventory/recordTransaction.ts` *(new)*

To avoid duplicating logic between the manual inventory page and the invoice auto-deduction, the core transaction logic is extracted into a shared function:

```ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '$lib/server/db/schema';

type Tx = Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0];

export async function recordTransaction(tx: Tx, params: {
  productId: string
  warehouseId: string
  quantityChange: number   // negative for STOCK_OUT, positive for STOCK_IN
  transactionType: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'
  referenceDoc?: string
  notes?: string
  performedBy: string
  unitCost?: string        // STOCK_IN only, ignored otherwise
}): Promise<void>
```

This function contains the full upsert+transaction-insert logic currently in the inventory `transact` action. The existing `transact` action is refactored to call this function — its external behaviour is unchanged.

---

### 3. Auto stock deduction on invoice

**File:** `src/routes/dashboard/sales/orders/[id]/+page.server.ts`

When `updateStatus` receives `newStatus === 'INVOICED'`, the entire operation runs inside a `db.transaction()` wrapper:

```text
db.transaction(async (tx) => {
  1. Read current order status — if already INVOICED, skip deduction and return early (idempotency guard)
  2. Update order status to INVOICED
  3. Query order items — SELECT productId, quantity FROM sales_order_items WHERE order_id = $orderId
  4. Get first active warehouse — SELECT id FROM warehouses WHERE is_active = true LIMIT 1
  5. If no active warehouse found: log structured warning and skip deduction (status still updates)
  6. For each item:
     a. Coerce quantity: const qty = Math.round(Number(item.quantity))  // numeric column returns string
     b. Call recordTransaction(tx, { transactionType: 'STOCK_OUT', quantityChange: -qty, referenceDoc: order.orderNumber, ... })
})
```

**Key points:**

- **Idempotency guard (step 1):** The current order status is read inside the transaction before any writes. If the order is already `INVOICED`, the function returns early without creating duplicate Stock Out transactions.
- **Quantity coercion (step 6a):** `salesOrderItems.quantity` is a `numeric(10,2)` column — Drizzle returns it as a `string`. It must be coerced to an integer with `Math.round(Number(item.quantity))` before being passed to `recordTransaction`.
- **Negative stock allowed:** `recordTransaction` does not throw if stock goes below zero. The warning was already shown at order creation time.
- **No active warehouse (step 5):** If no warehouse exists, log a structured warning: `console.warn('[invoice:stock-deduction] skipped — no active warehouse found', { orderId, orderNumber })`. The status update still proceeds so the order is not stuck.
- **Rollback:** If any step inside the transaction throws, the entire transaction rolls back — the order stays at its previous status and no partial stock deductions are committed.

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/server/pricing/engine.ts` | Add `availableStock: number` to `PricingResult`; query inventory sum in `calculateDynamicPrice` |
| `src/routes/dashboard/sales/orders/create/+page.svelte` | Store `availableStock` per line item; render inline warning when quantity exceeds it |
| `src/lib/server/inventory/recordTransaction.ts` | **New file** — extracted reusable transaction function |
| `src/routes/dashboard/inventory/+page.server.ts` | Refactor `transact` action to call `recordTransaction` — no behaviour change |
| `src/routes/dashboard/sales/orders/[id]/+page.server.ts` | Wrap `updateStatus` in `db.transaction()`; add stock deduction logic on INVOICED transition |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Quantity > available stock at order creation | Inline warning shown on that line item; order can still be saved |
| Stock goes negative on invoice | Allowed — deduction proceeds without error |
| Order is already INVOICED when `updateStatus` is called again | Idempotency guard: deduction skipped, no duplicate transactions created |
| No active warehouse found at invoice time | Status updated to INVOICED; deduction skipped; structured warning logged |
| Database error during invoice transaction | Entire `db.transaction()` rolls back — order stays at previous status, no partial stock changes |

---

## Testing

- Order creation: inline warning appears when `quantity > availableStock`; no warning when `quantity ≤ availableStock`.
- Order creation: order saves successfully even with the warning shown.
- Invoice: `STOCK_OUT` transactions created for each line item with the correct negative `quantityChange` and the order number as `referenceDoc`.
- Invoice: stock levels in the warehouse decrease by the correct quantities.
- Invoice: calling Generate Invoice a second time (already INVOICED) does not create duplicate transactions.
- Invoice: stock at zero goes negative without error.
- Manual inventory `transact` action: behaviour unchanged after refactor.
