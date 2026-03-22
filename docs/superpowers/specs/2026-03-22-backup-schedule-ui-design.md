# Backup Schedule Configuration UI — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Add a "Backup Schedule" card to the Backup & Export settings page that lets admins configure whether automated backups run daily or weekly, and at what time (and day, for weekly). The schedule is stored in the existing `system_settings` key-value table and read by `backup.sh` at runtime.

---

## Goals

- Let admins configure backup frequency (daily/weekly), hour, and day of week from the UI
- No new DB migration — reuse the existing `system_settings` key-value table
- Existing deployments are unaffected (default matches the current hardcoded 2am daily schedule)
- Backup container requires no restart when the schedule changes

---

## Non-Goals

- Backup-on-demand triggering (already handled by the Export card)
- Sub-hourly schedules
- Multiple concurrent schedules
- Notification when a backup completes

---

## Data & Persistence

One new key in the existing `system_settings` table:

| Key | Value (JSON string) |
|---|---|
| `backup_schedule` | `{"frequency":"daily","hour":2}` |
| `backup_schedule` | `{"frequency":"weekly","hour":2,"dayOfWeek":0}` |

**Fields:**
- `frequency`: `"daily"` or `"weekly"`
- `hour`: integer 0–23 (hour of day in 24h, local server time)
- `dayOfWeek`: integer 0–6 (0 = Sunday), required when `frequency` is `"weekly"`, omitted otherwise

**Default (key absent):** `{"frequency":"daily","hour":2}` — matches the current hardcoded cron so existing deployments behave identically after upgrade.

Uses the same `insert().onConflictDoUpdate()` upsert pattern as all other `system_settings` writes in the codebase.

---

## API Endpoints

### `GET /api/backup/schedule`

- Admin-only (403 if not admin — matches existing `/api/backup` pattern)
- Reads `backup_schedule` key from `system_settings`
- Returns parsed JSON with default fallback if key is absent:
  ```json
  { "frequency": "daily", "hour": 2 }
  ```
- Returns 500 if the stored value fails JSON parsing (corrupt data guard)

### `POST /api/backup/schedule`

- Admin-only (403 if not admin)
- Accepts JSON body: `{ frequency, hour, dayOfWeek? }`
- Validation:
  - `frequency` must be `"daily"` or `"weekly"`
  - `hour` must be integer 0–23
  - `dayOfWeek` must be integer 0–6 when `frequency` is `"weekly"`, ignored otherwise
- On success: upserts `backup_schedule` key, returns `{ success: true }`
- On validation failure: returns 400 with `{ message: "..." }`

---

## `backup.sh` Changes

At the top of `scripts/backup.sh`, before running `pg_dump`, add a schedule check:

1. Query `system_settings` via `psql` for the `backup_schedule` value
2. If the key is absent, default to `{"frequency":"daily","hour":2}`
3. Parse JSON with `python3 -c` (available in `postgres:16-alpine`)
4. Compare current hour (and day of week for weekly) against the schedule
5. If the current time does not match, print a skip message and `exit 0`
6. If it matches, proceed with the backup as normal

The check uses the container's local time. The backup container does not need to be restarted when the schedule changes — the next hourly cron tick will read the updated value from Postgres.

---

## `docker-compose.yml` Change

The backup container entrypoint cron expression changes from:

```
0 2 * * *   (daily at 2am — hardcoded)
```

to:

```
0 * * * *   (every hour — schedule logic moves to backup.sh)
```

The container still runs `crond` with a single cron entry; only the schedule string changes.

---

## UI — Backup Schedule Card

Added as a new `<section>` card on `src/routes/dashboard/settings/backup/+page.svelte`, positioned between the "Backup Information" card and the "System Updates" card. Styled consistently with the existing cards.

### Layout

```text
┌─────────────────────────────────────────────────────┐
│ CLOCK ICON  BACKUP SCHEDULE                         │
├─────────────────────────────────────────────────────┤
│ "Automated backups run on the schedule below..."    │
│                                                     │
│  [ DAILY ]  [ WEEKLY ]                              │
│                                                     │
│  Time:  [ 2:00 AM ▾ ]                               │
│  Day:   [ Sunday  ▾ ]   ← only shown for weekly     │
│                                                     │
│  [ SAVE SCHEDULE ]                                  │
└─────────────────────────────────────────────────────┘
```

### State

- On mount: calls `GET /api/backup/schedule` and pre-fills the form
- Loading state: controls disabled while fetching initial schedule
- Save: calls `POST /api/backup/schedule`, shows success/error toast
- Saving state: Save button disabled while request is in flight

### Controls

- **Daily / Weekly toggle:** Two buttons styled like the pricing-tier buttons used on the order create page (border-2, active state uses `bg-foreground text-background`)
- **Time dropdown:** 12h format, "12:00 AM" through "11:00 PM" (maps to hour 0–23)
- **Day of week dropdown:** Sunday through Saturday (maps to 0–6), only rendered when Weekly is selected
- **Save Schedule button:** Same style as the Export button (tall, bold, offset shadow)

### Error Handling

- Load failure: show inline error text ("Could not load schedule"), controls remain disabled
- Save failure: toast error with message from API
- Save success: toast "Backup schedule saved"

---

## Testing

- Unit tests are not applicable (no pure logic to unit-test; the schedule check in `backup.sh` is integration-level)
- Manual test checklist:
  - [ ] Load page as admin → form pre-fills with current schedule
  - [ ] Change to Weekly, select day + time → save → reload → verify persisted
  - [ ] Change back to Daily → save → reload → verify persisted
  - [ ] Load page as non-admin → Backup tab not visible (hidden by nav role filter)
  - [ ] POST to `/api/backup/schedule` with invalid data → 400 returned

---

## Rollout Notes

- Default value (`daily` at `2:00 AM`) is inserted on first save or read — no migration required
- `docker-compose.yml` change (hourly cron) must be deployed together with the `backup.sh` change
- Existing deployments that never visit the schedule UI continue to get the same daily 2am backup (the `backup.sh` default path)
