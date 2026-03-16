# Responsive Design Spec
**Date:** 2026-03-16
**Status:** Approved

## Overview

Make the entire Nova dashboard app responsive across phones (320px+), foldable phones (unfolded ~600px), tablets (768px+), and desktop (1024px+). The app is built with SvelteKit 2 + Svelte 5 + Tailwind CSS 4 + bits-ui 2.

Some responsiveness already exists (sidebar collapses to a sheet on mobile, main padding scales, some table columns hide at breakpoints). This spec covers the remaining gaps with a component-first approach.

---

## Breakpoints

Add a custom `xs` breakpoint for standard phones. The full tier system:

| Breakpoint | Min-width | Target devices |
|---|---|---|
| (default) | 0px | Small phones, narrow foldables (320px) |
| `xs` | 475px | Standard phones (375–475px) |
| `md` | 768px | Tablets, unfolded foldables |
| `lg` | 1024px | Desktop |

Define in `src/app.css`:
```css
@custom-variant xs (@media (width >= 475px));
```

**`xs` usage:** `DataCards` card bodies use `grid-cols-1 xs:grid-cols-2` — single column on narrow phones (320px), 2-column from 475px up.

---

## New Components

### 1. `BottomNav` — `src/lib/components/layout/BottomNav.svelte`

Phone-only navigation bar. Hidden at `md+` (tablet and above keep the existing sidebar).

**Fixed height:** `h-16` (64px) before safe-area inset.

**Wrapper element:**
```html
<nav class="block md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-background border-t
            flex items-center"
     style="padding-bottom: env(safe-area-inset-bottom)">
```

**Safe area:** `env(safe-area-inset-bottom)` makes the bar taller on iOS (e.g. ~84px on iPhone 14). The FAB offset accounts for this — see `PageFAB` section.

**Touch targets:** Each tab must have a minimum hit area of 44×44px (WCAG 2.5.5). Use `min-w-[44px] flex-1` per tab item.

**Tab mapping — explicit sidebar-to-BottomNav assignment:**

The `navItems` array in `AppSidebar.svelte` is the source of truth for roles. `BottomNav` applies the same role filter. The mapping is:

| Destination | Route | Roles | Location |
|---|---|---|---|
| Dashboard | `/dashboard` | admin, sales, warehouse | Pinned tab |
| Orders | `/dashboard/sales/orders` | admin, sales | Pinned tab |
| Catalog (→ Products) | `/dashboard/catalog/products` | admin, warehouse | Pinned tab |
| More | — | always | Pinned tab (always last) |

The "Catalog" tab links to `/dashboard/catalog/products`. It is active when `pathname.startsWith('/dashboard/catalog')`.

If a role cannot see Orders (e.g. warehouse) or Catalog (e.g. sales), that tab is hidden; remaining tabs fill the space. "More" is always shown.

**"More" sheet — all sidebar items not pinned as tabs, in `navItems` order, filtered by role:**

| Item | Route | Roles |
|---|---|---|
| Inventory | `/dashboard/inventory` | admin, warehouse |
| Warehouses | `/dashboard/inventory/warehouses` | admin, warehouse |
| Stock Takes | `/dashboard/inventory/counts` | admin, warehouse |
| Reconciliation | `/dashboard/sales/reconciliation` | admin, sales |
| Customers | `/dashboard/customers` | admin, sales |
| Categories | `/dashboard/catalog/categories` | admin, warehouse |
| Settings | `/dashboard/settings` | admin, sales, warehouse |

Inventory, Warehouses, and Stock Takes are three separate flat links (no collapsible group — the sheet layout is flat). Active state per item: `pathname.startsWith(href)`.

The "More" sheet uses the local `Sheet` wrapper (`src/lib/components/ui/sheet/`) with `<Sheet.Content side="bottom">` — the local `Sheet.Content` already accepts and passes through the `side` prop. Use `rounded-t-2xl` on `Sheet.Content`. It renders via bits-ui portal at `z-50`.

