# Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire Nova dashboard app responsive across phones (320px+), foldable phones (~600px), tablets (768px+), and desktop (1024px+).

**Architecture:** Build three reusable components — `BottomNav` (phone navigation), `DataCards` (card-view table replacement), and `PageFAB` (floating action button) — then apply them systematically across all 8 data-table pages. The `md` breakpoint (768px) is the main mobile/tablet divider; a new `xs` breakpoint (475px) is added for two-column card grids on standard phones.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), Tailwind CSS 4, bits-ui 2, Vitest (tests: `pnpm test:unit`), lucide-svelte icons.

---

## File Structure

**New files:**
- `src/lib/components/layout/BottomNav.svelte` — phone-only bottom navigation bar
- `src/lib/components/ui/data-cards/DataCards.svelte` — generic card-view renderer for table data
- `src/lib/components/ui/data-cards/index.ts` — barrel export
- `src/lib/components/ui/data-cards/utils.ts` — `get()` dot-notation resolver (testable pure function)
- `src/lib/components/ui/data-cards/utils.test.ts` — unit tests for utils
- `src/lib/components/ui/fab/PageFAB.svelte` — floating action button
- `src/lib/components/ui/fab/index.ts` — barrel export

**Modified files:**
- `src/app.css` — add `xs` breakpoint
- `src/routes/dashboard/+layout.svelte` — add `<BottomNav>`, add `pb-20 md:pb-0` to `<main>`
- `src/lib/components/layout/AppHeader.svelte` — hide `Sidebar.Trigger` on mobile, add `min-w-0` to search
- `src/routes/dashboard/catalog/products/+page.svelte` — DataCards + FAB
- `src/routes/dashboard/catalog/categories/+page.svelte` — DataCards + FAB
- `src/routes/dashboard/sales/orders/+page.svelte` — DataCards + FAB
- `src/routes/dashboard/customers/+page.svelte` — DataCards + FAB
- `src/routes/dashboard/inventory/+page.svelte` — DataCards (×2) + FAB for Log Move
- `src/routes/dashboard/inventory/warehouses/+page.svelte` — DataCards + FAB
- `src/routes/dashboard/inventory/counts/+page.svelte` — DataCards + FAB (toggle `showStartForm`)
- `src/routes/dashboard/settings/users/+page.svelte` — DataCards + FAB
- `src/routes/dashboard/sales/orders/create/+page.svelte` — form grid audit
- `src/routes/dashboard/customers/[id]/+page.svelte` — layout audit

---

## Chunk 1: Foundation — Breakpoint, BottomNav, Layout Wiring

### Task 1: Add `xs` breakpoint

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Open `src/app.css` and add the custom breakpoint after the existing `@import` statements**

Add these lines near the top of `src/app.css`, adjacent to the existing `@custom-variant dark` line:

```css
@custom-variant xs (@media (width >= 475px));

/* Safe-area utility for iOS notched devices — used by BottomNav and its More sheet */
@utility pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "feat: add xs breakpoint (475px) for narrow phone support"
```

---

### Task 2: Build `BottomNav`

**Files:**
- Create: `src/lib/components/layout/BottomNav.svelte`

The BottomNav shows on phones only (`md:hidden`). It has up to 4 tabs — Dashboard, Orders (admin/sales only), Catalog (admin/warehouse only), and always-visible "More". "More" opens a bottom sheet with the remaining nav items. Role filtering mirrors `AppSidebar.svelte` exactly using the same `navItems` array shape and `page.data.user?.role`.

