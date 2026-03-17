# Watchtower Update UI — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "System Updates" section to the Backup & Export settings page that lets admins check for and apply app updates via Watchtower's HTTP API.

**Architecture:** A `version.json` file in the repo root acts as the version source of truth. Two new API endpoints handle version checking (fetches remote `version.json`) and update triggering (calls Watchtower HTTP API). The backup page gains a new section with check/update buttons and inline status feedback.

**Tech Stack:** SvelteKit, `$env/dynamic/private`, `$env/static/public`, svelte-sonner toasts, Watchtower HTTP API, Docker Compose

**Spec:** `docs/superpowers/specs/2026-03-17-watchtower-update-ui-design.md`

---

## Chunk 1: Foundation

### Task 1: version.json + environment config

**Files:**
- Create: `version.json`
- Modify: `.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Create `version.json` at repo root**

```json
{
  "version": "1.0.0",
  "changelog": "Initial release."
}
```

- [ ] **Step 2: Add new vars to `.env.example`**

Open `.env.example` and append:

```env
# App version (must match version.json at release time)
PUBLIC_APP_VERSION=1.0.0

# Watchtower HTTP API (Docker update service)
WATCHTOWER_API_URL=http://watchtower:8080
WATCHTOWER_API_TOKEN=change-me-to-a-strong-secret

# URL of the raw version.json in the GitHub repo
VERSION_CHECK_URL=https://raw.githubusercontent.com/yourname/nova-metal-crm/main/version.json
```

- [ ] **Step 3: Add Watchtower service to `docker-compose.yml`**

Add after the `backup` service, before `volumes:`:

```yaml
  watchtower:
    image: containrrr/watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_HTTP_API_UPDATE: "true"
      WATCHTOWER_HTTP_API_TOKEN: "${WATCHTOWER_API_TOKEN}"
      WATCHTOWER_HTTP_API_PERIODIC_POLLS: "false"
    ports:
      - "127.0.0.1:8080:8080"
```

Also add `WATCHTOWER_API_URL`, `WATCHTOWER_API_TOKEN`, `VERSION_CHECK_URL`, and `PUBLIC_APP_VERSION` to the `app` service's `environment` block:

```yaml
      WATCHTOWER_API_URL: ${WATCHTOWER_API_URL:-http://watchtower:8080}
      WATCHTOWER_API_TOKEN: ${WATCHTOWER_API_TOKEN}
      VERSION_CHECK_URL: ${VERSION_CHECK_URL}
      PUBLIC_APP_VERSION: ${PUBLIC_APP_VERSION:-1.0.0}
```

- [ ] **Step 4: Commit**

```bash
git add version.json .env.example docker-compose.yml
git commit -m "feat: add version.json, Watchtower docker-compose service, and env config"
```

---

## Chunk 2: API Endpoints

### Task 2: `/api/update/check` endpoint

**Files:**
- Create: `src/routes/api/update/check/+server.ts`
- Create: `src/lib/utils/version.ts`
- Test: `src/lib/utils/version.test.ts`

- [ ] **Step 1: Write failing test for `compareVersions` utility**

Create `src/lib/utils/version.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { compareVersions, parseVersionJson } from './version';

describe('compareVersions', () => {
  it('returns false when versions are equal', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(false);
  });

  it('returns true when latest is higher (patch)', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(true);
  });

  it('returns true when latest is higher (minor)', () => {
    expect(compareVersions('1.0.0', '1.1.0')).toBe(true);
  });

  it('returns true when latest is higher (major)', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(true);
  });

  it('returns false when current is higher than latest', () => {
    expect(compareVersions('1.1.0', '1.0.0')).toBe(false);
  });
});

