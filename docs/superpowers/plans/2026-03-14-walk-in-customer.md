# Walk-In Customer Sales Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow sales orders to be completed without a registered CRM customer, with optional phone capture and a promote-to-customer linking flow.

**Architecture:** Make `customerId` nullable on `salesOrders`, add `walkInPhone` and `walkInPricingTier` columns, pass a `pricingTierOverride` through the pricing engine, add a two-mode toggle to the create order form, and wire up a banner on the customer detail page to link past walk-in orders when a matching phone is found on customer creation.

**Tech Stack:** SvelteKit, Drizzle ORM, PostgreSQL, Vitest, TypeScript, TailwindCSS, shadcn-svelte

**Spec:** `docs/superpowers/specs/2026-03-14-walk-in-customer-design.md`

---

## File Map

| File | Change |
|------|--------|
| `src/lib/server/db/schema/sales.ts` | Remove `.notNull()` from `customerId`; add `walkInPhone`, `walkInPricingTier` columns |
| `src/lib/server/db/migrations/0007_<auto_name>.sql` | New migration (auto-named by drizzle-kit): drop NOT NULL, add two columns |
| `src/lib/server/pricing/engine.ts` | Add `pricingTierOverride?: string` as 5th param to `calculateDynamicPrice` |
| `src/lib/server/pricing/engine.test.ts` | Add tests for `pricingTierOverride` behaviour |
| `src/routes/api/pricing/+server.ts` | Accept optional `pricingTier` in body; apply customerId-wins rule at endpoint layer |
| `src/routes/dashboard/sales/orders/create/+page.server.ts` | Handle walk-in path: accept `walkInPhone`/`walkInPricingTier`, pass tier override to engine |
| `src/routes/dashboard/sales/orders/create/+page.svelte` | Add Registered/Walk-In toggle; walk-in tier selector + optional phone field; `savedCustomerId` pattern |
| `src/routes/dashboard/sales/orders/+page.svelte` | Show "Walk-In" when `order.customer` is null |
| `src/routes/dashboard/sales/orders/[id]/+page.server.ts` | Expose `walkInPhone` and `walkInPricingTier` from `salesOrders` select |
| `src/routes/dashboard/sales/orders/[id]/+page.svelte` | Show walk-in badge in customer section when `order.customer` is null |
| `src/routes/dashboard/customers/+page.server.ts` | Update `?/create` action: use `.returning()`, query unlinked walk-in orders by phone, return `walkInOrderIds` |
| `src/routes/dashboard/customers/[id]/+page.server.ts` | Add `pendingWalkInOrders` to `load` (gated on `?linkOrders`); add `linkOrders` action |
| `src/routes/dashboard/customers/[id]/+page.svelte` | Add dismissible link-orders banner |

---

## Chunk 1: Database Schema, Migration, and Pricing Engine

### Task 1: Update the Drizzle schema

**Files:**
- Modify: `src/lib/server/db/schema/sales.ts`

- [ ] **Step 1: Edit the schema**

In `src/lib/server/db/schema/sales.ts`, make these three changes to `salesOrders`:

```ts
// BEFORE (line 25):
customerId: uuid('customer_id').notNull().references(() => customers.id),

// AFTER:
customerId: uuid('customer_id').references(() => customers.id),
```

Add after `discountAmount` (before `createdBy`):

```ts
walkInPhone: text('walk_in_phone'),
walkInPricingTier: text('walk_in_pricing_tier'),
```

Note: PostgreSQL always appends new columns to the physical end of the table regardless of position in the TypeScript schema file — the ordering here is just for readability.

- [ ] **Step 2: Generate the migration**

```bash
DATABASE_URL=<your-dev-db-url> npx drizzle-kit generate
```

Drizzle-kit will auto-generate the next migration file (currently `0005` and `0006` exist, so this produces `0007_<auto_name>.sql`). **Do not rename the file** — Drizzle stores the filename in `src/lib/server/db/migrations/meta/_journal.json`, and renaming without updating the journal will break `drizzle-kit migrate`.

- [ ] **Step 3: Apply the migration**

```bash
DATABASE_URL=<your-dev-db-url> npx drizzle-kit migrate
```

