# Backup Schedule Configuration UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a UI card on the Backup & Export settings page that lets admins configure the automated backup schedule (daily/weekly + hour + day of week), persisted in the existing `system_settings` DB table and read by `backup.sh` at container startup.

**Architecture:** Schedule is stored as a JSON string under the key `backup_schedule` in `system_settings` (key-value table, already exists). Two new API endpoints handle reads/writes. `backup.sh` gains a schedule check block at the very top that queries Postgres, parses the config with `jq`, and exits early if the current time doesn't match. The Docker backup container cron becomes hourly; the script handles the rest.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Drizzle ORM, PostgreSQL, TailwindCSS v4, Vitest, `svelte-sonner` (toasts), `postgres:16-alpine` (backup container)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/utils/backup-schedule.ts` | Types + pure parse/validate functions |
| Create | `src/lib/utils/backup-schedule.test.ts` | Unit tests for the utility |
| Create | `src/routes/api/backup/schedule/+server.ts` | GET + POST API handlers |
| Modify | `src/routes/dashboard/settings/backup/+page.svelte` | Add Backup Schedule UI card |
| Modify | `scripts/backup.sh` | Add schedule check block at top |
| Modify | `docker-compose.yml` | Hourly cron + `service_healthy` on backup container |

---

## Task 1: Backup Schedule Utility (TDD)

**Files:**
- Create: `src/lib/utils/backup-schedule.ts`
- Create: `src/lib/utils/backup-schedule.test.ts`

### Step 1: Write the failing tests

Create `src/lib/utils/backup-schedule.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  parseBackupSchedule,
  validateBackupScheduleInput,
  DEFAULT_SCHEDULE
} from './backup-schedule';

describe('DEFAULT_SCHEDULE', () => {
  it('is daily at hour 2', () => {
    expect(DEFAULT_SCHEDULE).toEqual({ frequency: 'daily', hour: 2 });
  });
});

describe('parseBackupSchedule', () => {
  it('returns parsed daily schedule', () => {
    expect(parseBackupSchedule('{"frequency":"daily","hour":3}')).toEqual({
      frequency: 'daily',
      hour: 3
    });
  });

  it('returns parsed weekly schedule', () => {
    expect(parseBackupSchedule('{"frequency":"weekly","hour":2,"dayOfWeek":0}')).toEqual({
      frequency: 'weekly',
      hour: 2,
      dayOfWeek: 0
    });
  });

  it('returns default for empty string', () => {
    expect(parseBackupSchedule('')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for null-ish input', () => {
    expect(parseBackupSchedule(null as any)).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for invalid JSON', () => {
    expect(parseBackupSchedule('not json')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for unknown frequency', () => {
    expect(parseBackupSchedule('{"frequency":"monthly","hour":2}')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for hour out of range', () => {
    expect(parseBackupSchedule('{"frequency":"daily","hour":25}')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for weekly without dayOfWeek', () => {
    expect(parseBackupSchedule('{"frequency":"weekly","hour":2}')).toEqual(DEFAULT_SCHEDULE);
  });

  it('returns default for dayOfWeek out of range', () => {
    expect(parseBackupSchedule('{"frequency":"weekly","hour":2,"dayOfWeek":7}')).toEqual(DEFAULT_SCHEDULE);
  });

  it('strips dayOfWeek from daily schedule even if present in stored JSON', () => {
    const result = parseBackupSchedule('{"frequency":"daily","hour":2,"dayOfWeek":3}');
    expect(result).toEqual({ frequency: 'daily', hour: 2 });
    expect((result as any).dayOfWeek).toBeUndefined();
  });
});

describe('validateBackupScheduleInput', () => {
  it('accepts valid daily input', () => {
    expect(validateBackupScheduleInput({ frequency: 'daily', hour: 0 })).toEqual({
      ok: true,
      value: { frequency: 'daily', hour: 0 }
    });
  });

  it('accepts valid weekly input', () => {
    expect(validateBackupScheduleInput({ frequency: 'weekly', hour: 23, dayOfWeek: 6 })).toEqual({
      ok: true,
      value: { frequency: 'weekly', hour: 23, dayOfWeek: 6 }
    });
  });

  it('strips dayOfWeek when frequency is daily', () => {
    const result = validateBackupScheduleInput({ frequency: 'daily', hour: 2, dayOfWeek: 3 });
    expect(result.ok).toBe(true);
    expect((result as any).value.dayOfWeek).toBeUndefined();
  });

  it('rejects unknown frequency', () => {
    expect(validateBackupScheduleInput({ frequency: 'monthly', hour: 2 })).toMatchObject({ ok: false });
  });

  it('rejects hour below 0', () => {
    expect(validateBackupScheduleInput({ frequency: 'daily', hour: -1 })).toMatchObject({ ok: false });
  });

  it('rejects hour above 23', () => {
    expect(validateBackupScheduleInput({ frequency: 'daily', hour: 24 })).toMatchObject({ ok: false });
  });

  it('rejects weekly without dayOfWeek', () => {
    expect(validateBackupScheduleInput({ frequency: 'weekly', hour: 2 })).toMatchObject({ ok: false });
  });

  it('rejects dayOfWeek below 0', () => {
    expect(validateBackupScheduleInput({ frequency: 'weekly', hour: 2, dayOfWeek: -1 })).toMatchObject({ ok: false });
  });

  it('rejects dayOfWeek above 6', () => {
    expect(validateBackupScheduleInput({ frequency: 'weekly', hour: 2, dayOfWeek: 7 })).toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/richu/programming/nova && pnpm test:unit --run
```