describe('parseVersionJson', () => {
  it('returns version and changelog from valid JSON', () => {
    const result = parseVersionJson('{"version":"1.1.0","changelog":"New stuff"}');
    expect(result).toEqual({ version: '1.1.0', changelog: 'New stuff' });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseVersionJson('not json')).toThrow();
  });

  it('throws when version field is missing', () => {
    expect(() => parseVersionJson('{"changelog":"hi"}')).toThrow();
  });

  it('throws when changelog field is missing', () => {
    expect(() => parseVersionJson('{"version":"1.0.0"}')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test:unit
```

Expected: FAIL — `Cannot find module './version'`

- [ ] **Step 3: Implement `src/lib/utils/version.ts`**

```typescript
export function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [cMaj, cMin, cPat] = parse(current);
  const [lMaj, lMin, lPat] = parse(latest);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

export function parseVersionJson(raw: string): { version: string; changelog: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON in version file');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).version !== 'string' ||
    typeof (parsed as Record<string, unknown>).changelog !== 'string'
  ) {
    throw new Error('Invalid version data: missing version or changelog fields');
  }
  return parsed as { version: string; changelog: string };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test:unit
```

Expected: all tests PASS

- [ ] **Step 5: Create `src/routes/api/update/check/+server.ts`**

Note: SvelteKit's `throw error(status, message)` serialises as `{ message: "..." }` — this is the project-wide pattern (see `/api/backup/+server.ts`). The frontend reads `body.message`, which is consistent. Both endpoints use `throw error(403, ...)` for non-admins, matching the existing backup endpoint.

```typescript
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/static/public';
import { compareVersions, parseVersionJson } from '$lib/utils/version';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  const versionCheckUrl = env.VERSION_CHECK_URL;
  if (!versionCheckUrl) {
    throw error(500, 'VERSION_CHECK_URL not configured');
  }

  const currentVersion = pubEnv.PUBLIC_APP_VERSION ?? '0.0.0';

  let raw: string;
  try {
    const res = await fetch(versionCheckUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw error(502, `Could not reach update server (HTTP ${res.status})`);
    }
    raw = await res.text();
  } catch (err: any) {
    if (err?.status) throw err; // re-throw SvelteKit errors
    throw error(502, 'Could not reach update server. Check your internet connection.');
  }

  let latestVersion: string;
  let changelog: string;
  try {
    ({ version: latestVersion, changelog } = parseVersionJson(raw));
  } catch {
    throw error(502, 'Invalid version data from update server');
  }

  return json({
    currentVersion,
    latestVersion,
    hasUpdate: compareVersions(currentVersion, latestVersion),
    changelog
  });
};
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/version.ts src/lib/utils/version.test.ts src/routes/api/update/check/+server.ts
git commit -m "feat: add version utility and /api/update/check endpoint"
```

---

### Task 3: `/api/update/trigger` endpoint

**Files:**
- Create: `src/routes/api/update/trigger/+server.ts`

- [ ] **Step 1: Create `src/routes/api/update/trigger/+server.ts`**

```typescript
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  const watchtowerUrl = env.WATCHTOWER_API_URL;
  const watchtowerToken = env.WATCHTOWER_API_TOKEN;

  if (!watchtowerUrl || !watchtowerToken) {
    throw error(500, 'Watchtower is not configured (WATCHTOWER_API_URL / WATCHTOWER_API_TOKEN missing)');
  }

  let res: Response;
  try {
    res = await fetch(`${watchtowerUrl}/v1/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${watchtowerToken}` },
      signal: AbortSignal.timeout(10000)
    });
  } catch (err: any) {
    throw error(502, 'Could not reach Watchtower. Is it running?');
  }

  if (!res.ok) {
    const message =
      res.status === 401
        ? 'Update service authentication failed. Check WATCHTOWER_API_TOKEN.'
        : `Watchtower returned an unexpected error (HTTP ${res.status})`;
    throw error(502, message);
  }

  console.log(`[AUDIT] App update triggered by user ${locals.user.id} at ${new Date().toISOString()}`);

  return json({ success: true });
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/api/update/trigger/+server.ts
git commit -m "feat: add /api/update/trigger endpoint"
```

---

## Chunk 3: UI

### Task 4: System Updates section on the backup page

**Files:**
- Modify: `src/routes/dashboard/settings/backup/+page.svelte`

The project uses **Svelte 5** (`"svelte": "^5.51.0"`). Use `$state` runes — this matches the existing backup page (`let isDownloading = $state(false)`).

The new section follows the same card style as the existing "Database Export" and "Backup Information" sections:
- Card: `border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]`
- Card header: `p-6 border-b-2 border-foreground/10 bg-muted/30` with small `text-sm font-black tracking-widest uppercase` label
- Buttons: `h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all`
- Secondary/outline button: `h-14 px-12 rounded-none border-2 border-foreground font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-all`
- Status badges: inline `px-2 py-0.5 text-[10px] font-black tracking-widest uppercase` spans

- [ ] **Step 1: Add script block additions to `+page.svelte`**

At the top of the `<script lang="ts">` block, add these imports and state variables after the existing ones:

```typescript
import { RefreshCw, Zap } from 'lucide-svelte';

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'updating';

let updateStatus = $state<UpdateStatus>('idle');
let updateInfo = $state<{ currentVersion: string; latestVersion: string; changelog: string } | null>(null);

async function handleCheckUpdate() {
  updateStatus = 'checking';
  try {
    const res = await fetch('/api/update/check');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.message ?? 'Could not reach update server. Check your internet connection.');
      updateStatus = 'idle';
      return;
    }
    const data = await res.json();
    updateInfo = { currentVersion: data.currentVersion, latestVersion: data.latestVersion, changelog: data.changelog };
    updateStatus = data.hasUpdate ? 'update-available' : 'up-to-date';
  } catch {
    toast.error('Could not reach update server. Check your internet connection.');
    updateStatus = 'idle';
  }
}

