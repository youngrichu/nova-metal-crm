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
- `hour`: integer 0–23 (hour of day in 24h, server local time)
- `dayOfWeek`: integer 0–6 (0 = Sunday), required when `frequency` is `"weekly"`, silently stripped by the POST handler and not stored when `frequency` is `"daily"`. The GET handler never returns `dayOfWeek` for a daily schedule.

**Default (key absent):** `{"frequency":"daily","hour":2}` — matches the current hardcoded cron so existing deployments behave identically after upgrade.

Uses the same `insert().onConflictDoUpdate()` upsert pattern as all other `system_settings` writes in the codebase. The `updatedBy` field must be set to `locals.user.id` on every save to preserve the audit trail.

---

## API Endpoints

### `GET /api/backup/schedule`

- Admin-only (403 if not admin — matches existing `/api/backup` pattern)
- Reads `backup_schedule` key from `system_settings`
- If key is absent: returns the default `{"frequency":"daily","hour":2}`
- If stored JSON fails to parse **or** has an invalid shape (e.g. unknown frequency, hour out of 0–23 range): returns the default rather than erroring, to prevent a bad stored value from breaking the UI
- Returns:
  ```json
  { "frequency": "daily", "hour": 2 }
  ```
  or
  ```json
  { "frequency": "weekly", "hour": 2, "dayOfWeek": 0 }
  ```

### `POST /api/backup/schedule`

- Admin-only (403 if not admin)
- Accepts JSON body
- Validation rules:
  - `frequency` must be `"daily"` or `"weekly"`
  - `hour` must be an integer 0–23
  - `dayOfWeek` must be an integer 0–6 when `frequency` is `"weekly"`; silently stripped (not stored) when `frequency` is `"daily"`
- On validation failure: returns 400 with `{ message: "..." }`
- On success: upserts `backup_schedule` key with `updatedBy: locals.user.id`, returns `{ message: "Backup schedule saved" }` (consistent with existing API response shape in the codebase)

---

## `backup.sh` Changes

