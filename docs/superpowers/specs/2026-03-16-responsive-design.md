# Responsive Design Spec
**Date:** 2026-03-16
**Status:** Approved

## Overview

Make the entire Nova dashboard app responsive across phones (320px+), foldable phones (unfolded ~600px), tablets (768px+), and desktop (1024px+). The app is built with SvelteKit 2 + Tailwind CSS 4 + bits-ui.

Some responsiveness already exists (sidebar collapses to a sheet on mobile, main padding scales, some table columns hide at breakpoints). This spec covers the remaining gaps with a component-first approach.

---

## Breakpoints

Add a custom `xs` breakpoint. The full tier system:

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

---

## New Components

### 1. `BottomNav` — `src/lib/components/layout/BottomNav.svelte`

Phone-only navigation bar. Hidden at `md+` (tablet and above keep the existing sidebar).

**Tabs (4):**
- Dashboard → `/dashboard`
- Orders → `/dashboard/sales/orders`
- Catalog → `/dashboard/catalog/products`
- More → opens a bottom sheet

**"More" sheet contents:**
- Inventory → `/dashboard/inventory`
- Customers → `/dashboard/customers`
- Settings → `/dashboard/settings`

**Behaviour:**
- Fixed to the bottom of the viewport
- Active tab highlighted with primary color
- "More" sheet uses bits-ui `Sheet` with `side="bottom"`, `rounded-t-xl`
- Respects iOS safe area via `pb-safe` (or `padding-bottom: env(safe-area-inset-bottom)`)

**Visibility:** `block md:hidden` wrapper

---

### 2. `DataCards` — `src/lib/components/ui/data-cards/DataCards.svelte`

Generic card renderer for list data. Used on mobile in place of the existing `Table`.

**Props:**
```typescript
type Column = {
  key: string;
  label: string;
  primary?: boolean;    // rendered as card title
  secondary?: boolean;  // rendered as subtitle under title
  badge?: boolean;      // rendered as a badge (status chips)
  hideInCard?: boolean; // omit from card view entirely
};

type Action = {
  label: string;
  onClick: (row: Record<string, unknown>) => void;
  variant?: 'default' | 'destructive';
};

interface Props {
  columns: Column[];
  data: Record<string, unknown>[];
  actions?: Action[];   // appear in ⋯ dropdown menu on each card
  keyField?: string;    // default: 'id'
}
```

**Card anatomy:**
- Header row: `primary` field (bold title) + `secondary` field (muted subtitle) on the left; badge field + `⋯` actions menu on the right
- Body: 2-column grid of remaining label/value pairs
- Actions: bits-ui `DropdownMenu` triggered by `⋯` button

**Visibility:** component is always rendered as cards. Usage pattern per page:
```svelte
<!-- Mobile: cards -->
<div class="md:hidden">
  <DataCards {columns} {data} {actions} />
</div>
<!-- Tablet+: table -->
<div class="hidden md:block">
  <Table>...</Table>
</div>
```

---

### 3. `PageFAB` — `src/lib/components/ui/fab/PageFAB.svelte`

Floating action button for the primary create action on list pages. Mobile-only.

**Props:**
```typescript
interface Props {
  onclick: () => void;
  label: string; // used as aria-label
}
```

**Behaviour:**
- Fixed position: `bottom-20 right-4` (clears the bottom nav bar)
- `w-14 h-14` round button, primary color, drop shadow
- `+` icon (lucide `Plus`)
- Hidden on `md+`: `md:hidden`
- Accessible: `aria-label={label}`

---

## Layout Changes

### `src/routes/dashboard/+layout.svelte`
- Add `<BottomNav />` as a sibling to `<AppSidebar />` and the main content div
- Add `pb-20 md:pb-0` to `<main>` so content clears the bottom nav on mobile

### `src/lib/components/layout/AppHeader.svelte`
- Wrap existing "Create" / primary action buttons with `hidden md:flex` so they disappear on mobile (replaced by FAB)

---

## Per-Page Changes

For each page listed below, add `DataCards` (mobile) alongside the existing `Table` (tablet+), and add `PageFAB` where noted.

| Page | Route | DataCards | PageFAB |
|---|---|---|---|
| Products | `/dashboard/catalog/products` | ✅ | ✅ Create product |
| Categories | `/dashboard/catalog/categories` | ✅ | ✅ Create category |
| Orders | `/dashboard/sales/orders` | ✅ | ✅ Create order |
| Customers | `/dashboard/customers` | ✅ | — (view only) |
| Inventory | `/dashboard/inventory` | ✅ | — |
| Warehouses | `/dashboard/inventory/warehouses` | ✅ | ✅ Create warehouse |
| Stock Counts | `/dashboard/inventory/counts` | ✅ | ✅ Create count |
| Users | `/dashboard/settings/users` | ✅ | ✅ Invite user |

### Create Order page (`/dashboard/sales/orders/create`)
- Audit all multi-column form grids → ensure `grid-cols-1 md:grid-cols-2` pattern

### Customer detail page (`/dashboard/customers/[id]`)
- Audit layout for mobile overflow

---

## What Stays the Same

- Dashboard analytics page — already has responsive grids
- Settings pages (profile, system, backup) — simple single-column forms
- Login page — already mobile-friendly
- All create/edit sheets — already go full-width on mobile via `sm:max-w-[700px]`
- Sidebar — already collapses to sheet on mobile; unchanged for tablet+

---

## Implementation Order

1. Add `xs` breakpoint to `app.css`
2. Build `BottomNav` component + wire into dashboard layout
3. Build `DataCards` component
4. Build `PageFAB` component
5. Update `AppHeader` to hide action buttons on mobile
6. Apply `DataCards` + `PageFAB` to each of the 8 pages
7. Audit create order page and customer detail page
