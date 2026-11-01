#!/usr/bin/env bash
# Nightly backup: database + published content + uploads. Keeps 14 days on
# the server. Set BACKUP_REMOTE in .env (an rclone remote such as
# "b2:basecamp-backups" or "r2:backups") to also copy each backup off-site.
set -euo pipefail
set -a; . /srv/basecamp/.env; set +a
STAMP="$(date -u +%Y-%m-%d-%H%M)"
DIR=/srv/basecamp/backups
mkdir -p "$DIR"
pg_dump --format=custom --no-owner "$DATABASE_URL" > "$DIR/db-$STAMP.dump"
tar -C /srv/basecamp -czf "$DIR/files-$STAMP.tar.gz" content uploads
find "$DIR" -name 'db-*.dump' -mtime +14 -delete
find "$DIR" -name 'files-*.tar.gz' -mtime +14 -delete
if [ -n "${BACKUP_REMOTE:-}" ] && command -v rclone >/dev/null; then
  rclone copy "$DIR" "$BACKUP_REMOTE" --include "*-$STAMP.*"
fi
echo "$STAMP backup ok: $(du -sh "$DIR/db-$STAMP.dump" | cut -f1) database"