`postgres:16-alpine` does not include Python. JSON parsing is done with `jq`, installed via `apk add --no-cache jq` at the top of the `backup.sh` script (the container has internet access and Alpine's package index).

**Insertion point:** The schedule check block is inserted at the very top of `backup.sh`, immediately after the shebang and any `set` flags, before any `mkdir` or `pg_dump` calls.

**Logic:**

1. Install `jq` if not present: `apk add --no-cache jq`
2. Query `system_settings` via `psql -t -c "SELECT value FROM system_settings WHERE key='backup_schedule'"`, capturing output
3. If the `psql` query fails (database unreachable, connection error): log a warning and **proceed with the backup using default schedule** (daily at hour 2) rather than aborting — the backup is more important than the schedule check
4. If the key is absent or output is empty: use default `FREQ=daily HOUR=2`
5. Parse JSON with `jq`: extract `frequency`, `hour`, `dayOfWeek`
6. Validate extracted values in shell:
   - If `frequency` is not `daily` or `weekly`: fall back to default
   - If `hour` is not an integer in 0–23: fall back to default
   - If `frequency` is `weekly` and `dayOfWeek` is not an integer in 0–6: fall back to default
7. Compare current time against schedule:
   - Current hour: `CURRENT_HOUR=$(date +%H | sed 's/^0//')` (strip leading zero for arithmetic)
   - Current day of week (Sunday=0): `CURRENT_DOW=$(( $(date +%u) % 7 ))` (`date +%u` returns 1=Mon … 7=Sun; `% 7` maps Sunday's 7 → 0)
   - `daily`: if `CURRENT_HOUR ≠ HOUR` → print skip message and `exit 0`
   - `weekly`: if `CURRENT_DOW ≠ dayOfWeek` OR `CURRENT_HOUR ≠ HOUR` → print skip message and `exit 0`
8. If time matches: proceed with backup as normal

**Timing note:** The script reads the schedule once per cron tick (every hour). If the admin changes the schedule close to the configured hour, the change takes effect at the next hourly tick. This is expected and documented in the UI (see UI section).

---

## `docker-compose.yml` Changes

Two changes:

1. **Backup container entrypoint cron** changes from `0 2 * * *` (daily at 2am) to `0 * * * *` (every hour). The schedule logic moves entirely into `backup.sh` — the crontab is not dynamic and does not need to change when the user updates the schedule.

2. **Backup container `depends_on`** gains `condition: service_healthy` (matching the `app` service) to ensure Postgres is ready before the first cron tick fires:

```yaml
  backup:
    depends_on:
      db:
        condition: service_healthy
```

---

## UI — Backup Schedule Card

Added as a new `<section>` card on `src/routes/dashboard/settings/backup/+page.svelte`, positioned between the existing "Backup Information" card and the "System Updates" card (the page order is: Database Export → Backup Information → **Backup Schedule** → System Updates).

### Layout

```text
┌─────────────────────────────────────────────────────┐
│ CLOCK ICON  BACKUP SCHEDULE                         │
├─────────────────────────────────────────────────────┤
│ "Choose when automated backups run..."              │
│                                                     │
│  [ DAILY ]  [ WEEKLY ]                              │
│                                                     │
│  Time:  [ 2:00 AM ▾ ]                               │
│  Day:   [ Sunday  ▾ ]   ← only shown for Weekly     │
│                                                     │
│  ⚠ Changes take effect at the next hourly check.   │
│                                                     │
│  [ SAVE SCHEDULE ]                                  │
└─────────────────────────────────────────────────────┘
```

### State

- On mount: calls `GET /api/backup/schedule` and pre-fills the form; controls are disabled while fetching
- Load failure: shows inline error text ("Could not load schedule"), controls remain disabled
- Save: calls `POST /api/backup/schedule`; Save button is disabled while request is in flight
- Save success: toast "Backup schedule saved"
- Save failure: toast error with message from API

### Controls

- **Daily / Weekly toggle:** Two adjacent buttons styled like the pricing-tier buttons used on the order create page (`border-2 border-foreground`, active state `bg-foreground text-background`)
- **Time dropdown:** 12-hour format labels ("12:00 AM", "1:00 AM" … "11:00 PM") mapping to stored 24h integers (0–23). The UI converts between display (12h) and stored value (24h) on both load and save — midnight is 12:00 AM (hour 0), noon is 12:00 PM (hour 12).
- **Day of week dropdown:** "Sunday" through "Saturday" mapping to integers 0–6; rendered only when Weekly is selected, hidden (not just disabled) when Daily is selected
- **Save Schedule button:** Tall, bold, offset-shadow style matching the Export button

---

## Testing

The POST endpoint validation (hour range, dayOfWeek range, frequency enum, daily stripping dayOfWeek) can be unit-tested with Vitest if desired, but is not required — the validation rules are straightforward.

Manual test checklist:
- [ ] Load page as admin → form pre-fills with current schedule (default: Daily, 2:00 AM)
- [ ] Switch to Weekly, pick Wednesday at 6:00 PM → save → reload → verify persisted
- [ ] Switch back to Daily, pick 8:00 AM → save → reload → verify persisted
- [ ] Save Daily with no dayOfWeek change → verify dayOfWeek not stored
- [ ] POST to `/api/backup/schedule` with `hour: 25` → 400 returned
- [ ] POST with `frequency: "weekly"` and no `dayOfWeek` → 400 returned
- [ ] Load page as non-admin → Backup tab not visible (hidden by nav role filter)

---

## Rollout Notes

- No DB migration required — the key is inserted on first save; reads fall back to defaults until then
- The backup container timezone should match the app timezone. If the deployment uses a non-UTC timezone, add a `TZ` environment variable to the backup container (e.g. `TZ: Africa/Addis_Ababa`) so `date +%H` and `date +%u` return the correct local time.
- `docker-compose.yml` cron change and `backup.sh` schedule check must be deployed together; deploying only one half leaves the system in an inconsistent state (either hourly backups with no schedule check, or schedule check code that never fires)
- Existing deployments that never visit the schedule UI continue to receive the same daily 2am backup