Expected: multiple failures — `backup-schedule` module not found.

- [ ] **Step 3: Implement the utility**

Create `src/lib/utils/backup-schedule.ts`:

```typescript
export type BackupSchedule =
  | { frequency: 'daily'; hour: number }
  | { frequency: 'weekly'; hour: number; dayOfWeek: number };

export const DEFAULT_SCHEDULE: BackupSchedule = { frequency: 'daily', hour: 2 };

export function parseBackupSchedule(raw: string | null | undefined): BackupSchedule {
  if (!raw) return DEFAULT_SCHEDULE;
  try {
    const parsed = JSON.parse(raw);
    const result = validateBackupScheduleInput(parsed);
    return result.ok ? result.value : DEFAULT_SCHEDULE;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

type ValidationResult =
  | { ok: true; value: BackupSchedule }
  | { ok: false; message: string };

export function validateBackupScheduleInput(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, message: 'Invalid input' };
  }
  const d = data as Record<string, unknown>;

  if (d.frequency !== 'daily' && d.frequency !== 'weekly') {
    return { ok: false, message: 'frequency must be "daily" or "weekly"' };
  }

  if (typeof d.hour !== 'number' || !Number.isInteger(d.hour) || d.hour < 0 || d.hour > 23) {
    return { ok: false, message: 'hour must be an integer between 0 and 23' };
  }

  if (d.frequency === 'weekly') {
    if (typeof d.dayOfWeek !== 'number' || !Number.isInteger(d.dayOfWeek) || d.dayOfWeek < 0 || d.dayOfWeek > 6) {
      return { ok: false, message: 'dayOfWeek must be an integer between 0 and 6 for weekly schedules' };
    }
    return { ok: true, value: { frequency: 'weekly', hour: d.hour, dayOfWeek: d.dayOfWeek } };
  }

  // daily — strip dayOfWeek even if present
  return { ok: true, value: { frequency: 'daily', hour: d.hour } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/richu/programming/nova && pnpm test:unit --run
```

