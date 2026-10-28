#!/usr/bin/env bash
# Nightly Postgres + media backup for 3WEEQ.
#
#   install:  sudo cp deploy/backup.sh /usr/local/bin/threeweeq-backup
#             sudo chmod +x /usr/local/bin/threeweeq-backup
#   cron:     sudo crontab -e
#             15 3 * * * /usr/local/bin/threeweeq-backup >> /var/log/threeweeq-backup.log 2>&1
#
# Restore drill (do this once before launch, on a scratch database):
#   createdb threeweeq_restore
#   gunzip -c /var/backups/threeweeq/db-YYYY-MM-DD.sql.gz | psql threeweeq_restore
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/threeweeq}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/threeweeq}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# DATABASE_URL is read from the Medusa env file so credentials never live in
# this script or in cron.
ENV_FILE="${ENV_FILE:-$APP_DIR/medusa/.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set in $ENV_FILE" >&2
  exit 1
fi

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/db-$STAMP.sql.gz"
MEDIA_FILE="$BACKUP_DIR/media-$STAMP.tar.gz"

echo "[$(date -u +%FT%TZ)] dumping database"
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" | gzip -9 > "$DB_FILE"
test -s "$DB_FILE"

# Uploaded catalog images (file-local provider). Skipped if the directory is
# empty or missing, e.g. before the first product image is uploaded.
UPLOAD_DIR="${MEDIA_UPLOAD_DIR:-$APP_DIR/medusa/static}"
if [ -d "$UPLOAD_DIR" ] && [ -n "$(ls -A "$UPLOAD_DIR" 2>/dev/null)" ]; then
  echo "[$(date -u +%FT%TZ)] archiving media from $UPLOAD_DIR"
  tar -czf "$MEDIA_FILE" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
fi

# Keep a small, recent window. Older files are pruned only after the new backup
# is confirmed non-empty, so a failed dump never deletes yesterday's copy.
find "$BACKUP_DIR" -name 'db-*.sql.gz' -type f -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'media-*.tar.gz' -type f -mtime "+$RETENTION_DAYS" -delete

echo "[$(date -u +%FT%TZ)] backup complete: $(du -h "$DB_FILE" | cut -f1) db"
ls -1t "$BACKUP_DIR" | head -5
