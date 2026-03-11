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
pg_dump -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully."
    # Optional: Keep only the last 30 backups to save space
    echo "Pruning backups older than 30 days..."
    find "${BACKUP_DIR}" -name "nova_crm_*.sql.gz" -type f -mtime +30 -delete
else
    echo "ERROR: Backup failed!" >&2
    exit 1
fi
