#!/bin/bash
# Vertos Archive - Automated MongoDB Backup Script
set -e

BACKUP_DIR="/var/backups/mongodb"
LOG_FILE="/var/log/vertos-mongo-backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="vertos_production_${TIMESTAMP}.archive.gz"
TARGET="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] Starting backup..." >> "${LOG_FILE}"

docker exec mongodb mongodump --db=vertos_production --archive --gzip > "${TARGET}"

FILESIZE=$(ls -lh "${TARGET}" | awk '{print $5}')
echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] Backup created: ${TARGET} (${FILESIZE})" >> "${LOG_FILE}"

# Automatically delete local backups older than 14 days
DELETED=$(find "${BACKUP_DIR}" -name "vertos_production_*.archive.gz" -mtime +14 -delete -print | wc -l)
echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] Cleaned up ${DELETED} old backups. Completed successfully." >> "${LOG_FILE}"