**Role data access in `BottomNav`:** Import `page` from `$app/state` and read `page.data.user?.role` — the same pattern used in `AppSidebar.svelte`. Do not pass role as a prop; read it directly from the page store.

**`Sidebar.Trigger` in `AppHeader`:** Change `class="md:hidden"` → `class="hidden"`. `BottomNav` replaces mobile hamburger navigation entirely.

**`Sidebar.Trigger` in `AppSidebar` footer:** Already `class="hidden md:flex"` — leave unchanged.

---

### 2. `DataCards` — `src/lib/components/ui/data-cards/`

Two files: `DataCards.svelte` and `index.ts` (barrel export following existing ui component conventions).

**Data pre-processing contract:** Pages pass **pre-flattened, pre-formatted** data to `DataCards`. Any nested fields (e.g. `row.product.name`) or boolean-to-label conversions (e.g. `isActive → "Active"/"Inactive"`) must be resolved in the page's script before passing `data`. This keeps `DataCards` simple and stateless.

**Props:**
```typescript
type Column = {
  key: string;          // flat key into the pre-processed row object
  label: string;
  primary?: boolean;    // rendered as card title (bold, larger text)
  secondary?: boolean;  // rendered as muted subtitle under title
  badge?: boolean;      // rendered as a colored chip (top-right of card header)
  badgeClass?: (value: unknown) => string; // optional CSS classes for the badge chip color
                                            // e.g. (v) => v === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            // if omitted, uses a neutral muted chip style
  hideInCard?: boolean; // omit from card body grid entirely
};

type Action = {
  label: string;
  onClick: (row: Record<string, unknown>) => void;
  variant?: 'default' | 'destructive';
};

// Actions can be a static array or a per-row function for dynamic action sets
type ActionsInput = Action[] | ((row: Record<string, unknown>) => Action[]);

interface Props {
  columns: Column[];
  data: Record<string, unknown>[];
  actions?: ActionsInput;  // rendered in ⋯ DropdownMenu on each card
  keyField?: string;       // default: 'id'
  emptyMessage?: string;   // default: 'No items found.'
}
```

**Card anatomy:**
- **Header:** `primary` field (title) + `secondary` field (muted subtitle) on the left; `badge` field chip + `⋯` actions button on the right
- **Body:** `grid-cols-1 xs:grid-cols-2` grid of `label / value` pairs for all columns not marked `primary`, `secondary`, `badge`, or `hideInCard`
- **Actions:** bits-ui `DropdownMenu` triggered by `⋯` button

**Empty state:**
```svelte
<p class="text-muted-foreground text-sm text-center py-8">{emptyMessage ?? 'No items found.'}</p>
```

**Form-based action wiring:** Pages using SvelteKit form actions for row operations wrap them as imperative fetch calls:
```svelte
<script>
  async function deleteProduct(row) {
    const fd = new FormData();
    fd.set('id', row.id);
    await fetch('?/delete', { method: 'POST', body: fd });
    invalidateAll();
  }
</script>

<DataCards {columns} data={processedData}
  actions={[{ label: 'Edit', onClick: (row) => { editingRow = row; isSheetOpen = true; } },
            { label: 'Delete', onClick: deleteProduct, variant: 'destructive' }]} />
```

"Open edit sheet" actions set reactive state (`editingRow`, `isSheetOpen`) in the parent — the same state variables already used by the existing desktop table row actions.

**Dynamic per-row action sets** (e.g. Users page where available role options vary per row): Pass a function that computes actions from the row. The `ActionsInput` type already covers this — see the consolidated Props interface above.

**Usage pattern per page:**
```svelte
<!-- Mobile: cards -->
<div class="md:hidden">
  <DataCards {columns} data={processedData} {actions} emptyMessage="No products found." />
</div>
<!-- Tablet+: existing table unchanged -->
<div class="hidden md:block">
  <Table>...</Table>
</div>
```