Expected: all tests pass (46 existing + new backup-schedule tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/backup-schedule.ts src/lib/utils/backup-schedule.test.ts
git commit -m "feat: add backup schedule utility with parse and validate functions"
```

---

## Task 2: API Endpoints

**Files:**
- Create: `src/routes/api/backup/schedule/+server.ts`

- [ ] **Step 1: Create the endpoint file**

Create `src/routes/api/backup/schedule/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema/settings';
import { eq } from 'drizzle-orm';
import { parseBackupSchedule, validateBackupScheduleInput } from '$lib/utils/backup-schedule';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  const rows = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'backup_schedule'));

  const raw = rows[0]?.value ?? '';
  return json(parseBackupSchedule(raw));
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  const result = validateBackupScheduleInput(body);
  if (!result.ok) {
    throw error(400, result.message);
  }

  await db
    .insert(systemSettings)
    .values({
      key: 'backup_schedule',
      value: JSON.stringify(result.value),
      updatedBy: locals.user.id,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: JSON.stringify(result.value),
        updatedBy: locals.user.id,
        updatedAt: new Date()
      }
    });

  return json({ message: 'Backup schedule saved' });
};
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
cd /Users/richu/programming/nova && pnpm test:unit --run
```

Expected: all tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/backup/schedule/+server.ts
git commit -m "feat: add GET and POST /api/backup/schedule endpoints"
```

---

## Task 3: backup.sh + docker-compose Changes

**Files:**
- Modify: `scripts/backup.sh`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Update `scripts/backup.sh`**

Insert the following block at the top of `scripts/backup.sh`, immediately after the `set -o pipefail` line and before the variable declarations:

```bash
#!/bin/bash
set -o pipefail

# ── Schedule check ──────────────────────────────────────────────────────────
# Install jq if not present (postgres:16-alpine ships without it)
if ! command -v jq >/dev/null 2>&1; then
  apk add --no-cache jq >/dev/null 2>&1
fi

SCHEDULE_JSON=""
if SCHEDULE_JSON=$(PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" -t -A -c "SELECT value FROM system_settings WHERE key='backup_schedule'" 2>/dev/null); then
  : # query succeeded
else
  echo "WARNING: Could not read backup schedule from database. Proceeding with default (daily at 02:00)."
  SCHEDULE_JSON='{"frequency":"daily","hour":2}'
fi

# Fall back to default if empty
if [ -z "${SCHEDULE_JSON}" ]; then
  SCHEDULE_JSON='{"frequency":"daily","hour":2}'
fi

FREQ=$(echo "${SCHEDULE_JSON}" | jq -r '.frequency // empty' 2>/dev/null)
SCHED_HOUR=$(echo "${SCHEDULE_JSON}" | jq -r '.hour // empty' 2>/dev/null)
SCHED_DOW=$(echo "${SCHEDULE_JSON}" | jq -r '.dayOfWeek // empty' 2>/dev/null)

# Validate; fall back to default on bad values
if [ "${FREQ}" != "daily" ] && [ "${FREQ}" != "weekly" ]; then
  echo "WARNING: Invalid frequency '${FREQ}'. Using default (daily at 02:00)."
  FREQ="daily"; SCHED_HOUR=2
fi
if ! echo "${SCHED_HOUR}" | grep -qE '^[0-9]+$' || [ "${SCHED_HOUR}" -lt 0 ] || [ "${SCHED_HOUR}" -gt 23 ]; then
  echo "WARNING: Invalid hour '${SCHED_HOUR}'. Using default hour 2."
  SCHED_HOUR=2
fi

CURRENT_HOUR=$(date +%H | sed 's/^0*//' || echo 0)
CURRENT_DOW=$(( $(date +%u) % 7 ))  # date +%u: 1=Mon…7=Sun; % 7 → Sun=0

if [ "${FREQ}" = "daily" ]; then
  if [ "${CURRENT_HOUR}" -ne "${SCHED_HOUR}" ]; then
    echo "Schedule check: daily at ${SCHED_HOUR}:00, current hour is ${CURRENT_HOUR}. Skipping."
    exit 0
  fi
else
  # weekly
  if ! echo "${SCHED_DOW}" | grep -qE '^[0-9]+$' || [ "${SCHED_DOW}" -lt 0 ] || [ "${SCHED_DOW}" -gt 6 ]; then
    echo "WARNING: Invalid dayOfWeek '${SCHED_DOW}'. Using default (Sunday=0)."
    SCHED_DOW=0
  fi
  if [ "${CURRENT_DOW}" -ne "${SCHED_DOW}" ] || [ "${CURRENT_HOUR}" -ne "${SCHED_HOUR}" ]; then
    echo "Schedule check: weekly on day ${SCHED_DOW} at ${SCHED_HOUR}:00, now is day ${CURRENT_DOW} hour ${CURRENT_HOUR}. Skipping."
    exit 0
  fi
fi
echo "Schedule check passed. Running backup..."
# ── End schedule check ───────────────────────────────────────────────────────
```