async function handleTriggerUpdate() {
  updateStatus = 'updating';
  try {
    const res = await fetch('/api/update/trigger', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.message ?? 'Failed to trigger update');
      updateStatus = 'update-available';
      return;
    }
    toast.success('Update triggered — the app will restart in ~30 seconds.');
  } catch {
    toast.error('Could not reach Watchtower. Is it running?');
    updateStatus = 'update-available';
  }
}
```

- [ ] **Step 2: Add the System Updates section to the template**

Add this new section after the closing `</section>` of the "Backup Information" card (before the closing `</div>` of the page wrapper):

```svelte
<!-- System Updates Card -->
<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
  <div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
    <h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
      <Zap class="w-4 h-4 text-primary" /> System Updates
    </h2>
  </div>
  <div class="p-6 md:p-8 space-y-6">
    <p class="text-sm text-muted-foreground leading-relaxed">
      Connect to the internet and check for available application updates. When an update is ready, clicking <strong>Update Now</strong> will pull the latest version and restart the app automatically.
    </p>

    <!-- Version status display -->
    <div class="flex flex-wrap items-center gap-3">
      {#if updateInfo}
        <div class="flex items-center gap-2 font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
          Current: <span class="font-bold">v{updateInfo.currentVersion}</span>
        </div>
        {#if updateStatus === 'up-to-date'}
          <span class="inline-block px-2 py-0.5 bg-green-500 text-white text-[10px] font-black tracking-widest uppercase">
            Up to date
          </span>
        {:else if updateStatus === 'update-available' || updateStatus === 'updating'}
          <span class="inline-block px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black tracking-widest uppercase">
            v{updateInfo.latestVersion} available
          </span>
        {/if}
      {/if}
    </div>

    <!-- Changelog -->
    {#if updateStatus === 'update-available' || updateStatus === 'updating'}
      <div class="bg-muted/40 border-l-4 border-primary/40 p-4 space-y-1">
        <p class="text-xs font-bold tracking-widest uppercase text-foreground/50">What's new in v{updateInfo?.latestVersion}</p>
        <p class="text-sm text-foreground/80">{updateInfo?.changelog}</p>
      </div>
    {/if}

    <!-- Actions -->
    <div class="flex flex-wrap gap-4">
      <Button
        onclick={handleCheckUpdate}
        disabled={updateStatus === 'checking' || updateStatus === 'updating'}
        variant="outline"
        class="h-14 px-12 rounded-none border-2 border-foreground font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-all flex items-center gap-3 disabled:opacity-50"
      >
        <RefreshCw class="w-4 h-4 {updateStatus === 'checking' ? 'animate-spin' : ''}" />
        {updateStatus === 'checking' ? 'Checking...' : 'Check for Updates'}
      </Button>

      {#if updateStatus === 'update-available' || updateStatus === 'updating'}
        <Button
          onclick={handleTriggerUpdate}
          disabled={updateStatus === 'updating'}
          class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3 disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
        >
          <Zap class="w-4 h-4" />
          {updateStatus === 'updating' ? 'Updating...' : 'Update Now'}
        </Button>
      {/if}
    </div>

    <!-- Post-update note -->
    {#if updateStatus === 'updating'}
      <p class="text-xs text-muted-foreground/60">
        The app is restarting. Your browser will lose connection briefly — reload the page in ~30 seconds.
      </p>
    {/if}
  </div>
</section>
```

- [ ] **Step 3: Run tests**

```bash
pnpm test:unit
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard/settings/backup/+page.svelte
git commit -m "feat: add System Updates section to backup page with check and trigger UI"
```

---

## Chunk 4: Wrap-up

### Task 5: Manual verification checklist

- [ ] Start the dev server: `pnpm dev`
- [ ] Navigate to Settings → Backup as an admin user
- [ ] Verify the "System Updates" card renders below "Backup Information"
- [ ] Click "Check for Updates":
  - If `VERSION_CHECK_URL` is not set in `.env`, should show toast: "VERSION_CHECK_URL not configured"
  - If set and reachable, should show current version + status badge
  - If update available, changelog and "Update Now" button should appear
- [ ] Verify the "Check for Updates" button spins and disables during fetch
- [ ] Verify the "Update Now" button is only visible when an update is available
- [ ] Verify a non-admin user cannot access the `/api/update/check` or `/api/update/trigger` endpoints (expect 403)

### Task 6: Create PR

- [ ] **Push branch and open PR**

```bash
git push -u origin feat/watchtower-update-ui
gh pr create \
  --title "feat: Watchtower update UI on backup page" \
  --body "$(cat <<'EOF'
## Summary
- Adds \`version.json\` as the version source of truth
- Adds Watchtower service to \`docker-compose.yml\` (HTTP API mode, no polling)
- New \`GET /api/update/check\` endpoint compares current vs remote version
- New \`POST /api/update/trigger\` endpoint triggers Watchtower pull+restart
- New System Updates section on Backup & Export page with check/update UI

## Test Plan
- [ ] Check for Updates shows correct version info when internet is available
- [ ] Check for Updates shows error toast when offline or VERSION_CHECK_URL unset
- [ ] Update Now triggers Watchtower and shows restart toast
- [ ] Update Now shows error toast when Watchtower is unreachable
- [ ] Non-admin users get 403 from both API endpoints
EOF
)"
```
