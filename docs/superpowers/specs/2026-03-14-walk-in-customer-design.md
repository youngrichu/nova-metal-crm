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
- Changing any customer's CRM `pricingTier` during the link step.

---

## Approach

Option A: nullable `customerId` + walk-in fields on `salesOrders`. Walk-in orders have `customerId = NULL`. Two optional columns store the per-order overrides needed for pricing and future linking.

---

## Tier Enum Clarification

The codebase has two separate tier enumerations that must not be confused:

| Context | Values | Used for |
|---------|--------|----------|
| Pricing engine / `walk_in_pricing_tier` | `RETAIL`, `WHOLESALE`, `VIP`, `PREFERRED` | Computing markup at time of sale |
| CRM customer `pricingTier` (Zod schema) | `STANDARD`, `PREFERRED`, `VIP` | Customer classification in CRM |

`walk_in_pricing_tier` maps to the **pricing engine values** only. The link step (promoting walk-in to customer) does NOT copy or change the customer's CRM `pricingTier` — it only sets `customerId` on the historical orders. The original computed prices are preserved as-is.

---

## Design

### 1. Database Schema

**Table: `sales_orders`** — two structural changes and two new columns:

| Change | Detail |
|--------|--------|
| `customer_id` | Remove `.notNull()` — becomes nullable. Existing rows unaffected. |
| `walk_in_phone` | New `text` column, nullable. Optional phone captured at time of walk-in sale. |
| `walk_in_pricing_tier` | New `text` column, nullable. Pricing engine tier used for this sale (`RETAIL` \| `WHOLESALE` \| `VIP` \| `PREFERRED`). Always written explicitly by the application — `NULL` is not used as a sentinel for RETAIL. |

A Drizzle migration handles these changes. No other tables change.

**Column constraint:** `walk_in_pricing_tier` has no DB-level CHECK constraint in this implementation — validation is application-only. The pricing engine silently falls back to RETAIL for unrecognised values (existing behaviour), so a corrupt value degrades gracefully. A CHECK constraint can be added as a future hardening step.

**Index note:** `walk_in_phone` will be queried in the promote flow (`WHERE customerId IS NULL AND walk_in_phone = ?`). At current business scale no additional index is needed; add one if walk-in volume grows large.

---

### 2. Pricing Engine (`src/lib/server/pricing/engine.ts`)

**Updated signature:**

```ts
calculateDynamicPrice(
  productId: string,
  customerId: string | null,
  quantity: number = 1,
  orderId?: string,
  pricingTierOverride?: string   // ← new, 5th parameter
): Promise<PricingResult>
```

**Resolution order (unchanged for existing callers):**

1. If `orderId` is provided and a valid quote lock exists → use locked price.
2. If `pricingTierOverride` is provided → use it directly, skip customer DB lookup.
3. If `customerId` is provided → look up customer's `pricingTier` from DB.
4. Default → `'RETAIL'`.

Walk-in orders may have `validUntil` set (i.e., they can be quotes). The lock-in check (step 1) fires first; if no lock exists, the tier override (step 2) applies. This is consistent with existing behavior.

If an unrecognised tier string is passed as `pricingTierOverride`, `computePrice` silently falls back to RETAIL (existing behavior in engine, intentional).

**`/api/pricing` endpoint:** accepts an optional `pricingTier: string` field in its JSON body. The suppression rule is enforced at the **endpoint layer**: if `customerId` is non-null in the request, the endpoint passes `customerId` to the engine and does NOT forward `pricingTierOverride`, regardless of whether `pricingTier` was also present in the body. If `customerId` is null or absent, the endpoint passes `pricingTierOverride`. Sending both fields simultaneously is valid (no 400); `customerId` silently wins. This is intentional.

---

### 3. Create Order Form (`src/routes/dashboard/sales/orders/create/`)

**UI — Customer Details section**

A two-state toggle:

- **Registered Customer** (default): existing combobox, no change.
- **Walk-In**: combobox hidden, replaced with:
  - Pricing tier selector (RETAIL / WHOLESALE / VIP / PREFERRED), **default RETAIL**.
  - Optional phone field labeled: *"Phone (optional — for future linking)"*.

**State rule:** the previously selected customer is preserved in a separate `savedCustomerId` reactive variable. Switching to Walk-In mode sets `selectedCustomerId = ''` but retains `savedCustomerId`. Switching back restores `selectedCustomerId = savedCustomerId` and clears `walkInPhone` and resets tier to RETAIL. This prevents both fields from being submitted simultaneously while allowing the cashier to toggle back without re-searching.

**Submit button** disabled condition: `!(selectedCustomerId || isWalkIn)`.