- [ ] **Step 1: Create `src/lib/components/layout/BottomNav.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import * as Sheet from '$lib/components/ui/sheet';
  import { LayoutDashboard, ShoppingCart, Box, Package, Users, Tags, Warehouse, ClipboardList, Calculator, Settings, MoreHorizontal } from 'lucide-svelte';

  const allTabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['admin', 'sales', 'warehouse'], exact: true },
    { key: 'orders',    label: 'Orders',    icon: ShoppingCart,    href: '/dashboard/sales/orders', roles: ['admin', 'sales'], exact: false },
    { key: 'catalog',   label: 'Catalog',   icon: Box,             href: '/dashboard/catalog/products', roles: ['admin', 'warehouse'], exact: false, activePrefix: '/dashboard/catalog' },
  ];

  const allMoreItems = [
    { label: 'Inventory',      icon: Package,      href: '/dashboard/inventory',           roles: ['admin', 'warehouse'] },
    { label: 'Warehouses',     icon: Warehouse,    href: '/dashboard/inventory/warehouses', roles: ['admin', 'warehouse'] },
    { label: 'Stock Takes',    icon: ClipboardList,href: '/dashboard/inventory/counts',     roles: ['admin', 'warehouse'] },
    { label: 'Reconciliation', icon: Calculator,   href: '/dashboard/sales/reconciliation', roles: ['admin', 'sales'] },
    { label: 'Customers',      icon: Users,        href: '/dashboard/customers',            roles: ['admin', 'sales'] },
    { label: 'Categories',     icon: Tags,         href: '/dashboard/catalog/categories',   roles: ['admin', 'warehouse'] },
    { label: 'Settings',       icon: Settings,     href: '/dashboard/settings',             roles: ['admin', 'sales', 'warehouse'] },
  ];

  let moreOpen = $state(false);

  const role = $derived(page.data.user?.role as string | undefined);

  const visibleTabs = $derived(
    allTabs.filter(t => !role || t.roles.includes(role))
  );

  const visibleMoreItems = $derived(
    allMoreItems.filter(i => !role || i.roles.includes(role))
  );

  function isActive(tab: typeof allTabs[number]) {
    const path = page.url.pathname;
    const prefix = tab.activePrefix ?? tab.href;
    if (tab.exact) return path === tab.href;
    return path.startsWith(prefix);
  }

  function isMoreItemActive(href: string) {
    return page.url.pathname.startsWith(href);
  }
</script>

<nav
  class="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border"
  style="padding-bottom: env(safe-area-inset-bottom)"
>
  <div class="h-16 flex items-center">
    {#each visibleTabs as tab}
      <button
        class="flex-1 min-w-[44px] flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium transition-colors
               {isActive(tab) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => goto(tab.href)}
      >
        <tab.icon class="h-5 w-5" />
        <span>{tab.label}</span>
      </button>
    {/each}

    <!-- More tab — always shown -->
    <Sheet.Root bind:open={moreOpen}>
      <Sheet.Trigger class="flex-1 min-w-[44px] flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
        <MoreHorizontal class="h-5 w-5" />
        <span>More</span>
      </Sheet.Trigger>
      <Sheet.Content side="bottom" class="rounded-t-2xl pb-safe">
        <div class="w-8 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4"></div>
        <p class="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3 px-1">More</p>
        <div class="flex flex-col gap-1">
          {#each visibleMoreItems as item}
            <button
              class="flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors
                     {isMoreItemActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'}"
              onclick={() => { moreOpen = false; goto(item.href); }}
            >
              <item.icon class="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          {/each}
        </div>
      </Sheet.Content>
    </Sheet.Root>
  </div>
</nav>
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm check
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/layout/BottomNav.svelte
git commit -m "feat: add BottomNav component for mobile navigation"
```

---

### Task 3: Wire BottomNav into the dashboard layout and fix AppHeader

**Files:**
- Modify: `src/routes/dashboard/+layout.svelte`
- Modify: `src/lib/components/layout/AppHeader.svelte`

- [ ] **Step 1: Update `src/routes/dashboard/+layout.svelte`**

Replace the entire file with:

```svelte
<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar";
  import AppSidebar from "$lib/components/layout/AppSidebar.svelte";
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import BottomNav from "$lib/components/layout/BottomNav.svelte";
  let { children } = $props();
</script>

<Sidebar.Provider>
  <AppSidebar />
  <div class="flex flex-col flex-1 w-full overflow-hidden">
    <AppHeader />
    <main class="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:pb-8">
      <!--
        pb-20 adds bottom clearance for the BottomNav on mobile.
        md:pb-6 / lg:pb-8 restores the normal bottom padding on tablet/desktop
        (same value as md:p-6 / lg:p-8 sets, so the shorthand padding isn't overridden to 0).
      -->
      {@render children()}
    </main>
  </div>
  <BottomNav />
</Sidebar.Provider>
```

- [ ] **Step 2: Update `src/lib/components/layout/AppHeader.svelte`**

Make two changes:
1. Line 23: change `class="md:hidden"` → `class="hidden"` on `Sidebar.Trigger`
2. Line 45: add `min-w-0` to the search form

```svelte
<!-- line 23: was class="md:hidden" -->
<Sidebar.Trigger class="hidden" />

<!-- line 45: add min-w-0 -->
<form class="flex-1 max-w-md ml-auto min-w-0">
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Visual verification — start dev server**

```bash
pnpm dev
```

Open `http://localhost:5173/dashboard` in your browser. In DevTools, toggle to a mobile viewport (375px wide).

Expected:
- Bottom nav bar appears with tabs (Dashboard, Orders or Catalog depending on role, More)
- Hamburger button in the top header is gone
- No visible overlap between main content and the bottom nav bar

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard/+layout.svelte src/lib/components/layout/AppHeader.svelte
git commit -m "feat: wire BottomNav into dashboard layout, remove mobile hamburger"
```

---

## Chunk 2: DataCards Component

### Task 4: Write tests for DataCards utilities

**Files:**
- Create: `src/lib/components/ui/data-cards/utils.ts`
- Create: `src/lib/components/ui/data-cards/utils.test.ts`

The `get()` function resolves dot-notation paths from plain objects. The `resolveActions()` function normalises the `ActionsInput` union type to `Action[]` for a given row.

- [ ] **Step 1: Create the test file first**

Create `src/lib/components/ui/data-cards/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { get, resolveActions } from './utils';