The rest of the file (`BACKUP_DIR=...` onwards) remains unchanged.

- [ ] **Step 2: Update `docker-compose.yml`**

Two changes:

**a)** Change the backup container cron from `0 2 * * *` to `0 * * * *`:

```yaml
  backup:
    image: postgres:16-alpine
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGHOST: db
      PGUSER: nova_dev
      PGPASSWORD: nova_password
      PGDATABASE: nova_crm
    volumes:
      - ./scripts/backup.sh:/backup.sh
      - ./backups:/mnt/backup
    entrypoint: ["/bin/sh", "-c", "echo '0 * * * * /backup.sh' > /etc/crontabs/root && crond -f -l 2"]
```

**b)** The `depends_on` change (`service_healthy`) is included above.

- [ ] **Step 3: Run tests to confirm nothing is broken**

```bash
cd /Users/richu/programming/nova && pnpm test:unit --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/backup.sh docker-compose.yml
git commit -m "feat: add schedule check to backup.sh and switch to hourly cron"
```

---

## Task 4: Backup Schedule UI Card

**Files:**
- Modify: `src/routes/dashboard/settings/backup/+page.svelte`

- [ ] **Step 1: Add the Backup Schedule card**

In `src/routes/dashboard/settings/backup/+page.svelte`:

**a)** Add `Calendar` to the lucide-svelte import (already has `Clock`):

```typescript
import { Database, Download, Shield, HardDrive, Clock, RefreshCw, Zap, Calendar } from 'lucide-svelte';
```

**b)** Add these state variables and functions after the existing update-related state (after the `handleTriggerUpdate` function, before `handleExport`):

```typescript
// ── Backup Schedule ──────────────────────────────────────────────────────────
type BackupFrequency = 'daily' | 'weekly';

let scheduleLoading = $state(true);
let scheduleError = $state(false);
let scheduleSaving = $state(false);
let scheduleFrequency = $state<BackupFrequency>('daily');
let scheduleHour = $state(2);
let scheduleDayOfWeek = $state(0);

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const period = i < 12 ? 'AM' : 'PM';
  const display = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${display}:00 ${period}` };
});

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

async function loadSchedule() {
  scheduleLoading = true;
  scheduleError = false;
  try {
    const res = await fetch('/api/backup/schedule');
    if (!res.ok) throw new Error();
    const data = await res.json();
    scheduleFrequency = data.frequency ?? 'daily';
    scheduleHour = data.hour ?? 2;
    scheduleDayOfWeek = data.dayOfWeek ?? 0;
  } catch {
    scheduleError = true;
  } finally {
    scheduleLoading = false;
  }
}

async function saveSchedule() {
  scheduleSaving = true;
  try {
    const body: Record<string, unknown> = { frequency: scheduleFrequency, hour: scheduleHour };
    if (scheduleFrequency === 'weekly') body.dayOfWeek = scheduleDayOfWeek;
    const res = await fetch('/api/backup/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? 'Failed to save schedule');
      return;
    }
    toast.success('Backup schedule saved');
  } catch {
    toast.error('Failed to save schedule');
  } finally {
    scheduleSaving = false;
  }
}

