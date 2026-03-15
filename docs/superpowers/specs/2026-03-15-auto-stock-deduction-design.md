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

## Design

### 1. Stock warning at order creation

**Where:** `src/routes/dashboard/sales/orders/create/+page.svelte` + `src/routes/api/pricing/+server.ts` + `src/lib/server/pricing/engine.ts`

**How it works:**

The create order form already calls `POST /api/pricing` every time a product is selected or a quantity changes. We extend the pricing API response to include `availableStock` — the total quantity of that product currently in stock across all warehouses.

The client compares the entered quantity against `availableStock`. If `quantity > availableStock`, an inline warning is shown on that line item (e.g. "Only 4 in stock"). The warning is advisory — the order can still be saved.

**Changes:**
- `PricingResult` type gains an `availableStock: number` field.
- `calculateDynamicPrice` queries the `inventory` table to sum stock for the product and returns it in the result.
- The create order Svelte component renders a warning badge on any line item where `item.quantity > item.availableStock`.

---

### 2. Auto stock deduction on invoice

**Where:** `src/routes/dashboard/sales/orders/[id]/+page.server.ts` + new `src/lib/server/inventory/recordTransaction.ts`

**How it works:**

When the `updateStatus` action receives `newStatus === 'INVOICED'`, after updating the order status it automatically creates a `STOCK_OUT` inventory transaction for each line item on the order.

**Reusable transaction function:**

To avoid duplicating logic, the inventory transaction code is extracted from the manual inventory page into a shared function:

```
src/lib/server/inventory/recordTransaction.ts
```

```ts
recordTransaction(tx: DrizzleTransaction, params: {
  productId: string
  warehouseId: string
  quantityChange: number   // negative for STOCK_OUT
  transactionType: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'
  referenceDoc?: string
  notes?: string
  performedBy: string
  unitCost?: string        // STOCK_IN only
}): Promise<void>
```

This function is called by:
- The existing manual inventory `transact` action (refactored to use it)
- The new invoice auto-deduction logic

**Invoice deduction flow:**

All of the following runs inside a single database transaction:

1. Update order status to `INVOICED`
2. Fetch all line items for the order
3. Fetch the first active warehouse (`SELECT * FROM warehouses WHERE is_active = true LIMIT 1`)
4. For each line item, call `recordTransaction` with:
   - `transactionType: 'STOCK_OUT'`
   - `quantityChange: -(item.quantity)` (negative)
   - `referenceDoc: order.orderNumber` (e.g. `SO-2026-0001`)
   - `performedBy: sessionUser.id`
5. Negative stock is allowed — no error is thrown if stock goes below zero.

If no active warehouse exists, the status update still proceeds but stock deduction is skipped (logged as a warning).

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/server/pricing/engine.ts` | Add `availableStock` to `PricingResult`; query inventory in `calculateDynamicPrice` |
| `src/routes/api/pricing/+server.ts` | No change needed (passes through engine result) |
| `src/routes/dashboard/sales/orders/create/+page.svelte` | Show inline warning when `quantity > availableStock` |
| `src/lib/server/inventory/recordTransaction.ts` | New file — extracted reusable transaction function |
| `src/routes/dashboard/inventory/+page.server.ts` | Refactor `transact` action to use `recordTransaction` |
| `src/routes/dashboard/sales/orders/[id]/+page.server.ts` | Extend `updateStatus` to auto-deduct on INVOICED |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Quantity > available stock at order creation | Inline warning shown, order can still be saved |
| Stock goes negative on invoice | Allowed — stock deductions proceed, no error |
| No active warehouse found at invoice time | Status updated to INVOICED, stock deduction skipped silently |
| Database error during invoice transaction | Entire transaction rolls back — order stays at previous status |

---

## Testing

- Order creation: warning appears when quantity > stock; no warning when quantity ≤ stock.
- Order creation: order saves successfully even with the warning shown.
- Invoice: Stock Out transactions are created for each line item with the order number as Ref Document.
- Invoice: stock levels decrease correctly after invoicing.
- Invoice: if stock is already zero, it goes negative without error.
- Manual inventory `transact` action continues to work correctly after refactor.