**Column mapping per page** (keys reference the pre-processed flat row object):

| Page | Processed fields | primary | secondary | badge | badge color |
|---|---|---|---|---|---|
| Products | `{ id, name, sku, categoryName, isActiveLabel, minStockLevel, averageLandingCost }` | `name` | `sku` | `isActiveLabel` | green=Active, red=Inactive |
| Categories | `{ id, name, prefix, description }` | `name` | `prefix` | — | — |
| Orders | `{ id, orderNumber, customerName, status, total, createdAt }` | `orderNumber` | `customerName` | `status` | use existing `getStatusColor(status)` |
| Customers | `{ id, name, email, phone, createdAt }` | `name` | `email` | — | — |
| Inventory Live Levels | `{ id, productName, productSku, warehouseName, quantity, stockStatus }` | `productName` | `productSku` | `stockStatus` | green=OK, amber=Low, red=Critical |
| Inventory Audit Trail | `{ id, productName, productSku, warehouseName, transactionType, quantityChange, createdAt }` | `productName` | `warehouseName` | `transactionType` | neutral |
| Warehouses | `{ id, name, location, isActiveLabel }` | `name` | `location` | `isActiveLabel` | green=Active, red=Inactive |
| Stock Takes | `{ id, reference, warehouseName, status, createdAt }` | `reference` | `warehouseName` | `status` | neutral |
| Users | `{ id, name, email, role, createdAt }` | `name` | `email` | `role` | neutral |

**Notes on specific pages:**

- **Products `isActiveLabel`:** Derived from `row.product.isActive` (boolean field in the `products` DB table). Pre-process: `isActiveLabel: row.product.isActive ? 'Active' : 'Inactive'`. Provide `badgeClass: (v) => v === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'` on the badge column.

- **Orders actions:** The existing Orders table has navigation-only actions — "View Details" and conditionally "Record Payment", both using `goto`. Wire as `onClick: (row) => goto(...)`. No destructive actions; the `⋯` menu is still useful for touch accessibility.

- **Inventory Audit Trail raw data shape:** The load function returns `{ tx: inventoryTransactions, productName: string, productSku: string, warehouseName: string }`. Pre-process into the flat shape above: `transactionType: row.tx.transactionType`, `quantityChange: row.tx.quantityChange`, etc.

For each page, derive the `processedData` array in the component's `$derived` block by flattening the load data into these shapes. The `id` field should always be included (used as `keyField`).

---

### 3. `PageFAB` — `src/lib/components/ui/fab/`

Two files: `PageFAB.svelte` and `index.ts` (barrel export).

**Props:**
```typescript
interface Props {
  onclick: () => void;
  label: string; // aria-label
}
```

**Imports:** `import { Plus } from 'lucide-svelte'`

**Element:**
```svelte
<button
  class="md:hidden fixed right-4 z-30 w-14 h-14 rounded-full
         bg-primary text-primary-foreground shadow-lg
         flex items-center justify-center"
  style="bottom: calc(5rem + env(safe-area-inset-bottom))"
  aria-label={label}
  {onclick}
>
  <Plus class="w-6 h-6" />
</button>
```

Using `calc(5rem + env(safe-area-inset-bottom))` ensures the FAB always clears the BottomNav on both standard and iOS notched devices.

**Wiring pattern — shared reactive state for both desktop button and FAB:**
```svelte
<script>
  let open = $state(false);
</script>

<!-- Desktop button — hidden on mobile -->
<Button class="hidden md:flex" onclick={() => open = true}>Create</Button>

<!-- Mobile FAB -->
<PageFAB label="Create product" onclick={() => open = true} />

<!-- Sheet or Dialog using same state -->
<Sheet.Root bind:open>...</Sheet.Root>
```

This applies whether the create flow is a Sheet or a Dialog. The same `open` variable drives both triggers.

---

## Layout Changes

