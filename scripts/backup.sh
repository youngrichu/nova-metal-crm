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

CURRENT_HOUR=$(date +%-H 2>/dev/null || date +%H | sed 's/^0*//; s/^$/0/')
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

# Environment variables expected to be passed from docker-compose or shell environment:
# PGHOST, PGUSER, PGPASSWORD, PGDATABASE

BACKUP_DIR="/mnt/backup"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/nova_crm_${TIMESTAMP}.sql.gz"

echo "Starting database backup to ${BACKUP_FILE}..."

# Ensure target directory exists
mkdir -p "${BACKUP_DIR}"

# Run pg_dump, pipe to gzip, and save to the backup file
PGPASSWORD="${PGPASSWORD}" pg_dump -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" | gzip > "${BACKUP_FILE}"
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERROR: pg_dump failed with exit code ${EXIT_CODE}" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Check file size
FILE_SIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}" 2>/dev/null)
if [ -z "${FILE_SIZE}" ] || [ "${FILE_SIZE}" -lt 100 ]; then
    echo "ERROR: Backup file is empty or too small (${FILE_SIZE} bytes). Possible pg_dump failure." >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

echo "Backup completed successfully. Size: ${FILE_SIZE} bytes."

# Optional: Keep only the last 30 backups to save space
echo "Pruning backups older than 30 days..."
find "${BACKUP_DIR}" -name "nova_crm_*.sql.gz" -type f -mtime +30 -delete