Expected: migration completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/db/schema/sales.ts src/lib/server/db/migrations/
git commit -m "feat: make salesOrders.customerId nullable, add walkInPhone and walkInPricingTier columns"
```

---

### Task 2: Add `pricingTierOverride` to the pricing engine

**Files:**
- Modify: `src/lib/server/pricing/engine.ts`
- Modify: `src/lib/server/pricing/engine.test.ts`

- [ ] **Step 1: Write failing tests for `calculateDynamicPrice` with `pricingTierOverride`**

`calculateDynamicPrice` hits the DB (product lookup + system settings). Mock those calls with `vi.mock` so the test stays a pure unit test. Add the following to `src/lib/server/pricing/engine.test.ts` — place the mock block at the top of the file, then add the new `describe` at the bottom:

```ts
// At the top of the file, after imports, add:
import { vi } from 'vitest';
import { calculateDynamicPrice } from './engine';

// Mock the DB module — must be placed before any test that calls calculateDynamicPrice
vi.mock('$lib/server/db', () => ({
    db: {
        query: {
            products: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 'test-product-id',
                    averageLandingCost: '100.00'
                })
            },
            salesOrders: {
                findFirst: vi.fn().mockResolvedValue(null) // no quote lock-in
            }
        },
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]) // no system settings overrides → use hardcoded defaults
            })
        })
    }
}));
```

```ts
// At the bottom of the file, add:
describe('calculateDynamicPrice with pricingTierOverride', () => {
    it('applies WHOLESALE markup when pricingTierOverride is WHOLESALE and customerId is null', async () => {
        const result = await calculateDynamicPrice('test-product-id', null, 1, undefined, 'WHOLESALE');
        expect(result.unitPriceBeforeDiscount).toBe(105); // 100 * 1.05
        expect(result.finalUnitPrice).toBe(105);
    });

    it('falls back to RETAIL when an unknown override is passed', async () => {
        const result = await calculateDynamicPrice('test-product-id', null, 1, undefined, 'GARBAGE_TIER');
        expect(result.unitPriceBeforeDiscount).toBe(115); // 100 * 1.15 (RETAIL)
    });
});
```

- [ ] **Step 2: Run the tests and confirm they FAIL (function signature not yet changed)**

```bash
npm run test:unit
```

Expected: the two new tests fail with a TypeScript error or the override has no effect (RETAIL returned for WHOLESALE). This confirms the tests are correctly sensitive to the change.

- [ ] **Step 3: Update `calculateDynamicPrice` signature to accept `pricingTierOverride`**

In `src/lib/server/pricing/engine.ts`, change the function signature and resolution logic:

```ts
// BEFORE:
export async function calculateDynamicPrice(
    productId: string,
    customerId: string | null,
    quantity: number = 1,
    orderId?: string
): Promise<PricingResult> {

// AFTER:
export async function calculateDynamicPrice(
    productId: string,
    customerId: string | null,
    quantity: number = 1,
    orderId?: string,
    pricingTierOverride?: string
): Promise<PricingResult> {
```

Then update the tier resolution section (currently at line 112–122). Replace:

```ts
    // 3. Fetch Customer Tier
    let pricingTier = "RETAIL";
    if (customerId) {
        const customer = await db.query.customers.findFirst({
            where: eq(customers.id, customerId)
        });

        if (customer && customer.pricingTier) {
            pricingTier = customer.pricingTier;
        }
    }
```

With:

```ts
    // 3. Resolve Pricing Tier
    // Full resolution order (steps 1–2 already handled above by the quote lock-in block):
    //   1. Quote lock-in (handled above — returns early if locked)
    //   2. pricingTierOverride provided → use it directly
    //   3. customerId provided → look up customer tier from DB
    //   4. Default → RETAIL
    let pricingTier = "RETAIL";
    if (pricingTierOverride) {
        pricingTier = pricingTierOverride;
    } else if (customerId) {
        const customer = await db.query.customers.findFirst({
            where: eq(customers.id, customerId)
        });

        if (customer && customer.pricingTier) {
            pricingTier = customer.pricingTier;
        }
    }
```

- [ ] **Step 4: Run tests to verify nothing broke**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/pricing/engine.ts src/lib/server/pricing/engine.test.ts
git commit -m "feat: add pricingTierOverride param to calculateDynamicPrice"
```

---

### Task 3: Update `/api/pricing` endpoint

**Files:**
- Modify: `src/routes/api/pricing/+server.ts`

- [ ] **Step 1: Update the endpoint to accept `pricingTier` and apply the suppression rule**

Replace the entire file content:

```ts
import { json } from '@sveltejs/kit';
import { calculateDynamicPrice } from '$lib/server/pricing/engine';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { productId, customerId, quantity, pricingTier } = await request.json();

        if (!productId) {
            return json({ error: 'Missing productId' }, { status: 400 });
        }

        // Suppression rule: if customerId is present, it wins — never forward pricingTierOverride.
        // customerId || null guards against empty-string values (treated same as absent)
        const effectiveCustomerId = customerId || null;
        const tierOverride = effectiveCustomerId ? undefined : (pricingTier ?? undefined);

        const pricing = await calculateDynamicPrice(productId, effectiveCustomerId, quantity || 1, undefined, tierOverride);
        return json(pricing);
    } catch (error: any) {
        return json({ error: error.message || 'Failed to calculate price' }, { status: 500 });
    }
};
```

- [ ] **Step 2: Run the dev server and verify the three suppression-rule cases**

```bash
npm run dev
```

Test all three cases with a valid `productId` from the DB:

1. **customerId only** — `{ productId, customerId: "<valid-id>", quantity: 1 }` → 200, price reflects customer's CRM tier
2. **pricingTier only (walk-in)** — `{ productId, pricingTier: "WHOLESALE", quantity: 1 }` → 200, price reflects WHOLESALE markup (105% of landing cost)
3. **Both fields** — `{ productId, customerId: "<valid-id>", pricingTier: "WHOLESALE", quantity: 1 }` → 200, price reflects customer's CRM tier (customerId wins, WHOLESALE ignored)

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/pricing/+server.ts
git commit -m "feat: accept pricingTier in /api/pricing, customerId takes precedence"
```

---

## Chunk 2: Create Order Form — Server and UI

> **Prerequisite:** Chunk 1 (Tasks 1–3) must be fully committed and `npm run check` must pass before starting Task 4. The schema changes (`walkInPhone`, `walkInPricingTier` columns, nullable `customerId`) and the updated engine/API endpoint are all required for this chunk to compile.

### Task 4: Update the create order server action for walk-in support

**Files:**
- Modify: `src/routes/dashboard/sales/orders/create/+page.server.ts`

- [ ] **Step 1: Update the `create` action to handle walk-in path**

Replace the action logic in `+page.server.ts`. The key changes are:
1. Accept `walkInPhone` and `walkInPricingTier` from form data.
2. Validate: either `customerId` OR `isWalkIn=true` must be present.
3. Pass `walkInPricingTier` as `pricingTierOverride` to the engine.
4. Write `walkInPhone` and `walkInPricingTier` to the new order row.

```ts
export const actions: Actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) {
            throw error(401, "Unauthorized");
        }

        try {
            const formData = await request.formData();
            const customerId = formData.get("customerId")?.toString() || null;
            const isWalkIn = formData.get("isWalkIn") === "true";
            const walkInPhone = formData.get("walkInPhone")?.toString() || null;
            const walkInPricingTier = formData.get("walkInPricingTier")?.toString() || null;
            const itemsJson = formData.get("items")?.toString();

            // Validation: need either a customer or walk-in mode
            if (!customerId && !isWalkIn) {
                return { error: "Please select a customer or use walk-in mode" };
            }

            if (!itemsJson) {
                return { error: "Missing required fields" };
            }

            const items = JSON.parse(itemsJson);
            if (!items || items.length === 0) {
                return { error: "Order must have at least one valid item" };
            }

            // Resolve the effective pricing tier override for walk-in orders.
            // If customerId is present, the engine will look up the customer tier — no override needed.
            const tierOverride = customerId ? undefined : (walkInPricingTier || 'RETAIL');

            const orderCount = await db.$count(salesOrders);
            const orderNumber = `SO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

            let subtotal = 0;
            let orderDiscountAmount = 0;

            const { calculateDynamicPrice } = await import('$lib/server/pricing/engine');

            const orderItemsData: any[] = [];
            for (const item of items) {
                const quantity = Number(item.quantity) || 0;
                if (quantity <= 0) continue;

                const pricing = await calculateDynamicPrice(
                    item.productId,
                    customerId,
                    quantity,
                    undefined,
                    tierOverride
                );

                subtotal += pricing.lineTotal;
                const itemTotalWithoutDiscount = pricing.unitPriceBeforeDiscount * quantity;
                orderDiscountAmount += (itemTotalWithoutDiscount - pricing.lineTotal);

                orderItemsData.push({
                    productId: item.productId,
                    quantity: quantity.toString(),
                    unitPrice: pricing.unitPriceBeforeDiscount.toString(),
                    discountPercent: pricing.discountPercent.toString(),
                    lineTotal: pricing.lineTotal.toString(),
                });
            }

            const taxAmount = subtotal * 0.15;
            const totalAmount = subtotal + taxAmount;

            let newOrderId = "";

            await db.transaction(async (tx) => {
                const [order] = await tx.insert(salesOrders).values({
                    orderNumber,
                    customerId: customerId || null,
                    walkInPhone: isWalkIn ? (walkInPhone || null) : null,
                    walkInPricingTier: isWalkIn ? (walkInPricingTier || 'RETAIL') : null,
                    status: 'DRAFT',
                    subtotal: subtotal.toString(),
                    taxAmount: taxAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    discountAmount: orderDiscountAmount.toString(),
                    createdBy: user.id
                }).returning({ id: salesOrders.id });

                newOrderId = order.id;

                const insertItems = orderItemsData.map((item: any) => ({
                    orderId: newOrderId,
                    ...item
                }));

                await tx.insert(salesOrderItems).values(insertItems);
            });

            return { success: true, orderId: newOrderId };

        } catch (err) {
            console.error("Order creation error:", err);
            return { error: "An unexpected error occurred during order creation." };
        }
    }
};
```

- [ ] **Step 2: Run a TypeScript check**

```bash
npm run check
```

Expected: no type errors on the changed file. If Drizzle complains about `walkInPhone`/`walkInPricingTier` not existing on the schema, the migration from Task 1 must be applied first and the schema file must be saved — Drizzle infers types from the schema object, not the DB directly.

- [ ] **Step 3: Commit**

```bash
git add src/routes/dashboard/sales/orders/create/+page.server.ts
git commit -m "feat: walk-in order creation — server action accepts walk-in path"
```

---

### Task 5: Walk-in toggle UI on the create order form

**Files:**
- Modify: `src/routes/dashboard/sales/orders/create/+page.svelte`

- [ ] **Step 1: Add walk-in state variables to the script block**

In the `<script lang="ts">` block, after the existing state variables, add:

```ts
// Walk-in mode state
let isWalkIn = $state(false);
let savedCustomerId = $state(''); // preserves selection when toggling to walk-in and back
let walkInPricingTier = $state('RETAIL');
let walkInPhone = $state('');

// NOTE: these are PRICING ENGINE tiers, not CRM customer tiers (STANDARD/PREFERRED/VIP).
// Do NOT "normalise" this to match the CRM enum — they serve different purposes.
const WALK_IN_TIERS = ['RETAIL', 'WHOLESALE', 'VIP', 'PREFERRED'] as const;

function switchToWalkIn() {
    savedCustomerId = selectedCustomerId;
    selectedCustomerId = '';
    isWalkIn = true;
}

function switchToRegistered() {
    selectedCustomerId = savedCustomerId;
    walkInPhone = '';
    walkInPricingTier = 'RETAIL';
    isWalkIn = false;
}
```

- [ ] **Step 2: Update `fetchAndUpdatePrice` to pass pricingTier for walk-in**

Replace:

```ts
async function fetchAndUpdatePrice(index: number, productId: string, quantity: number, customerId: string) {
    if (!productId) return;
    try {
        const res = await fetch('/api/pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, customerId, quantity })
        });
```

With:

```ts
async function fetchAndUpdatePrice(index: number, productId: string, quantity: number, customerId: string) {
    if (!productId) return;
    try {
        const body: Record<string, unknown> = { productId, quantity };
        if (customerId) {
            body.customerId = customerId;
        } else if (isWalkIn) {
            body.pricingTier = walkInPricingTier;
        }
        const res = await fetch('/api/pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
```

- [ ] **Step 3: Update the $effect so walk-in tier changes also re-fetch prices**

Replace the existing effect:

```ts
$effect(() => {
    // When customer changes, recalculate all prices
    if (selectedCustomerId) {
        items.forEach((item, index) => {
            if (item.productId) {
                fetchAndUpdatePrice(index, item.productId, item.quantity, selectedCustomerId);
            }
        });
    }
});
```

With:

```ts
$effect(() => {
    // Recalculate when registered customer changes
    if (selectedCustomerId) {
        items.forEach((item, index) => {
            if (item.productId) {
                fetchAndUpdatePrice(index, item.productId, item.quantity, selectedCustomerId);
            }
        });
    }
});

$effect(() => {
    // Recalculate when walk-in tier changes
    if (isWalkIn) {
        // Reading walkInPricingTier forces Svelte to track it as a reactive dependency.
        // Do NOT remove this line — without it, tier changes won't trigger price re-fetches.
        const _trackTier = walkInPricingTier;
        items.forEach((item, index) => {
            if (item.productId) {
                fetchAndUpdatePrice(index, item.productId, item.quantity, '');
            }
        });
    }
});
```

- [ ] **Step 4: Replace the Customer Details section in the template**

Find the existing `<section>` with "Customer Details" (starts around line 134). Replace it entirely with:

```svelte
<!-- Section 1: Customer Info -->
<section class="bg-card border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] p-6 md:p-8 relative">
    <h2 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-4 mb-6 flex items-center gap-2">
        <User class="w-4 h-4" /> Customer Details
    </h2>

    <!-- Mode toggle -->
    <div class="flex gap-0 mb-6 border-2 border-border w-fit">
        <button
            type="button"
            onclick={switchToRegistered}
            class={cn(
                "px-5 py-2 text-xs font-bold tracking-widest uppercase transition-colors",
                !isWalkIn
                    ? "bg-foreground text-background"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
        >
            Registered
        </button>
        <button
            type="button"
            onclick={switchToWalkIn}
            class={cn(
                "px-5 py-2 text-xs font-bold tracking-widest uppercase transition-colors",
                isWalkIn
                    ? "bg-foreground text-background"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
        >
            Walk-In
        </button>
    </div>

    {#if !isWalkIn}
        <!-- Registered customer combobox (unchanged) -->
        <div class="space-y-2 group">
            <Label for="customerId" class="text-xs font-bold tracking-wider uppercase text-foreground/70 mb-2 block">Select Customer</Label>
            <input type="hidden" name="customerId" value={selectedCustomerId} />
            <Popover.Root bind:open={customerOpen}>
                <Popover.Trigger
                    class={cn(
                        buttonVariants({ variant: "outline" }),
                        "flex h-14 w-full md:w-[400px] justify-between rounded-none border-b-2 border-border/50 border-t-0 border-x-0 bg-muted/20 px-4 text-base font-bold focus:bg-transparent focus:border-primary transition-colors hover:bg-muted/30",
                        !selectedCustomerId && "text-muted-foreground"
                    )}
                    role="combobox"
                    aria-expanded={customerOpen}
                >
                    <span class="truncate block w-[90%] text-left">
                        {getCustomerLabel(selectedCustomerId)}
                    </span>
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Popover.Trigger>
                <Popover.Content class="w-[350px] md:w-[400px] p-0 rounded-none border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] bg-card" align="start">
                    <Command.Root>
                        <Command.Input placeholder="Search customers..." class="h-12 border-none font-medium" />
                        <Command.List>
                            <Command.Empty>No customer found.</Command.Empty>
                            <Command.Group>
                                {#each data.customers as customer}
                                    <Command.Item
                                        value={customer.name + " " + (customer.companyName || '')}
                                        onSelect={() => {
                                            selectedCustomerId = customer.id;
                                            customerOpen = false;
                                        }}
                                        class="cursor-pointer py-3"
                                    >
                                        <Check
                                            class={cn(
                                                "mr-2 h-4 w-4",
                                                selectedCustomerId === customer.id ? "opacity-100 text-primary" : "opacity-0"
                                            )}
                                        />
                                        <div class="flex flex-col truncate w-full">
                                            <span class="font-bold truncate">{customer.name}</span>
                                            {#if customer.companyName}
                                                <span class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground truncate">{customer.companyName}</span>
                                            {/if}
                                        </div>
                                    </Command.Item>
                                {/each}
                            </Command.Group>
                        </Command.List>
                    </Command.Root>
                </Popover.Content>
            </Popover.Root>
        </div>
    {:else}
        <!-- Walk-in mode fields -->
        <input type="hidden" name="isWalkIn" value="true" />
        <div class="flex flex-col md:flex-row gap-6">
            <!-- Tier selector -->
            <div class="space-y-2">
                <Label class="text-xs font-bold tracking-wider uppercase text-foreground/70 block">Pricing Tier</Label>
                <input type="hidden" name="walkInPricingTier" value={walkInPricingTier} />
                <div class="flex gap-0 border-2 border-border w-fit">
                    {#each WALK_IN_TIERS as tier}
                        <button
                            type="button"
                            onclick={() => { walkInPricingTier = tier; }}
                            class={cn(
                                "px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors border-r last:border-r-0 border-border",
                                walkInPricingTier === tier
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tier}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Optional phone -->
            <div class="space-y-2 flex-1 max-w-xs">
                <Label class="text-xs font-bold tracking-wider uppercase text-foreground/70 block">
                    Phone <span class="text-muted-foreground/50 normal-case font-normal">(optional — for future linking)</span>
                </Label>
                <Input
                    type="tel"
                    name="walkInPhone"
                    bind:value={walkInPhone}
                    placeholder="+251 9XX XXX XXXX"
                    class="h-14 border-t-0 border-x-0 border-b-2 border-border/50 rounded-none bg-muted/20 px-4 font-bold focus-visible:border-primary focus-visible:ring-0"
                />
            </div>
        </div>
    {/if}
</section>
```

- [ ] **Step 5: Update the submit button's disabled condition**

Find the submit Button (near the end of the file):

```svelte
<Button type="submit" disabled={isSubmitting || items.length === 0 || !selectedCustomerId}
```

Change to:

```svelte
<Button type="submit" disabled={isSubmitting || items.length === 0 || (!selectedCustomerId && !isWalkIn)}
```

- [ ] **Step 6: Run TypeScript check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 7: Manual smoke test**

1. Open `/dashboard/sales/orders/create`
2. Toggle to Walk-In — verify combobox disappears, tier buttons and phone field appear
3. Toggle back to Registered — verify combobox reappears, customer selection is restored
4. In Walk-In mode, add a product — verify price loads and updates when tier changes
5. Submit a walk-in order — verify redirect to the new order detail page

- [ ] **Step 8: Commit**

```bash
git add src/routes/dashboard/sales/orders/create/+page.svelte
git commit -m "feat: walk-in toggle UI on create order form"
```

---

## Chunk 3: Walk-In Display + Promote-to-Customer Flow

### Task 6: Display "Walk-In" label in order list and order detail

**Files:**
- Modify: `src/routes/dashboard/sales/orders/+page.svelte`
- Modify: `src/routes/dashboard/sales/orders/[id]/+page.server.ts`
- Modify: `src/routes/dashboard/sales/orders/[id]/+page.svelte`

- [ ] **Step 1: Update orders list to show "Walk-In" when customer is null**

In `src/routes/dashboard/sales/orders/+page.svelte`, find the customer cell (around line 79):

```svelte
<span class="font-bold text-foreground/90">{order.customer?.name || 'Unknown'}</span>
```

Replace with:

```svelte
{#if order.customer}
    <span class="font-bold text-foreground/90">{order.customer.name}</span>
{:else}
    <span class="font-bold text-muted-foreground italic">Walk-In</span>
{/if}
```

- [ ] **Step 2: Expose `walkInPhone`, `walkInPricingTier`, and null-coalesce the customer from the order detail server load**

In `src/routes/dashboard/sales/orders/[id]/+page.server.ts`, add the two new fields to the select:

```ts
// In the select({...}) block, after discountAmount:
walkInPhone: salesOrders.walkInPhone,
walkInPricingTier: salesOrders.walkInPricingTier,
```

Also, because Drizzle's `leftJoin` returns a flat object `{ id: null, name: null, ... }` (not `null`) when there is no matching customer, the UI `{#if data.order.customer}` check will always be truthy. To fix this, add a null-coalesce after the query:

```ts
// After the query, before returning:
return {
    order: {
        ...order,
        customer: order.customer?.id ? order.customer : null
    },
    items,
    payments: orderPayments
};
```

- [ ] **Step 3: Show walk-in badge on order detail page**

In `src/routes/dashboard/sales/orders/[id]/+page.svelte`, find where the customer info is rendered. Look for where `data.order.customer` is referenced. Add a walk-in badge when customer is null.

Find the customer section block (look for `data.order.customer` in the template) and add a guard:

```svelte
{#if data.order.customer}
    <!-- existing customer info rendering -->
{:else}
    <div class="space-y-1">
        <p class="text-xs font-bold tracking-widest uppercase text-muted-foreground">Customer</p>
        <p class="font-black text-lg uppercase tracking-tight">Walk-In</p>
        {#if data.order.walkInPricingTier}
            <p class="text-xs font-bold tracking-widest uppercase text-primary">{data.order.walkInPricingTier} Pricing</p>
        {/if}
        {#if data.order.walkInPhone}
            <p class="text-sm text-muted-foreground font-mono">{data.order.walkInPhone}</p>
        {/if}
    </div>
{/if}
```

- [ ] **Step 4: Run check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard/sales/orders/+page.svelte \
        src/routes/dashboard/sales/orders/[id]/+page.server.ts \
        src/routes/dashboard/sales/orders/[id]/+page.svelte
git commit -m "feat: display Walk-In label in order list and order detail"
```

---

### Task 7: Customer create action — detect matching walk-in orders

**Files:**
- Modify: `src/routes/dashboard/customers/+page.server.ts`

- [ ] **Step 1: Update the `create` action to use `.returning()` and query walk-in orders**

In `src/routes/dashboard/customers/+page.server.ts`, first add the `salesOrders` import:

```ts
import { customers, salesOrders } from '$lib/server/db/schema/sales';
import { isNull, eq, and, desc, ilike, or } from 'drizzle-orm';
```

Then update the `create` action — replace the existing `create` action body:

```ts
create: async ({ request }) => {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const parsed = customerSchema.safeParse(data);
    if (!parsed.success) {
        return fail(400, { error: parsed.error.issues[0].message });
    }

    try {
        // Use .returning() to get the new customer's id
        const [newCustomer] = await db.insert(customers).values(parsed.data).returning({ id: customers.id });

        // If a phone was provided, find unlinked walk-in orders with the same phone
        let walkInOrderIds: string[] = [];
        if (parsed.data.phone) {
            try {
                const unlinked = await db
                    .select({ id: salesOrders.id })
                    .from(salesOrders)
                    .where(
                        and(
                            isNull(salesOrders.customerId),
                            eq(salesOrders.walkInPhone, parsed.data.phone)
                        )
                    );
                // Note: cancelled walk-in orders are included in this list by design.
                // Filtering them out is a future enhancement if needed.
                walkInOrderIds = unlinked.map(r => r.id);
            } catch {
                // Non-blocking — customer created successfully even if this query fails
                walkInOrderIds = [];
            }
        }

        return { success: true, customerId: newCustomer.id, walkInOrderIds };
    } catch (e: any) {
        if (e.code === '23505') {
            return fail(400, { error: 'A customer with this TIN already exists' });
        }
        return fail(500, { error: 'Database error' });
    }
},
```

Also update `src/routes/dashboard/customers/+page.svelte` to redirect after creation:

**Step A:** Add `goto` to the imports (it is not currently imported):
```ts
import { goto } from '$app/navigation';
```

**Step B:** The create form currently uses `use:enhance={makeEnhance('create')}`. Replace only the create form's enhance with a new inline function. The edit form must keep `use:enhance={makeEnhance('edit')}` — do not touch it.

Replace the create form's enhance attribute with:
```svelte
use:enhance={() => {
    isSubmitting = true;
    return async ({ result, update }: any) => {
        isSubmitting = false;
        if (result.type === 'success' && result.data?.success) {
            const { customerId, walkInOrderIds } = result.data as any;
            isCreateOpen = false;
            if (walkInOrderIds?.length > 0) {
                goto(`/dashboard/customers/${customerId}?linkOrders=true`);
            } else {
                goto(`/dashboard/customers/${customerId}`);
            }
            return; // skip update() — navigation handles the reload
        }
        await update();
    };
}}
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/dashboard/customers/+page.server.ts src/routes/dashboard/customers/+page.svelte
git commit -m "feat: customer create returns walkInOrderIds for phone-matched walk-in orders"
```

---

### Task 8: Link-orders query and action on customer detail

**Files:**
- Modify: `src/routes/dashboard/customers/[id]/+page.server.ts`
- Modify: `src/routes/dashboard/customers/[id]/+page.svelte`

- [ ] **Step 1: Add `pendingWalkInOrders` to the load function (gated on `?linkOrders`)**

In `src/routes/dashboard/customers/[id]/+page.server.ts`, update the `load` function and add the `linkOrders` action. Replace the entire file:

```ts
import { db } from '$lib/server/db';
import { customers, salesOrders } from '$lib/server/db/schema/sales';
import { eq, desc, isNull, and, inArray } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
    const id = params.id;

    const customer = await db.query.customers.findFirst({
        where: eq(customers.id, id)
    });

    if (!customer) {
        throw error(404, 'Customer not found');
    }

    const orders = await db.query.salesOrders.findMany({
        where: eq(salesOrders.customerId, id),
        orderBy: [desc(salesOrders.createdAt)]
    });

    // Only run the walk-in query when explicitly requested (after customer creation with matching phone)
    let pendingWalkInOrders: { id: string; orderNumber: string; createdAt: Date }[] = [];
    if (url.searchParams.has('linkOrders') && customer.phone) {
        try {
            pendingWalkInOrders = await db
                .select({
                    id: salesOrders.id,
                    orderNumber: salesOrders.orderNumber,
                    createdAt: salesOrders.createdAt
                })
                .from(salesOrders)
                .where(
                    and(
                        isNull(salesOrders.customerId),
                        eq(salesOrders.walkInPhone, customer.phone)
                    )
                )
                .orderBy(desc(salesOrders.createdAt));
        } catch {
            // Non-blocking
            pendingWalkInOrders = [];
        }
    }

    return {
        customer,
        orders,
        pendingWalkInOrders
    };
};

export const actions: Actions = {
    linkOrders: async ({ params, request }) => {
        const customerId = params.id;

        const customer = await db.query.customers.findFirst({
            where: eq(customers.id, customerId)
        });

        if (!customer) {
            return { error: 'Customer not found' };
        }

        try {
            const formData = await request.formData();
            const orderIdsJson = formData.get('orderIds')?.toString();
            if (!orderIdsJson) return { error: 'No orders to link' };

            const orderIds: string[] = JSON.parse(orderIdsJson);
            if (!orderIds.length) return { error: 'No orders to link' };

            // AND customer_id IS NULL guard prevents race condition.
            // walkInPhone and walkInPricingTier are intentionally cleared on link:
            // - walkInPhone is now redundant (the customer record holds the phone)
            // - walkInPricingTier was the anonymous pricing tier; the actual prices are
            //   preserved in salesOrderItems.unitPrice and lineTotal, which are never changed
            await db
                .update(salesOrders)
                .set({
                    customerId,
                    walkInPhone: null,
                    walkInPricingTier: null,
                    updatedAt: new Date()
                })
                .where(
                    and(
                        inArray(salesOrders.id, orderIds),
                        isNull(salesOrders.customerId)
                    )
                );

            return { success: true };
        } catch (err) {
            console.error('Failed to link walk-in orders:', err);
            return { error: 'Failed to link orders. Please try again.' };
        }
    }
};
```

- [ ] **Step 2: Fix pre-existing order link bug and add the link-orders banner**

In `src/routes/dashboard/customers/[id]/+page.svelte`, while editing this file for the banner, also fix the pre-existing bug where orders in the ledger section link to `/dashboard/sales/{order.id}` instead of `/dashboard/sales/orders/{order.id}`. Search for `href="/dashboard/sales/{` and change it to `href="/dashboard/sales/orders/{`.

Then add to the `<script>` imports:

```ts
import { enhance } from '$app/forms';
import { goto } from '$app/navigation';
import { Link } from 'lucide-svelte';
```

Add to the script block (after `let orders = $derived(data.orders);`):

```ts
let pendingWalkInOrders = $derived(data.pendingWalkInOrders);
let bannerDismissed = $state(false);
let showBanner = $derived(pendingWalkInOrders.length > 0 && !bannerDismissed);

function handleLinkOrders() {
    return async ({ result, update }: any) => {
        if (result.type === 'success') {
            await goto(`/dashboard/customers/${data.customer.id}`, { invalidateAll: true });
        }
        await update();
    };
}
```

Add the banner at the top of the page content (right after the top navigation div, before the brutalist header):

```svelte
{#if showBanner}
    <div class="bg-primary/10 border-2 border-primary p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="space-y-1">
            <p class="font-black tracking-tight uppercase text-sm flex items-center gap-2">
                <Link class="w-4 h-4" />
                {pendingWalkInOrders.length} walk-in {pendingWalkInOrders.length === 1 ? 'order' : 'orders'} found with this phone number
            </p>
            <p class="text-xs text-muted-foreground">Link them to this customer to see them in the order history.</p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
            <Button
                variant="ghost"
                size="sm"
                onclick={() => { bannerDismissed = true; }}
                class="rounded-none text-xs font-bold uppercase tracking-widest"
            >
                Dismiss
            </Button>
            <form method="POST" action="?/linkOrders" use:enhance={handleLinkOrders}>
                <input type="hidden" name="orderIds" value={JSON.stringify(pendingWalkInOrders.map(o => o.id))} />
                <Button
                    type="submit"
                    size="sm"
                    class="rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary"
                >
                    Link Orders
                </Button>
            </form>
        </div>
    </div>
{/if}
```

- [ ] **Step 3: Run check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 4: Run all unit tests**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 5: End-to-end smoke test**

1. Create a walk-in order with phone `+251900000001` and WHOLESALE pricing — note the order number.
2. Navigate to the orders list — verify the order shows "Walk-In" in the Customer column.
3. Open the order detail — verify "Walk-In", "WHOLESALE Pricing", and the phone number are shown.
4. Navigate to Customers → create a new customer with phone `+251900000001`.
5. Verify redirect lands on the new customer's detail page with `?linkOrders=true` in the URL.
6. Verify the banner appears: "1 walk-in order found with this phone number".
7. Click **Link Orders** — verify the banner disappears and the order now appears in the customer's order history.
8. Open the order detail — verify the customer name now shows instead of "Walk-In".

- [ ] **Step 6: Commit**

```bash
git add src/routes/dashboard/customers/[id]/+page.server.ts \
        src/routes/dashboard/customers/[id]/+page.svelte
git commit -m "feat: link walk-in orders to customer on creation — linkOrders action and banner"
```
