# Barcode Feature Toggle — Design Spec

**Date:** 2026-03-14
**Status:** Draft

## Overview

The barcode feature (product barcode field + inventory count scanner + inventory adjustment scanner) was implemented in Phase 4 but the business currently does not use barcodes on their physical metal bar products. This spec covers making the entire barcode feature optional via an admin-controlled setting, defaulting to off.

## Background

Barcodes could eventually be useful if the business attaches labels to storage bins/racks or bundle tags — the inventory count scanner's job is to jump focus to a product row by scanning a code. For now, the feature should be hidden by default and enableable when needed.

## Storage

A new row in the existing `systemSettings` key-value table:

- `key`: `barcode_enabled`
- `value`: `'false'` (default — feature off)

No database schema migration required. The `systemSettings` table already supports arbitrary key-value pairs.

If the key is absent from the table (e.g. fresh install before settings are saved), treat it as `'false'`.

## Settings UI

A new **"Barcode Features"** card is added to `/dashboard/settings/system`, below the existing "Currency Formatting" card.

- Contains a single checkbox: **"Enable Barcode Features"**
- Helper text: "Shows barcode fields on products and enables the barcode scanner during stock-takes."
- Admin-only (existing role guard applies)
- Saved via the existing `?/update` form action

### Checkbox/FormData handling

HTML checkboxes do not submit when unchecked. To handle this correctly:
- Pair the checkbox with a `<input type="hidden" name="barcode_enabled" value="false">` that always submits
- When checked, the checkbox's `value="true"` overrides the hidden field in FormData
- The server action reads the value and stores `'true'` or `'false'` as a string, consistent with other settings

Because the hidden field always submits a non-empty string (`'false'` or `'true'`), the existing `if (!raw) continue` guard in the `update` action passes correctly — no changes to the action's loop logic are required.

`barcode_enabled` is added to `SETTING_KEYS` and `DEFAULTS` (default `'false'`) in `+page.server.ts`.

## Loading Strategy

A new file `src/routes/dashboard/+layout.server.ts` is created (this file does not currently exist — today the dashboard layout is Svelte-only). It reads `barcode_enabled` from `systemSettings` once per request and exposes `barcodeEnabled: boolean` in layout data. All child pages inherit it via SvelteKit's layout data cascade — no per-page queries needed.

Absent key → `false`. Value `'true'` → `true`, anything else → `false`.

## Affected UI Elements

When `barcodeEnabled` is `false`, the following are hidden:

| Location | Hidden element |
|---|---|
| Product create form | Barcode / EAN input field |
| Product edit form | Barcode / EAN input field |
| Product table | Both the "Barcode" `Table.Head` column header **and** the corresponding `Table.Cell` data cells |
| Inventory Count entry page (`/dashboard/inventory/counts/[id]`) | Entire "Barcode Scanner" card |
| Inventory Count table rows | Barcode sub-text under product name |
| Inventory adjustment sheet (`/dashboard/inventory`) | "Scan Barcode" input panel inside the transaction sheet |

When `barcodeEnabled` is `true`, behaviour is identical to the current implementation.

## Data Preservation

Disabling the feature hides barcode data from the UI but does not modify or delete values in the database. Re-enabling restores them immediately.

## Out of Scope

- Clearing barcode values from the DB when disabled
- Any new barcode scanning workflows
- Per-user or per-warehouse barcode settings