### `src/routes/dashboard/+layout.svelte`
- Import and render `<BottomNav />` as a direct sibling after the main content `<div>`, inside `<Sidebar.Provider>`
- Add `pb-20 md:pb-0` to `<main>`

### `src/lib/components/layout/AppHeader.svelte`
- Change `<Sidebar.Trigger class="md:hidden" />` → `<Sidebar.Trigger class="hidden" />`
- The search form already uses `flex-1 max-w-md ml-auto`; with the trigger hidden it fills the remaining space naturally. On very narrow screens (320px), add `min-w-0` to the search form to prevent overflow: `class="flex-1 max-w-md ml-auto min-w-0"`.

### Per-page header create buttons
Add `hidden md:flex` (or `hidden md:inline-flex`) to each page's existing create/add button. The FAB takes over on mobile.

---

## Per-Page Changes

| Page | Route | DataCards | FAB action | Notes |
|---|---|---|---|---|
| Products | `/dashboard/catalog/products` | ✅ | ✅ opens create Sheet | delete → fetch `?/delete`; edit → set `editingProduct` + `isEditOpen` |
| Categories | `/dashboard/catalog/categories` | ✅ | ✅ opens create Sheet | — |
| Orders | `/dashboard/sales/orders` | ✅ | ✅ navigates to `/create` | — |
| Customers | `/dashboard/customers` | ✅ | ✅ opens create Sheet | — |
| Inventory | `/dashboard/inventory` | ✅ (two blocks) | ✅ opens Log Move Sheet | Add `hidden md:flex` to "Log Move" header button; Sheet already uses `bind:open={isTransactOpen}` — FAB sets same var |
| Warehouses | `/dashboard/inventory/warehouses` | ✅ | ✅ opens create Sheet | — |
| Stock Takes | `/dashboard/inventory/counts` | ✅ | ✅ sets `showStartForm = true` | The page uses an inline toggle form (`showStartForm` boolean state), not a Sheet. The FAB sets `showStartForm = true`. Add `hidden md:flex` to the existing "Start New Count" button. |
| Users | `/dashboard/settings/users` | ✅ | ✅ opens invite Dialog | `actions` prop uses `(row) => Action[]` signature for dynamic per-row role options |

### Create Order page (`/dashboard/sales/orders/create`)
- Audit all form grids → `grid-cols-1 md:grid-cols-2`
- Verify no horizontal overflow at 375px

### Customer detail page (`/dashboard/customers/[id]`)
- Audit all side-by-side panels → `flex-col md:flex-row`
- Check for overflow at 375px

---

## Z-Index Reference

| Element | z-index |
|---|---|
| `AppHeader` (sticky) | `z-30` |
| `PageFAB` | `z-30` |
| `BottomNav` | `z-40` |
| bits-ui Sheet / Dialog portals | `z-50` |

No conflicts: Sheet/Dialog portals render above everything. BottomNav renders above the header. FAB is below the BottomNav intentionally (positioned to clear it, not overlap it).

---

## What Stays the Same

- Dashboard analytics page — already responsive
- Settings pages (profile, system, backup) — single-column forms, no changes
- Login page — already mobile-friendly
- All create/edit sheets — already full-width on mobile via `sm:max-w-[700px]`
- `AppSidebar` — unchanged for tablet+; sidebar Sheet no longer opened on mobile

---

## Implementation Order

1. Add `xs` breakpoint to `src/app.css`
2. Build `BottomNav` (role guards + "More" sheet)
3. Wire `BottomNav` into `dashboard/+layout.svelte`; hide `Sidebar.Trigger` in `AppHeader`; add `min-w-0` to search form; add `pb-20 md:pb-0` to `<main>`
4. Build `DataCards` (with barrel export, `(row) => Action[]` overload, empty state)
5. Build `PageFAB` (with barrel export)
6. For each of the 8 pages: derive `processedData`, add `DataCards` block, add `PageFAB`, hide header create button, wire shared `open` state
7. Audit Create Order form grids
8. Audit Customer detail layout