**Live price preview:** when walk-in mode is active, `fetchAndUpdatePrice` sends `pricingTier` (the selected tier) to `/api/pricing` instead of `customerId`. Prices update in real time when the cashier changes the tier.

**Server action (`?/create`):**

- Accepts `walkInPhone` (optional) and `walkInPricingTier` (required when no `customerId`) from form data.
- Validation: either `customerId` OR `isWalkIn=true` must be present — not both, not neither.
- If `isWalkIn=true` and no `walkInPricingTier` submitted, server defaults to `'RETAIL'` and always writes it explicitly (never writes NULL).
- Passes `pricingTierOverride: walkInPricingTier` to `calculateDynamicPrice` when `customerId` is null.
- Inserts `walk_in_phone` and `walk_in_pricing_tier` into the new order row.

**Order list & detail UI:** Walk-in orders display `"Walk-In"` (or `"Walk-In · {phone}"` if phone was captured) in place of a customer name wherever a customer name would otherwise appear.

---

### 4. Promote Walk-In to Customer

**Trigger:** the `create` action in `src/routes/dashboard/customers/+page.server.ts`.

**Flow:**

1. Customer is created via the existing `?/create` action. The `db.insert(customers).values(...)` call must use `.returning({ id: customers.id })` to capture the new customer's ID.
2. If a `phone` was provided, the server action queries:
   `SELECT id FROM sales_orders WHERE customer_id IS NULL AND walk_in_phone = phone`
3. Matching order IDs (if any) are returned in the action response: `{ success: true, customerId, walkInOrderIds: [...] }`.
4. The Svelte page's `enhance` handler detects `walkInOrderIds.length > 0` and navigates to:
   `/dashboard/customers/[customerId]?linkOrders=true`
5. The customer detail page (`src/routes/dashboard/customers/[id]/+page.server.ts`) `load` function detects `url.searchParams.has('linkOrders')` — the walk-in query is **only run when this param is present**, not on every load. If present, it queries `salesOrders WHERE customerId IS NULL AND walkInPhone = customer.phone` and returns the matches as `pendingWalkInOrders`.
6. The detail page renders a dismissible banner when `pendingWalkInOrders.length > 0`:
   *"N walk-in orders were found with this phone number. Link them to this customer?"*
   with **Link Orders** and **Dismiss** buttons.
7. On confirm → a `linkOrders` action defined in `src/routes/dashboard/customers/[id]/+page.server.ts` runs:
   `UPDATE sales_orders SET customer_id = newCustomerId, walk_in_phone = NULL, walk_in_pricing_tier = NULL WHERE id IN (matchedIds) AND customer_id IS NULL`
   The `AND customer_id IS NULL` guard prevents a race condition where another customer was linked between the query and the update.
8. Page reloads (without `?linkOrders=true`); orders now appear in the customer's ledger. Original computed prices and totals are preserved — they are not recalculated against the customer's CRM tier.
9. If no walk-in orders are found (step 2), or if the phone match query fails (DB error), the customer is created successfully and the redirect goes to the normal customer detail page without the banner (non-blocking).

**Edge case — same phone, two customers:** If Customer A was already linked to all walk-in orders for phone X, and Customer B is later created with the same phone, the query in step 2 returns zero rows (all orders already have `customer_id` set), so no banner appears. This is correct behaviour.

---

## Error Handling

- Walk-in submitted without tier → server writes `'RETAIL'` explicitly.
- Walk-in submitted with both `customerId` and `walkInPricingTier` → server treats as registered customer, ignores walk-in fields.
- Phone match query failure on customer create → customer still created, redirect goes to plain detail page, no banner.
- `linkOrders` action DB failure → return error to UI, orders remain unlinked (user can retry by revisiting the customer detail page with `?linkOrders=true`).
- All existing item validation (≥1 item, quantity > 0) unchanged.

---

## Testing Considerations

- **Unit:** `calculateDynamicPrice` with `pricingTierOverride: 'WHOLESALE'`, `customerId: null` — verify WHOLESALE markup applied.
- **Unit:** `calculateDynamicPrice` with unknown tier override — verify RETAIL fallback.
- **Integration:** create walk-in order with phone → create customer with same phone → verify banner appears → confirm link → verify orders appear in customer ledger with original prices intact.
- **Edge:** walk-in order with no phone → create customer with any phone → no banner shown.
- **Edge:** walk-in order linked to Customer A → create Customer B with same phone → no banner shown.
- **Edge:** toggle Registered → Walk-In → back to Registered on create form → verify `selectedCustomerId` is restored, walk-in fields cleared.
