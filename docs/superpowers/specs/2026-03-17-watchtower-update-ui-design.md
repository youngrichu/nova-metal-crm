# Watchtower Update UI — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Add a "System Updates" section to the Backup & Export settings page that lets admins check for and apply application updates without touching the server. Version info is sourced from a `version.json` file in the GitHub repo; updates are applied by triggering Watchtower's HTTP API.

---

## Goals

- Give customers a one-click way to update the app when they have internet
- Show what version they're on and what's changed before they commit to updating
- Keep the submit button disabled during the update to prevent double-clicks
- Require no server access or CLI knowledge from the customer

---

## Non-Goals

- Automatic / scheduled update checks (intentionally customer-initiated)
- Rollback support
- Update progress beyond a "restarting" toast

---

## Version Source

A `version.json` file is committed to the repo root and is accessible via GitHub's raw content URL:

```json
{
  "version": "1.0.0",
  "changelog": "Bug fixes and performance improvements."
}
```

The developer bumps this file manually and commits it as part of every release. It is not generated at build time. The current app version is baked into the build via `PUBLIC_APP_VERSION` in `.env`, and must be kept in sync with `version.json` at release time.

`VERSION_CHECK_URL` must be set to the actual raw GitHub URL for the repo (e.g. `https://raw.githubusercontent.com/yourname/nova-metal-crm/main/version.json`). This is configured per-deployment in `.env`.

---

## Environment Variables

```env
# .env
PUBLIC_APP_VERSION=1.0.0          # baked into build via SvelteKit $env/static/public
WATCHTOWER_API_URL=http://watchtower:8080   # internal Docker service URL
WATCHTOWER_API_TOKEN=your-secret-token     # must match Watchtower WATCHTOWER_HTTP_API_TOKEN
VERSION_CHECK_URL=https://raw.githubusercontent.com/<owner>/<repo>/main/version.json
```

---

## Architecture

### New API Routes

**`GET /api/update/check`**
- Admin-only (403 if not admin — matches existing `/api/backup` pattern)
- Fetches `VERSION_CHECK_URL` with a 5-second timeout
- Returns:
  ```json
  { "currentVersion": "1.0.0", "latestVersion": "1.1.0", "hasUpdate": true, "changelog": "..." }
  ```
- Returns 502 with `{ error: "..." }` if the remote fetch fails, times out, or returns non-200
- Returns 502 with `{ error: "Invalid version data from update server" }` if the response is not valid JSON or is missing `version`/`changelog` fields

**`POST /api/update/trigger`**
- Admin-only (403 if not admin — matches existing `/api/backup` pattern)
- Admin-only: uses the same `locals.user` session check as other admin API routes in this codebase (e.g. `/api/backup`)
- This is a fetch-based POST (not a form action), so SvelteKit's form CSRF token does not apply automatically. Mitigation: the endpoint requires an active admin session, is only accessible on localhost/LAN, and the `Authorization` header to Watchtower is a server-side secret never exposed to the browser. No additional CSRF token is added.
- Calls `POST ${WATCHTOWER_API_URL}/v1/update` with `Authorization: Bearer ${WATCHTOWER_API_TOKEN}`, 10-second timeout (longer than check timeout to account for Watchtower pulling the image)
- Returns `{ success: true }` on 200 from Watchtower
- For all non-200 responses from Watchtower (including 401 token mismatch, 503 unavailable, or timeout), returns **502** to the frontend with a descriptive `{ message: "..." }` field — this follows SvelteKit's `throw error()` convention used throughout the codebase (e.g. `/api/backup`)
- Error messages by case:
  - Watchtower unreachable / timeout: `"Could not reach Watchtower. Is it running?"`
  - Watchtower 401: `"Update service authentication failed. Check WATCHTOWER_API_TOKEN."`
  - Other Watchtower error: `"Watchtower returned an unexpected error (HTTP {status})"`
- Audit-logs: `[AUDIT] App update triggered by user {id} at {timestamp}`

### Docker Compose (Watchtower service)

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

---

## UI — System Updates Section

Added as a new `<section>` card on `src/routes/dashboard/settings/backup/+page.svelte`, styled consistently with the existing "Database Export" and "Backup Information" cards.

### States

| State | Display |
|---|---|
| Idle | "Current version: v1.0.0" + "Check for Updates" button |
| Checking | Button shows "Checking…", disabled |
| Up to date | Green badge "Up to date" + current version |
| Update available | Yellow badge "Update available", version number, changelog text, "Update Now" button |
| Updating | "Update Now" disabled, toast: "Update triggered — app will restart in ~30 seconds" |
| Check failed | Toast error: "Could not reach update server. Check your internet connection." |
| Trigger failed | Toast error with message from API (e.g. "Could not reach Watchtower. Is it running?") |
| Post-restart | Watchtower restarts the container. The user's browser will lose connection and show a network error or blank page — this is expected. They reload the page manually to get the updated app. No auto-refresh mechanism is needed. |

### Component Flow

```text
[Check for Updates]
  → GET /api/update/check
    → hasUpdate: false → show "Up to date"
    → hasUpdate: true  → show version + changelog + [Update Now]
      → [Update Now] → POST /api/update/trigger
        → success → toast "Update triggered — app will restart shortly"
        → error   → toast error message
```

---

## Error Handling

- **No internet / GitHub down:** `/api/update/check` returns 502 → toast "Could not reach update server. Check your internet connection."
- **Watchtower not running / timeout:** `/api/update/trigger` returns 502 → toast "Could not reach Watchtower. Is it running?"
- **Watchtower token mismatch:** `/api/update/trigger` returns 502 → toast "Update service authentication failed. Check WATCHTOWER_API_TOKEN."
- **Other Watchtower error:** `/api/update/trigger` returns 502 → toast with HTTP status included
- **Not admin:** Both endpoints return 403 (the UI section is only rendered for admin users anyway)

---

## Files Changed

| File | Change |
|---|---|
| `version.json` | New file at repo root |
| `.env.example` | Add `WATCHTOWER_API_URL`, `WATCHTOWER_API_TOKEN`, `VERSION_CHECK_URL` |
| `docker-compose.yml` | Add Watchtower service |
| `src/routes/api/update/check/+server.ts` | New GET endpoint |
| `src/routes/api/update/trigger/+server.ts` | New POST endpoint |
| `src/routes/dashboard/settings/backup/+page.svelte` | Add System Updates section |

---

## Testing

- `GET /api/update/check` returns correct shape when remote is reachable
- `GET /api/update/check` returns 502 when remote URL is unreachable
- `POST /api/update/trigger` returns 403 for non-admin users
- UI shows "Up to date" when versions match, update UI when they differ
