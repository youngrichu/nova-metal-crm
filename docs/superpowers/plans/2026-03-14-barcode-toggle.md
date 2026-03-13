# Barcode Feature Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make barcode functionality (product fields, scanner panels) hidden by default and togglable via an admin setting in System Config.

**Architecture:** A new `+layout.server.ts` at the dashboard root reads a single `barcode_enabled` key from the `systemSettings` table once per request and exposes `barcodeEnabled: boolean` to all child pages via SvelteKit's layout data cascade. Six UI locations wrap their barcode elements in `{#if data.barcodeEnabled}`. The System Config settings page gets a new "Barcode Features" card with a checkbox to toggle the setting.

**Tech Stack:** SvelteKit 5 (Svelte 5 runes), Drizzle ORM, PostgreSQL, Vitest (existing test runner), shadcn-svelte components.

**Spec:** `docs/superpowers/specs/2026-03-14-barcode-toggle-design.md`

---

## Chunk 1: Layout server + settings backend

### Task 1: Create the dashboard layout server

**Files:**
- Create: `src/routes/dashboard/+layout.server.ts`

This file does not currently exist. It reads `barcode_enabled` from `systemSettings` and exposes `barcodeEnabled: boolean` to all dashboard pages.

- [ ] **Step 1: Create the file**

```ts
// src/routes/dashboard/+layout.server.ts
import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
    try {
        const row = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.key, 'barcode_enabled'))
            .limit(1);
        const barcodeEnabled = row[0]?.value === 'true';
        return { barcodeEnabled };
    } catch {
        return { barcodeEnabled: false };
    }
};
```

Key points:
- No auth check — each page handles its own auth. This is a read-only, non-sensitive boolean.
- Wrapped in try/catch so a DB hiccup doesn't break all dashboard pages.
- Absent key → `false` (because `undefined === 'true'` is false).
- SvelteKit merges this with each page's own load return value. `data.barcodeEnabled` is available in all dashboard page components without any per-page change to their server files.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40
```

Expected: No errors from the new file. (Existing errors, if any, are pre-existing.)

- [ ] **Step 3: Commit**

```bash
git add src/routes/dashboard/+layout.server.ts
git commit -m "feat: add dashboard layout server to expose barcodeEnabled setting"
```

---

### Task 2: Register `barcode_enabled` in the settings server action

**Files:**
- Modify: `src/routes/dashboard/settings/system/+page.server.ts`

The `SETTING_KEYS` tuple and `DEFAULTS` map need to know about `barcode_enabled`. The existing `update` action will then persist it correctly.

- [ ] **Step 1: Add to `SETTING_KEYS` and `DEFAULTS`**

In `+page.server.ts`, find the two constants at the top and update them:

```ts
// Before:
const SETTING_KEYS = ['vat_rate', 'markup_retail', 'markup_wholesale', 'markup_vip', 'markup_preferred', 'currency_code', 'currency_locale'] as const;

const DEFAULTS: Record<string, string> = {
    vat_rate: '0.15',
    markup_retail: '1.15',
    markup_wholesale: '1.05',
    markup_vip: '1.05',
    markup_preferred: '1.08',
    currency_code: 'ETB',
    currency_locale: 'en-ET'
};

// After:
const SETTING_KEYS = ['vat_rate', 'markup_retail', 'markup_wholesale', 'markup_vip', 'markup_preferred', 'currency_code', 'currency_locale', 'barcode_enabled'] as const;

const DEFAULTS: Record<string, string> = {
    vat_rate: '0.15',
    markup_retail: '1.15',
    markup_wholesale: '1.05',
    markup_vip: '1.05',
    markup_preferred: '1.08',
    currency_code: 'ETB',
    currency_locale: 'en-ET',
    barcode_enabled: 'false'
};
```

No other changes to the server file are needed — the hidden-field trick ensures `barcode_enabled` always arrives as `'true'` or `'false'` (never empty), so the `if (!raw) continue` guard passes, and no special-case validation is required.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/dashboard/settings/system/+page.server.ts
git commit -m "feat: register barcode_enabled in system settings keys and defaults"
```

---

### Task 3: Add Barcode Features card to System Config UI

**Files:**
- Modify: `src/routes/dashboard/settings/system/+page.svelte`

Add a new card section below the "Currency Formatting" section (line ~168), before the save button div.

- [ ] **Step 1: Add the Barcode Features card**

Find the closing `</section>` of the Currency Formatting section (around line 168) and the save button `<div class="flex justify-end">` that follows it. Insert the new card between them:

```svelte
<!-- Barcode Features -->
<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
    <div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
        <h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
            <Scan class="w-4 h-4 text-primary" /> Barcode Features
        </h2>
    </div>
    <div class="p-6 md:p-8">
        <label class="flex items-start gap-4 cursor-pointer group">
            <div class="relative mt-0.5">
                <input
                    type="checkbox"
                    name="barcode_enabled"
                    value="true"
                    checked={data.settings.barcode_enabled === 'true'}
                    class="sr-only peer"
                />
                <div class="w-5 h-5 border-2 border-foreground/30 bg-muted/30 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                    <svg class="w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>
            <input type="hidden" name="barcode_enabled" value="false" />
            <div>
                <p class="text-sm font-bold tracking-wide">Enable Barcode Features</p>
                <p class="text-xs text-muted-foreground/60 mt-0.5">Shows barcode fields on products and enables the barcode scanner during stock-takes.</p>
            </div>
        </label>
    </div>
</section>
```

**Important DOM order note:** The checkbox comes first in the DOM, the `<input type="hidden" value="false">` comes after. This is deliberate:
- When **unchecked**: only the hidden field submits → `formData.get('barcode_enabled')` → `'false'` ✓
- When **checked**: checkbox submits `'true'` first, hidden field submits `'false'` second → `formData.get()` returns the first value → `'true'` ✓
- The custom `<div>` styled with `peer-checked:` is a sibling of the checkbox inside `.relative`, so Tailwind's peer CSS works correctly.

- [ ] **Step 2: Add `Scan` to the icon imports**

At the top of the `<script>` block, `Scan` needs to be imported from `lucide-svelte`. The existing import line is:

```ts
import { Settings, DollarSign, Globe, Save } from 'lucide-svelte';
```

Change it to:

```ts
import { Settings, DollarSign, Globe, Save, Scan } from 'lucide-svelte';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40
```

Expected: No new errors.

- [ ] **Step 4: Manual smoke test**