$effect(() => { loadSchedule(); });
// ── End Backup Schedule ───────────────────────────────────────────────────────
```

**c)** Insert this card between the "Backup Information" section and the "System Updates" section in the template:

```svelte
<!-- Backup Schedule Card -->
<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
  <div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
    <h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
      <Calendar class="w-4 h-4 text-primary" /> Backup Schedule
    </h2>
  </div>
  <div class="p-6 md:p-8 space-y-6">
    <p class="text-sm text-muted-foreground leading-relaxed">
      Choose when automated backups run. Changes take effect at the next hourly check.
    </p>

    {#if scheduleError}
      <p class="text-sm text-destructive">Could not load schedule. Please reload the page.</p>
    {:else}
      <!-- Frequency toggle -->
      <div class="space-y-2">
        <p class="text-xs font-bold tracking-wider uppercase text-foreground/50">Frequency</p>
        <div class="flex gap-0">
          {#each (['daily', 'weekly'] as BackupFrequency[]) as freq}
            <button
              type="button"
              disabled={scheduleLoading}
              onclick={() => { scheduleFrequency = freq; }}
              class="h-10 px-6 border-2 border-foreground font-bold uppercase tracking-widest text-xs transition-all
                {scheduleFrequency === freq
                  ? 'bg-foreground text-background'
                  : 'bg-background text-foreground hover:bg-foreground/10'}
                disabled:opacity-50"
            >
              {freq}
            </button>
          {/each}
        </div>
      </div>

      <!-- Time picker -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-xs font-bold tracking-wider uppercase text-foreground/50" for="schedule-hour">
            Time
          </label>
          <select
            id="schedule-hour"
            disabled={scheduleLoading}
            bind:value={scheduleHour}
            class="w-full h-10 px-3 border-2 border-foreground/20 bg-background font-mono text-sm focus:outline-none focus:border-foreground disabled:opacity-50"
          >
            {#each HOURS as h}
              <option value={h.value}>{h.label}</option>
            {/each}
          </select>
        </div>

        {#if scheduleFrequency === 'weekly'}
          <div class="space-y-2">
            <label class="text-xs font-bold tracking-wider uppercase text-foreground/50" for="schedule-dow">
              Day
            </label>
            <select
              id="schedule-dow"
              disabled={scheduleLoading}
              bind:value={scheduleDayOfWeek}
              class="w-full h-10 px-3 border-2 border-foreground/20 bg-background font-mono text-sm focus:outline-none focus:border-foreground disabled:opacity-50"
            >
              {#each DAYS as d}
                <option value={d.value}>{d.label}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>

      <!-- Save button -->
      <div>
        <Button
          onclick={saveSchedule}
          disabled={scheduleLoading || scheduleSaving}
          class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3 disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
        >
          <Calendar class="w-4 h-4" />
          {scheduleSaving ? 'Saving...' : 'Save Schedule'}
        </Button>
      </div>
    {/if}
  </div>
</section>
```

- [ ] **Step 2: Run tests to confirm nothing is broken**

```bash
cd /Users/richu/programming/nova && pnpm test:unit --run
```

Expected: all tests pass.

- [ ] **Step 3: Manually test the UI**

Start the dev server:
```bash
pnpm dev
```

- Log in as an admin user
- Navigate to Settings → Backup
- Verify the "Backup Schedule" card appears between "Backup Information" and "System Updates"
- Verify it loads with "Daily" selected and "2:00 AM"
- Switch to "Weekly" — verify the Day dropdown appears
- Select "Wednesday" and "6:00 PM" → click Save Schedule → verify success toast
- Reload the page → verify the saved values are pre-filled
- Switch back to "Daily", change time to "8:00 AM" → Save → reload → verify

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard/settings/backup/+page.svelte
git commit -m "feat: add Backup Schedule UI card to backup settings page"
```

---

## Final Verification

- [ ] Run full test suite one last time:

```bash
cd /Users/richu/programming/nova && pnpm test:unit --run
```

Expected: all tests pass.
