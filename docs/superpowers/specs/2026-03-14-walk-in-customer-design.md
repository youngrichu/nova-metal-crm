# Walk-In (Anonymous) Customer Sales Flow

**Date:** 2026-03-14
**Status:** Approved
**Branch:** feature/walk-in-customer

---

## Problem

The sales order creation flow currently requires selecting a registered CRM customer before a sale can be completed. Many real customers prefer not to share their information and just want to buy and leave. The system has no path for these walk-in transactions.

---

## Goals

1. Allow sales orders to be created without a CRM customer record.
2. Let the cashier optionally capture a phone number at time of sale (for future linking).
3. Let the cashier select the pricing tier for the walk-in customer (defaults to RETAIL).
4. When a new CRM customer is created with a matching phone number, surface past walk-in orders and offer to link them.

---

## Non-Goals

- Automatic customer detection or deduplication.
- Separate reporting views for walk-in vs registered sales (they appear together in all existing reports).
- Any changes to payment, invoice, or reconciliation flows.

---

## Approach

Option A: nullable `customerId` + walk-in fields on `salesOrders`. Walk-in orders have `customerId = NULL`. Two optional columns store the per-order overrides needed for pricing and future linking.

---

## Design

### 1. Database Schema

**Table: `sales_orders`**

| Change | Detail |
|--------|--------|
| `customer_id` | Remove `.notNull()` constraint — becomes nullable |
| `walk_in_phone` | New `text` column, nullable — optional phone captured at sale |
| `walk_in_pricing_tier` | New `text` column, nullable — tier used for this sale (`RETAIL` \| `WHOLESALE` \| `VIP` \| `PREFERRED`), defaults to `'RETAIL'` when null |

A Drizzle migration handles these changes. No other tables change.

---

### 2. Pricing Engine (`src/lib/server/pricing/engine.ts`)

`calculateDynamicPrice` gains an optional fourth parameter: `pricingTierOverride?: string`.

**Resolution order:**
1. If `orderId` is provided and a valid quote lock exists → use locked price (unchanged).
2. If `pricingTierOverride` is provided → use it directly, skip customer DB lookup.
3. If `customerId` is provided → look up customer's `pricingTier` from DB (unchanged).
4. Default → `'RETAIL'`.

The `/api/pricing` endpoint accepts an optional `pricingTier` field in its JSON body and forwards it as `pricingTierOverride` to the engine.

---

### 3. Create Order Form (`src/routes/dashboard/sales/orders/create/`)

**UI — Customer Details section**

A two-state toggle replaces the current single combobox:

- **Registered Customer** (default): existing combobox, no change.
- **Walk-In**: combobox replaced with:
  - Pricing tier selector (RETAIL / WHOLESALE / VIP / PREFERRED), default RETAIL.
  - Optional phone field: "Phone (optional — for future linking)".

**Submit button** disabled condition: `!(selectedCustomerId || isWalkIn)`.

**Live price preview**: when walk-in mode is active, `fetchAndUpdatePrice` sends `pricingTier` instead of `customerId` to `/api/pricing`. Prices update in real time when the cashier changes the tier.

**Server action** (`?/create`):
- Accepts `walkInPhone` and `walkInPricingTier` from form data when `customerId` is absent.
- Passes `pricingTierOverride` to `calculateDynamicPrice`.
- Inserts `walk_in_phone` and `walk_in_pricing_tier` into the new order row.
- Validation: either `customerId` OR `isWalkIn=true` must be present.

---

### 4. Promote Walk-In to Customer

**Trigger:** existing customer create form (`src/routes/dashboard/customers/create/`).

**Flow:**

1. Customer is created normally.
2. If phone was provided, server action queries:
   `SELECT id FROM sales_orders WHERE customer_id IS NULL AND walk_in_phone = ?`
3. If matches found → redirect to new customer's detail page with `?linkOrders=true`.
4. Customer detail page detects the param and renders a dismissible banner:
   *"N walk-in orders were found with this phone number. Link them to this customer?"*
   with **Link Orders** and **Dismiss** buttons.
5. On confirm → server action:
   `UPDATE sales_orders SET customer_id = ?, walk_in_phone = NULL, walk_in_pricing_tier = NULL WHERE id IN (...)`
6. Banner dismisses, orders now appear in the customer's ledger.

No new pages required.

---

## Error Handling

- If walk-in mode is submitted without selecting a tier, server defaults to `'RETAIL'`.
- If the phone match query fails (DB error), the customer is still created successfully; the linking banner is simply not shown (non-blocking).
- All existing validation for items (at least one valid item, quantity > 0) remains unchanged.

---

## Testing Considerations

- Unit test: `calculateDynamicPrice` with `pricingTierOverride` set, `customerId` null — verify correct tier is applied.
- Integration test: create walk-in order → create customer with same phone → verify linking banner appears → confirm link → verify orders appear in customer ledger.
- Edge case: walk-in order with no phone → create customer with any phone → no banner shown.
- Edge case: two customers created with same phone → only unlinked walk-in orders surfaced (already linked orders have `customerId` set).