1. Run `pnpm dev`
2. Log in as admin → go to `/dashboard/settings/system`
3. Confirm the "Barcode Features" card appears below Currency Formatting
4. Check the checkbox and click "Save Settings" — toast "System settings saved" should appear
5. Reload the page — checkbox should be checked (value persisted)
6. Uncheck and save — reload confirms it's unchecked

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard/settings/system/+page.svelte
git commit -m "feat: add Barcode Features toggle card to System Config settings"
```

---

## Chunk 2: Conditional UI across pages

### Task 4: Hide barcode elements in the Product Catalog page

**Files:**
- Modify: `src/routes/dashboard/catalog/products/+page.svelte`

Three locations need `{#if data.barcodeEnabled}` guards:
1. Product create form — the Barcode / EAN input (around line 158–161)
2. Products table — the `Table.Head` column header (line 237) and `Table.Cell` data cell (lines 261–263)
3. Product edit form — the Barcode / EAN input (lines 409–412)

- [ ] **Step 1: Guard the create form barcode field**

Find:
```svelte
<div class="space-y-2 group">
    <Label for="barcode" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Barcode / EAN</Label>
    <Input id="barcode" name="barcode" type="text" placeholder="Scan or type barcode..." class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all" />
</div>
```

Wrap with:
```svelte
{#if data.barcodeEnabled}
<div class="space-y-2 group">
    <Label for="barcode" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Barcode / EAN</Label>
    <Input id="barcode" name="barcode" type="text" placeholder="Scan or type barcode..." class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all" />
</div>
{/if}
```

- [ ] **Step 2: Guard the table header cell**

Find:
```svelte
<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden lg:table-cell">Barcode</Table.Head>
```

Wrap with:
```svelte
{#if data.barcodeEnabled}
<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden lg:table-cell">Barcode</Table.Head>
{/if}
```

- [ ] **Step 3: Guard the table data cell**

Find:
```svelte
<Table.Cell class="hidden lg:table-cell px-6 py-4 align-middle">
    <span class="font-mono text-[11px] text-muted-foreground/60">{row.product.barcode ?? '—'}</span>
</Table.Cell>
```

Wrap with:
```svelte
{#if data.barcodeEnabled}
<Table.Cell class="hidden lg:table-cell px-6 py-4 align-middle">
    <span class="font-mono text-[11px] text-muted-foreground/60">{row.product.barcode ?? '—'}</span>
</Table.Cell>
{/if}
```

- [ ] **Step 4: Guard the edit form barcode field**

Find:
```svelte
<div class="space-y-2 group">
    <Label for="edit-barcode" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Barcode / EAN</Label>
    <Input id="edit-barcode" name="barcode" type="text" value={editingProduct.product.barcode ?? ''} placeholder="Scan or type barcode..." class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all" />
</div>
```

Wrap with:
```svelte
{#if data.barcodeEnabled}
<div class="space-y-2 group">
    <Label for="edit-barcode" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Barcode / EAN</Label>
    <Input id="edit-barcode" name="barcode" type="text" value={editingProduct.product.barcode ?? ''} placeholder="Scan or type barcode..." class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all" />
</div>
{/if}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40
```

Expected: No new errors.

- [ ] **Step 6: Manual smoke test**

With `barcode_enabled = false` (default):
1. Go to `/dashboard/catalog/products`
2. Confirm no "Barcode" column in the table
3. Open "Add Product" — confirm no Barcode / EAN field
4. Open edit on any product — confirm no Barcode / EAN field

Then enable barcode in settings and repeat — all three should reappear.

- [ ] **Step 7: Commit**

```bash
git add src/routes/dashboard/catalog/products/+page.svelte
git commit -m "feat: hide barcode fields in product catalog when barcode_enabled is false"
```

---

### Task 5: Hide barcode elements in the Inventory Count entry page

**Files:**
- Modify: `src/routes/dashboard/inventory/counts/[id]/+page.svelte`

Two locations:
1. The entire "Barcode Scanner" card (lines 123–144)
2. The barcode sub-text in table rows (lines 176–178)

- [ ] **Step 1: Guard the Barcode Scanner card**

Find:
```svelte
<!-- Barcode Scanner -->
<div class="border-2 border-foreground/10 bg-card p-6 shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
    <div class="flex items-center gap-3 mb-4">
        <Scan class="w-5 h-5 text-primary" />
        <h2 class="text-sm font-black tracking-widest uppercase">Barcode Scanner</h2>
    </div>
    ...
</div>
```

Wrap the entire card div with:
```svelte
{#if data.barcodeEnabled}
<!-- Barcode Scanner -->
<div class="border-2 border-foreground/10 bg-card p-6 shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
    ...
</div>
{/if}
```

- [ ] **Step 2: Guard the barcode sub-text in table rows**

Find:
```svelte
{#if row.product.barcode}
    <div class="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{row.product.barcode}</div>
{/if}
```

Wrap with:
```svelte
{#if data.barcodeEnabled && row.product.barcode}
    <div class="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{row.product.barcode}</div>
{/if}
```

Note: Combine the conditions into a single `{#if}` — no need for nesting.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40
```

- [ ] **Step 4: Manual smoke test**

With `barcode_enabled = false`:
1. Go to any inventory count session entry page
2. Confirm the "Barcode Scanner" card is absent
3. Confirm no barcode sub-text under product names in the table

Enable barcode → both should reappear.

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard/inventory/counts/[id]/+page.svelte
git commit -m "feat: hide barcode scanner in inventory count page when barcode_enabled is false"
```

---

### Task 6: Hide barcode scanner in the Inventory Adjustment sheet

**Files:**
- Modify: `src/routes/dashboard/inventory/+page.svelte`

The "Scan Barcode" panel is inside the transaction sheet form (around lines 129–144).

- [ ] **Step 1: Guard the Scan Barcode panel**

Find:
```svelte
<!-- Barcode Scanner Input -->
<div class="space-y-2">
    <Label class="text-xs font-bold tracking-wider uppercase text-foreground/70">Scan Barcode</Label>
    <div class="relative">
        <Input
            bind:ref={barcodeInputEl}
            bind:value={barcodeInput}
            onkeydown={handleBarcodeScan}
            placeholder="Focus here and scan barcode..."
            class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg font-mono transition-all"
        />
        {#if barcodeError}
            <p class="text-xs text-rose-500 mt-1 font-medium">{barcodeError}</p>
        {/if}
    </div>
</div>
```

Wrap with:
```svelte
{#if data.barcodeEnabled}
<!-- Barcode Scanner Input -->
<div class="space-y-2">
    ...
</div>
{/if}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40
```

- [ ] **Step 3: Manual smoke test**

With `barcode_enabled = false`:
1. Go to `/dashboard/inventory`
2. Open the transaction sheet (add stock in / out)
3. Confirm the "Scan Barcode" input is absent

Enable barcode → it reappears.

- [ ] **Step 4: Final end-to-end check**

With `barcode_enabled = false` (go to Settings → System Config → uncheck and save):
- `/dashboard/catalog/products` — no barcode column, no barcode field in create/edit
- `/dashboard/inventory/counts/[any-id]` — no scanner card, no barcode sub-text
- `/dashboard/inventory` → transaction sheet — no scan input

With `barcode_enabled = true` (check and save):
- All of the above reappear and function as before

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard/inventory/+page.svelte
git commit -m "feat: hide barcode scanner in inventory adjustment sheet when barcode_enabled is false"
```
