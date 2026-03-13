#!/bin/sh

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