describe('get', () => {
  it('resolves a flat key', () => {
    expect(get({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('resolves a nested key with dot notation', () => {
    expect(get({ product: { name: 'Bolt' } }, 'product.name')).toBe('Bolt');
  });

  it('resolves three levels deep', () => {
    expect(get({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for a missing key', () => {
    expect(get({ name: 'Alice' }, 'email')).toBeUndefined();
  });

  it('returns undefined when intermediate key is missing', () => {
    expect(get({ product: null }, 'product.name')).toBeUndefined();
  });
});

describe('resolveActions', () => {
  const row = { id: '1', name: 'Alice' };

  it('returns a static array as-is', () => {
    const actions = [{ label: 'Edit', onClick: () => {} }];
    expect(resolveActions(actions, row)).toBe(actions);
  });

  it('calls a function with the row and returns the result', () => {
    const fn = (r: Record<string, unknown>) => [{ label: `Edit ${r.name}`, onClick: () => {} }];
    const result = resolveActions(fn, row);
    expect(result[0].label).toBe('Edit Alice');
  });

  it('returns empty array when actions is undefined', () => {
    expect(resolveActions(undefined, row)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
pnpm test:unit
```

Expected: error like `Cannot find module './utils'`

- [ ] **Step 3: Create `src/lib/components/ui/data-cards/utils.ts`**

```typescript
export type Action = {
  label: string;
  onClick: (row: Record<string, unknown>) => void;
  variant?: 'default' | 'destructive';
};

export type ActionsInput = Action[] | ((row: Record<string, unknown>) => Action[]);

/**
 * Resolves a dot-notation path from an object.
 * e.g. get({ product: { name: 'Bolt' } }, 'product.name') === 'Bolt'
 */
export function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Normalises ActionsInput to Action[] for a given row.
 */
export function resolveActions(
  actions: ActionsInput | undefined,
  row: Record<string, unknown>
): Action[] {
  if (!actions) return [];
  if (typeof actions === 'function') return actions(row);
  return actions;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test:unit
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ui/data-cards/utils.ts src/lib/components/ui/data-cards/utils.test.ts
git commit -m "feat: add DataCards utility functions with tests"
```

---

### Task 5: Build `DataCards` component

**Files:**
- Create: `src/lib/components/ui/data-cards/DataCards.svelte`
- Create: `src/lib/components/ui/data-cards/index.ts`

- [ ] **Step 1: Create `src/lib/components/ui/data-cards/DataCards.svelte`**

```svelte
<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { MoreHorizontal } from 'lucide-svelte';
  import { get, resolveActions, type Action, type ActionsInput } from './utils';

  type Column = {
    key: string;
    label: string;
    primary?: boolean;
    secondary?: boolean;
    badge?: boolean;
    badgeClass?: (value: unknown) => string;
    hideInCard?: boolean;
  };

  interface Props {
    columns: Column[];
    data: Record<string, unknown>[];
    actions?: ActionsInput;
    keyField?: string;
    emptyMessage?: string;
  }

  let { columns, data, actions, keyField = 'id', emptyMessage = 'No items found.' }: Props = $props();

  const primaryCol   = $derived(columns.find(c => c.primary));
  const secondaryCol = $derived(columns.find(c => c.secondary));
  const badgeCol     = $derived(columns.find(c => c.badge));
  const bodyColumns  = $derived(
    columns.filter(c => !c.primary && !c.secondary && !c.badge && !c.hideInCard)
  );
</script>

{#if data.length === 0}
  <p class="text-muted-foreground text-sm text-center py-8">{emptyMessage}</p>
{:else}
  <div class="flex flex-col gap-3">
    {#each data as row (get(row, keyField))}
      {@const rowActions = resolveActions(actions, row)}
      <div class="border border-border rounded-xl bg-card p-4 shadow-sm">
        <!-- Card header -->
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="min-w-0">
            {#if primaryCol}
              <p class="font-semibold text-sm text-foreground leading-tight truncate">
                {get(row, primaryCol.key) ?? '—'}
              </p>
            {/if}
            {#if secondaryCol}
              <p class="text-xs text-muted-foreground mt-0.5 truncate">
                {get(row, secondaryCol.key) ?? '—'}
              </p>
            {/if}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            {#if badgeCol}
              {@const badgeValue = get(row, badgeCol.key)}
              {@const badgeClasses = badgeCol.badgeClass ? badgeCol.badgeClass(badgeValue) : 'bg-muted text-muted-foreground'}
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide {badgeClasses}">
                {badgeValue ?? '—'}
              </span>
            {/if}
            {#if rowActions.length > 0}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  class="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Row actions"
                >
                  <MoreHorizontal class="h-4 w-4" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  {#each rowActions as action}
                    <DropdownMenu.Item
                      class={action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                      onclick={() => action.onClick(row)}
                    >
                      {action.label}
                    </DropdownMenu.Item>
                  {/each}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            {/if}
          </div>
        </div>

        <!-- Card body grid -->
        {#if bodyColumns.length > 0}
          <div class="grid grid-cols-1 xs:grid-cols-2 gap-x-4 gap-y-2">
            {#each bodyColumns as col}
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{col.label}</p>
                <p class="text-xs font-medium text-foreground mt-0.5">{get(row, col.key) ?? '—'}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
```

- [ ] **Step 2: Create `src/lib/components/ui/data-cards/index.ts`**

```typescript
export { default as DataCards } from './DataCards.svelte';
export type { Action, ActionsInput } from './utils';
```

- [ ] **Step 3: Verify TypeScript and tests**

```bash
pnpm check && pnpm test:unit
```

Expected: no type errors; all 8 utility tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ui/data-cards/
git commit -m "feat: add DataCards component for mobile card-view tables"
```

---

## Chunk 3: PageFAB + Products, Categories, Orders, Customers

### Task 6: Build `PageFAB` component

**Files:**
- Create: `src/lib/components/ui/fab/PageFAB.svelte`
- Create: `src/lib/components/ui/fab/index.ts`

- [ ] **Step 1: Create `src/lib/components/ui/fab/PageFAB.svelte`**

```svelte
<script lang="ts">
  import { Plus } from 'lucide-svelte';

  interface Props {
    onclick: () => void;
    label: string;
  }

  let { onclick, label }: Props = $props();
</script>

<button
  class="md:hidden fixed right-4 z-30 w-14 h-14 rounded-full
         bg-primary text-primary-foreground shadow-lg
         flex items-center justify-center
         hover:bg-primary/90 active:scale-95 transition-transform"
  style="bottom: calc(5rem + env(safe-area-inset-bottom))"
  aria-label={label}
  {onclick}
>
  <Plus class="w-6 h-6" />
</button>
```

- [ ] **Step 2: Create `src/lib/components/ui/fab/index.ts`**

```typescript
export { default as PageFAB } from './PageFAB.svelte';
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ui/fab/
git commit -m "feat: add PageFAB floating action button component"
```

---

### Task 7: Update Products page

**Files:**
- Modify: `src/routes/dashboard/catalog/products/+page.svelte`

Pattern: add `processedProducts` derived data, add DataCards (mobile), wrap existing table in `hidden md:block`, hide header "New Item" button on mobile, add PageFAB.

- [ ] **Step 1: Add imports to the `<script>` block**

In the `<script lang="ts">` block, add these imports after the existing ones:

```typescript
import { DataCards } from '$lib/components/ui/data-cards';
import { PageFAB } from '$lib/components/ui/fab';
import type { Action } from '$lib/components/ui/data-cards/utils';
import { invalidateAll } from '$app/navigation';
```

- [ ] **Step 2: Add `processedProducts` and `cardColumns` after the existing state variables**

Add after `let editCatOpen = $state(false);`:

```typescript
const processedProducts = $derived(
  data.products.map((row: any) => ({
    id: row.product.id,
    name: row.product.name,
    sku: row.product.sku,
    categoryName: row.category?.name ?? '—',
    isActiveLabel: row.product.isActive ? 'Active' : 'Inactive',
    minStockLevel: row.product.minStockLevel,
    averageLandingCost: Number(row.product.averageLandingCost).toFixed(2),
  }))
);

const cardColumns = [
  { key: 'name',               label: 'Name',       primary: true },
  { key: 'sku',                label: 'SKU',        secondary: true },
  { key: 'isActiveLabel',      label: 'Status',     badge: true,
    badgeClass: (v: unknown) => v === 'Active'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700' },
  { key: 'categoryName',       label: 'Category' },
  { key: 'averageLandingCost', label: 'Cost (ETB)' },
  { key: 'minStockLevel',      label: 'Min Stock' },
];

const cardActions: Action[] = [
  { label: 'Edit',   onClick: (row: any) => openEdit({ product: data.products.find((p: any) => p.product.id === row.id)?.product, category: data.products.find((p: any) => p.product.id === row.id)?.category }) },
  { label: 'Delete', variant: 'destructive', onClick: async (row: any) => {
      const fd = new FormData();
      fd.set('id', row.id);
      await fetch('?/delete', { method: 'POST', body: fd });
      await invalidateAll();
    }
  },
];
```

- [ ] **Step 3: Hide the "New Item" button on mobile**

In the template, find the `<Button {...props} class="h-12 px-8 ...">` inside the `Sheet.Trigger` snippet and add `hidden md:flex` to its class string:

```svelte
<Button {...props} class="hidden md:flex h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] relative">
  New Item
</Button>
```

- [ ] **Step 4: Add DataCards block above the existing table section**

Find the existing `<Table.Root>` (or its wrapper). Wrap the table in `<div class="hidden md:block">` and add the DataCards block before it:

```svelte
<!-- Mobile card view -->
<div class="md:hidden">
  <DataCards
    columns={cardColumns}
    data={processedProducts}
    actions={cardActions}
    emptyMessage="No products indexed."
  />
</div>

<!-- Desktop table view (unchanged) -->
<div class="hidden md:block">
  <!-- existing <Table.Root>...</Table.Root> goes here, unchanged -->
</div>
```

- [ ] **Step 5: Add PageFAB at the bottom of the template (outside all wrappers)**

Add just before the closing `</div>` of the page wrapper (`<div class="p-4 md:p-8 ...">`) or as the very last child:

```svelte
<PageFAB label="Add product" onclick={() => isCreateOpen = true} />
```

- [ ] **Step 6: Verify TypeScript**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 7: Visual check**

Start dev server (`pnpm dev`), open Products page at 375px wide. Verify:
- Card view renders with product name, SKU, Active/Inactive badge
- FAB (purple circle with +) appears above bottom nav
- Tapping FAB opens the create sheet
- On desktop (>768px): table visible, FAB hidden, "New Item" button visible

- [ ] **Step 8: Commit**

```bash
git add src/routes/dashboard/catalog/products/+page.svelte
git commit -m "feat: add mobile card view and FAB to products page"
```

---

### Task 8: Update Categories page

**Files:**
- Modify: `src/routes/dashboard/catalog/categories/+page.svelte`

- [ ] **Step 1: Read the current file to understand state variables and table structure**

Read `src/routes/dashboard/catalog/categories/+page.svelte` to identify: state variables for the create Sheet, the create button, and the table structure.

- [ ] **Step 2: Add imports, `processedCategories`, `cardColumns`, and `cardActions`**

Add to the existing imports:

```typescript
import { DataCards } from '$lib/components/ui/data-cards';
import { PageFAB } from '$lib/components/ui/fab';
import { invalidateAll } from '$app/navigation';
import type { Action } from '$lib/components/ui/data-cards';
```

Add in the `<script>` block after existing state vars (the file already defines `editingCategory`, `isEditOpen`, and a `openEdit(cat)` helper):

```typescript
const processedCategories = $derived(
  data.categories.map((row: any) => ({
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    description: row.description ?? '—',
  }))
);

const cardColumns = [
  { key: 'name',        label: 'Name',        primary: true },
  { key: 'prefix',      label: 'Prefix',      secondary: true },
  { key: 'description', label: 'Description' },
];

const cardActions: Action[] = [
  {
    label: 'Edit',
    onClick: (row: any) => {
      // Find the original row and open the edit sheet (same as desktop row action)
      const original = data.categories.find((c: any) => c.id === row.id);
      if (original) openEdit(original);
    },
  },
  {
    label: 'Delete',
    variant: 'destructive',
    onClick: async (row: any) => {
      const fd = new FormData();
      fd.set('id', row.id);
      await fetch('?/delete', { method: 'POST', body: fd });
      await invalidateAll();
    },
  },
];
```

- [ ] **Step 3: Hide the create button on mobile**

Find the `Sheet.Trigger` snippet (same pattern as Products: `{#snippet child({ props })}`). Add `hidden md:flex` to the inner `Button`'s class string.

- [ ] **Step 4: Add DataCards, wrap table, add FAB**

```svelte
<!-- Mobile -->
<div class="md:hidden">
  <DataCards columns={cardColumns} data={processedCategories} actions={cardActions} emptyMessage="No categories found." />
</div>

<!-- Desktop -->
<div class="hidden md:block">
  <!-- existing table, unchanged -->
</div>

<PageFAB label="Add category" onclick={() => isCreateOpen = true} />
```

The variable is named `isCreateOpen` in this file — confirmed.

- [ ] **Step 5: Verify and commit**

```bash
pnpm check
git add src/routes/dashboard/catalog/categories/+page.svelte
git commit -m "feat: add mobile card view and FAB to categories page"
```

---

### Task 9: Update Orders page

**Files:**
- Modify: `src/routes/dashboard/sales/orders/+page.svelte`

- [ ] **Step 1: Read the file**

Read `src/routes/dashboard/sales/orders/+page.svelte` to understand state variables, the create button, and the table structure (specifically the `getStatusColor` or equivalent status color function).

- [ ] **Step 2: Add imports**

```typescript
import { DataCards } from '$lib/components/ui/data-cards';
import { PageFAB } from '$lib/components/ui/fab';
import { goto } from '$app/navigation';
import type { ActionsInput } from '$lib/components/ui/data-cards';
```

- [ ] **Step 3: Add `processedOrders`, `cardColumns`, and `cardActions`**

The page already defines `getStatusColor(status)` — reuse it for the badge. Add after existing state variables:

```typescript
const processedOrders = $derived(
  data.orders.map((row: any) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customer?.name ?? '—',
    status: row.status,
    total: row.totalAmount != null ? `ETB ${Number(row.totalAmount).toFixed(2)}` : '—',
    createdAt: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—',
  }))
);

const cardColumns = [
  { key: 'orderNumber',  label: 'Order',    primary: true },
  { key: 'customerName', label: 'Customer', secondary: true },
  { key: 'status',       label: 'Status',   badge: true,
    badgeClass: (v: unknown) => getStatusColor(String(v)) },
  { key: 'total',        label: 'Total' },
  { key: 'createdAt',    label: 'Date' },
];

// "Record Payment" is conditional — only shown for CONFIRMED or INVOICED orders
const cardActions: ActionsInput = (row) => {
  const actions = [
    { label: 'View Details', onClick: (r: any) => goto(`/dashboard/sales/orders/${r.id}`) },
  ];
  if (row.status === 'CONFIRMED' || row.status === 'INVOICED') {
    actions.push({ label: 'Record Payment', onClick: (r: any) => goto(`/dashboard/sales/orders/${r.id}/payments`) });
  }
  return actions;
};
```

- [ ] **Step 4: Hide create button on mobile, add DataCards, wrap table, add FAB**

The Orders page create button navigates to `/dashboard/sales/orders/create`. Find the button and add `hidden md:flex`.

```svelte
<!-- Mobile -->
<div class="md:hidden">
  <DataCards columns={cardColumns} data={processedOrders} actions={cardActions} emptyMessage="No orders found." />
</div>

<!-- Desktop -->
<div class="hidden md:block">
  <!-- existing table, unchanged -->
</div>

<PageFAB label="Create order" onclick={() => goto('/dashboard/sales/orders/create')} />
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm check
git add src/routes/dashboard/sales/orders/+page.svelte
git commit -m "feat: add mobile card view and FAB to orders page"
```

---

### Task 10: Update Customers page

**Files:**
- Modify: `src/routes/dashboard/customers/+page.svelte`

- [ ] **Step 1: Read the file**

Read `src/routes/dashboard/customers/+page.svelte`.

- [ ] **Step 2: Add imports**

```typescript
import { DataCards } from '$lib/components/ui/data-cards';
import { PageFAB } from '$lib/components/ui/fab';
```

- [ ] **Step 3: Add `processedCustomers` and `cardColumns`**

```typescript
const processedCustomers = $derived(
  data.customers.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? '—',
    phone: row.phone ?? '—',
    createdAt: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—',
  }))
);

const cardColumns = [
  { key: 'name',      label: 'Name',     primary: true },
  { key: 'email',     label: 'Email',    secondary: true },
  { key: 'phone',     label: 'Phone' },
  { key: 'createdAt', label: 'Joined' },
];
```

- [ ] **Step 4: Hide create button on mobile, add DataCards, wrap table, add FAB**

```svelte
<!-- Mobile -->
<div class="md:hidden">
  <DataCards columns={cardColumns} data={processedCustomers} emptyMessage="No customers found." />
</div>

<!-- Desktop -->
<div class="hidden md:block">
  <!-- existing table, unchanged -->
</div>

<PageFAB label="Add customer" onclick={() => isCreateOpen = true} />
```

Replace `isCreateOpen` with the actual Sheet open state variable name.

- [ ] **Step 5: Verify and commit**

```bash
pnpm check
git add src/routes/dashboard/customers/+page.svelte
git commit -m "feat: add mobile card view and FAB to customers page"
```

---

## Chunk 4: Inventory, Warehouses, Stock Takes, Users, Audit Pages

### Task 11: Update Inventory page

**Files:**
- Modify: `src/routes/dashboard/inventory/+page.svelte`

The inventory page has two tables: Live Levels (`data.stockLevels`) and Audit Trail (`data.recentTransactions`). Each gets its own DataCards block. The "Log Move" button opens an existing Sheet (`isTransactOpen`). Add FAB that sets `isTransactOpen = true`.

- [ ] **Step 1: Read the file**

Read `src/routes/dashboard/inventory/+page.svelte` in full.

- [ ] **Step 2: Add imports**

```typescript
import { DataCards } from '$lib/components/ui/data-cards';
import { PageFAB } from '$lib/components/ui/fab';
```

- [ ] **Step 3: Add processed data and column definitions**

```typescript
// Live Levels: data.stockLevels rows have shape { stock, product, warehouse }
const processedStockLevels = $derived(
  data.stockLevels.map((row: any) => {
    const qty = row.stock.quantity;
    const min = row.product.minStockLevel;
    const stockStatus = qty <= 0 ? 'Critical' : qty <= min ? 'Low' : 'OK';
    return {
      id: row.stock.id,
      productName: row.product.name,
      productSku: row.product.sku,
      warehouseName: row.warehouse.name,
      quantity: qty,
      stockStatus,
    };
  })
);

const stockLevelColumns = [
  { key: 'productName',  label: 'Product',   primary: true },
  { key: 'productSku',   label: 'SKU',       secondary: true },
  { key: 'stockStatus',  label: 'Status',    badge: true,
    badgeClass: (v: unknown) => {
      if (v === 'OK')       return 'bg-green-100 text-green-700';
      if (v === 'Low')      return 'bg-yellow-100 text-yellow-700';
      return 'bg-red-100 text-red-700';
    }
  },
  { key: 'warehouseName', label: 'Warehouse' },
  { key: 'quantity',      label: 'Quantity' },
];

// Audit Trail: data.recentTransactions rows have shape { tx, productName, productSku, warehouseName }
const processedTransactions = $derived(
  data.recentTransactions.map((row: any) => ({
    id: row.tx.id,
    productName: row.productName,
    productSku: row.productSku,
    warehouseName: row.warehouseName,
    transactionType: row.tx.transactionType,
    quantityChange: row.tx.quantityChange > 0 ? `+${row.tx.quantityChange}` : String(row.tx.quantityChange),
    createdAt: new Date(row.tx.createdAt).toLocaleDateString(),
  }))
);

const transactionColumns = [
  { key: 'productName',      label: 'Product',   primary: true },
  { key: 'warehouseName',    label: 'Warehouse', secondary: true },
  { key: 'transactionType',  label: 'Type',      badge: true },
  { key: 'quantityChange',   label: 'Change' },
  { key: 'createdAt',        label: 'Date' },
];
```

- [ ] **Step 4: Hide "Log Move" button on mobile**

Find the `<Sheet.Trigger>` wrapping the "Log Move" button. The button is inside a snippet with `{#snippet child({ props })}`. Add `hidden md:flex` to the inner Button's class.

- [ ] **Step 5: Add DataCards blocks and wrap existing tables**

For each table section (Live Levels and Audit Trail), add the mobile/desktop split:

```svelte
<!-- Live Levels section -->
<div class="md:hidden">
  <DataCards columns={stockLevelColumns} data={processedStockLevels} emptyMessage="No stock levels recorded." />
</div>
<div class="hidden md:block">
  <!-- existing stock levels Table.Root, unchanged -->
</div>

<!-- Audit Trail section -->
<div class="md:hidden">
  <DataCards columns={transactionColumns} data={processedTransactions} emptyMessage="No transactions recorded." />
</div>
<div class="hidden md:block">
  <!-- existing transactions Table.Root, unchanged -->
</div>
```

- [ ] **Step 6: Add PageFAB**

The "Log Move" Sheet uses `bind:open={isTransactOpen}`. Add FAB at the bottom of the template:

```svelte
<PageFAB label="Log stock move" onclick={() => isTransactOpen = true} />
```

- [ ] **Step 7: Verify and commit**

```bash
pnpm check
git add src/routes/dashboard/inventory/+page.svelte
git commit -m "feat: add mobile card views and FAB to inventory page"
```

---

### Task 12: Update Warehouses page

**Files:**
- Modify: `src/routes/dashboard/inventory/warehouses/+page.svelte`

- [ ] **Step 1: Read the file**

Read `src/routes/dashboard/inventory/warehouses/+page.svelte`.

- [ ] **Step 2: Add imports**

```typescript
import { DataCards } from '$lib/components/ui/data-cards';
import { PageFAB } from '$lib/components/ui/fab';
```

- [ ] **Step 3: Add processed data and columns**

```typescript
const processedWarehouses = $derived(
  data.warehouses.map((row: any) => ({
    id: row.id,
    name: row.name,
    location: row.location ?? '—',
    isActiveLabel: row.isActive ? 'Active' : 'Inactive',
  }))
);

const cardColumns = [
  { key: 'name',          label: 'Name',     primary: true },
  { key: 'location',      label: 'Location', secondary: true },
  { key: 'isActiveLabel', label: 'Status',   badge: true,
    badgeClass: (v: unknown) => v === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' },
];
```

- [ ] **Step 4: Hide create button, add DataCards, wrap table, add FAB**

```svelte
<div class="md:hidden">
  <DataCards columns={cardColumns} data={processedWarehouses} emptyMessage="No warehouses found." />
</div>
<div class="hidden md:block">
  <!-- existing table, unchanged -->
</div>

<PageFAB label="Add warehouse" onclick={() => isCreateOpen = true} />
```

Replace `isCreateOpen` with the actual create Sheet state variable name.

- [ ] **Step 5: Verify and commit**

```bash
pnpm check
git add src/routes/dashboard/inventory/warehouses/+page.svelte
git commit -m "feat: add mobile card view and FAB to warehouses page"
```

---

### Task 13: Update Stock Takes page

**Files:**
- Modify: `src/routes/dashboard/inventory/counts/+page.svelte`

Note: this page uses an **inline form toggle** (`showStartForm`) instead of a Sheet. The FAB sets `showStartForm = true` directly.

- [ ] **Step 1: Read the file**

Read `src/routes/dashboard/inventory/counts/+page.svelte` to understand the data shape and the `showStartForm` toggle.

- [ ] **Step 2: Add imports**

```typescript
import { DataCards } from '$lib/components/ui/data-cards';
import { PageFAB } from '$lib/components/ui/fab';
```

- [ ] **Step 3: Add processed data and columns**

The actual data shape is `{ count, warehouse, performedByName, itemStats }` — confirmed from the page source. The status values are `'IN_PROGRESS'` and `'CLOSED'`. The page already defines `statusLabel(status)` and `statusBadgeClass(status)` helpers — reuse them.

```typescript
const processedCounts = $derived(
  data.counts.map((row: any) => ({
    id: row.count.id,
    reference: `Count #${row.count.id.slice(0, 8)}`,
    warehouseName: row.warehouse.name,
    status: statusLabel(row.count.status),   // uses existing helper: 'In Progress' | 'Closed'
    startedAt: new Date(row.count.startedAt).toLocaleDateString(),
  }))
);

const cardColumns = [
  { key: 'reference',    label: 'Reference', primary: true },
  { key: 'warehouseName',label: 'Warehouse', secondary: true },
  { key: 'status',       label: 'Status',    badge: true,
    badgeClass: (_v: unknown) => statusBadgeClass(String(_v)) },
  { key: 'startedAt',    label: 'Date' },
];
```

- [ ] **Step 4: Hide the "Start New Count" button on mobile**

Find the button that toggles `showStartForm` and add `hidden md:flex` to its class.

- [ ] **Step 5: Add DataCards, wrap table, add FAB**

```svelte
<div class="md:hidden">
  <DataCards columns={cardColumns} data={processedCounts} emptyMessage="No stock takes found." />
</div>
<div class="hidden md:block">
  <!-- existing table, unchanged -->
</div>

<PageFAB label="Start stock take" onclick={() => showStartForm = true} />
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm check
git add src/routes/dashboard/inventory/counts/+page.svelte
git commit -m "feat: add mobile card view and FAB to stock takes page"
```

---

### Task 14: Update Users page

**Files:**
- Modify: `src/routes/dashboard/settings/users/+page.svelte`

Note: the create action uses a Dialog (not a Sheet). The `actions` per row are dynamic — available role-change options depend on the current row's role.

- [ ] **Step 1: Read the file**

Read `src/routes/dashboard/settings/users/+page.svelte` to understand: Dialog open state variable, the per-row role change actions, and user data shape.

- [ ] **Step 2: Add imports**

```typescript
import { DataCards } from '$lib/components/ui/data-cards';
import { PageFAB } from '$lib/components/ui/fab';
import { invalidateAll } from '$app/navigation';
import type { ActionsInput } from '$lib/components/ui/data-cards/utils';
```

- [ ] **Step 3: Add processed data and columns**

```typescript
const processedUsers = $derived(
  data.users.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—',
  }))
);

const cardColumns = [
  { key: 'name',      label: 'Name',     primary: true },
  { key: 'email',     label: 'Email',    secondary: true },
  { key: 'role',      label: 'Role',     badge: true },
  { key: 'createdAt', label: 'Joined' },
];

// Confirmed action names from the actual page:
//   ?/updateRole  (field: userId, role)
//   ?/toggleVerified  (field: userId) — deactivates if emailVerified=true, reactivates if false
const cardActions: ActionsInput = (row) => {
  const allRoles = ['admin', 'sales', 'warehouse'];
  const roleActions = allRoles
    .filter(r => r !== row.role)
    .map(r => ({
      label: `Change to ${r}`,
      onClick: async (r2: any) => {
        const fd = new FormData();
        fd.set('userId', r2.id);
        fd.set('role', r);
        await fetch('?/updateRole', { method: 'POST', body: fd });
        await invalidateAll();
      },
    }));

  const toggleLabel = row.emailVerified ? 'Deactivate' : 'Reactivate';
  const toggleAction = {
    label: toggleLabel,
    variant: (row.emailVerified ? 'destructive' : 'default') as 'destructive' | 'default',
    onClick: async (r2: any) => {
      const fd = new FormData();
      fd.set('userId', r2.id);
      await fetch('?/toggleVerified', { method: 'POST', body: fd });
      await invalidateAll();
    },
  };

  return [...roleActions, toggleAction];
};
```

Note: Replace `?/changeRole` and `?/removeUser` with the actual action names from this page's server file.

- [ ] **Step 4: Hide invite button on mobile, add DataCards, wrap table, add FAB**

The invite button opens a Dialog. The state variable is `createDialogOpen`. Find the Dialog trigger button and add `hidden md:flex` to its class.

```svelte
<div class="md:hidden">
  <DataCards columns={cardColumns} data={processedUsers} actions={cardActions} emptyMessage="No users found." />
</div>
<div class="hidden md:block">
  <!-- existing table, unchanged -->
</div>

<PageFAB label="Invite user" onclick={() => createDialogOpen = true} />
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm check
git add src/routes/dashboard/settings/users/+page.svelte
git commit -m "feat: add mobile card view and FAB to users page"
```

---

### Task 15: Audit Create Order page

**Files:**
- Modify: `src/routes/dashboard/sales/orders/create/+page.svelte`

- [ ] **Step 1: Read the file**

Read `src/routes/dashboard/sales/orders/create/+page.svelte`.

- [ ] **Step 2: Find all multi-column form grids**

Search for `grid-cols-2` patterns. Every multi-column grid must have `grid-cols-1 md:grid-cols-2` (or appropriate responsive prefix).

Change every occurrence of `grid grid-cols-2` → `grid grid-cols-1 md:grid-cols-2`.

- [ ] **Step 3: Check for horizontal overflow at 375px**

In DevTools (375px wide), scroll through the create order page. Look for any element that causes the page to scroll horizontally. Common culprits: fixed-width inputs, non-wrapping flex rows, oversized buttons.

Fix any overflow by adding `min-w-0` to flex children or `w-full` to inputs that have fixed widths.

- [ ] **Step 4: Verify and commit**

```bash
pnpm check
git add src/routes/dashboard/sales/orders/create/+page.svelte
git commit -m "fix: responsive form grids on create order page"
```

---

### Task 16: Audit Customer Detail page

**Files:**
- Modify: `src/routes/dashboard/customers/[id]/+page.svelte`

- [ ] **Step 1: Read the file**

Read `src/routes/dashboard/customers/[id]/+page.svelte`.

- [ ] **Step 2: Find all side-by-side panel layouts**

Search for `flex-row` or `grid-cols-2` in the template. Every side-by-side layout must stack on mobile:

- `flex flex-row` → `flex flex-col md:flex-row`
- `grid grid-cols-2` → `grid grid-cols-1 md:grid-cols-2`

- [ ] **Step 3: Check for overflow at 375px**

In DevTools (375px wide), scroll the customer detail page. Fix any horizontal overflow as described in Task 15 Step 3.

- [ ] **Step 4: Verify and commit**

```bash
pnpm check
git add "src/routes/dashboard/customers/[id]/+page.svelte"
git commit -m "fix: responsive layout on customer detail page"
```

---

### Task 17: Final visual verification across all pages

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test at 375px (iPhone SE)**

Using DevTools device emulation at 375px × 812px, verify each page:

| Page | Check |
|------|-------|
| Dashboard | No overflow; stat cards stack to single column |
| Products | Card view visible; FAB above bottom nav; create sheet opens from FAB |
| Categories | Card view; FAB opens create sheet |
| Orders | Card view with status badge colors; FAB navigates to create |
| Customers | Card view; FAB opens create sheet |
| Inventory | Two separate card views; FAB opens Log Move sheet |
| Warehouses | Card view; FAB opens create sheet |
| Stock Takes | Card view; FAB shows inline form |
| Users | Card view; FAB opens invite dialog |
| Create Order | Form stacks single-column; no overflow |
| Customer Detail | Panels stack; no overflow |

- [ ] **Step 3: Test at 320px (narrow foldable)**

Switch to 320px width. Verify:
- DataCards card bodies switch to single-column grid (no `xs:grid-cols-2`)
- No horizontal overflow on any page
- BottomNav tabs are still tappable (≥44px wide each)

- [ ] **Step 4: Test at 768px (tablet)**

Switch to 768px. Verify:
- BottomNav is hidden
- Sidebar appears
- Tables visible (DataCards hidden)
- FABs hidden
- Create buttons visible in page headers

- [ ] **Step 5: Commit if any minor fixes were made**

```bash
git add -p
git commit -m "fix: responsive polish from final visual verification"
```
