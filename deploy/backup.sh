#!/usr/bin/env bash
# Nightly backup (02:30 Nepal time, and before every update):
#   - the database (bookings, payments, receipts, customers, messages)
#   - content, uploads (photos) and private (traveller documents, signature, stamp)
#
# Kept on the server: every night for 14 days, plus every Sunday for 13 weeks.
# Photo snapshots use hard links, so an unchanged photo takes no extra space.
# Each database copy is checked after it is made; a broken one stops with an error.
#
# Off-site copy: set BACKUP_REMOTE in /srv/basecamp/.env to an rclone remote
# (best an encrypted "crypt" remote, see docs/BACKUPS.md). Then every backup
# is also copied there, so a problem with the server can't take every copy.
set -euo pipefail
set -a; . /srv/basecamp/.env; set +a
ROOT=/srv/basecamp
DIR="$ROOT/backups"
STAMP="$(date -u +%Y-%m-%d-%H%M%S)"
# Never overwrite a backup (e.g. a safety copy made seconds after another one).
while [ -e "$DIR/db/db-$STAMP.dump" ] || [ -e "$DIR/files/$STAMP" ]; do sleep 1; STAMP="$(date -u +%Y-%m-%d-%H%M%S)"; done
mkdir -p "$DIR/db" "$DIR/files"
umask 077

# 1. Database, then a check that the copy can be read back.
pg_dump --format=custom --no-owner "$DATABASE_URL" > "$DIR/db/db-$STAMP.dump"
pg_restore --list "$DIR/db/db-$STAMP.dump" > /dev/null || { echo "$STAMP BACKUP FAILED: database copy unreadable" >&2; exit 1; }

# 2. Files: a full snapshot that shares unchanged files with the previous one.
LAST="$(ls -1d "$DIR"/files/*/ 2>/dev/null | tail -1 || true)"
rsync -a --delete ${LAST:+--link-dest="$LAST"} "$ROOT/content" "$ROOT/uploads" "$ROOT/private" "$DIR/files/$STAMP/"

# 3. Old copies: keep 14 days, and Sundays for 13 weeks.
for f in "$DIR"/db/db-*.dump; do
  d="$(basename "$f" | sed -E 's/^db-([0-9]{4}-[0-9]{2}-[0-9]{2}).*/\1/')"
  age=$(( ( $(date -u +%s) - $(date -u -d "$d" +%s) ) / 86400 ))
  dow="$(date -u -d "$d" +%u)"
  if [ "$age" -gt 91 ] || { [ "$age" -gt 14 ] && [ "$dow" != 7 ]; }; then
    rm -f "$f"
    rm -rf "$DIR/files/$(basename "$f" .dump | sed 's/^db-//')"
  fi
done

# 4. Off-site copy.
if [ -n "${BACKUP_REMOTE:-}" ]; then
  if command -v rclone >/dev/null; then
    rclone copy "$DIR/db/db-$STAMP.dump" "$BACKUP_REMOTE/db/" \
      && rclone sync "$DIR/files/$STAMP/" "$BACKUP_REMOTE/files/" --backup-dir "$BACKUP_REMOTE/files-changed/$STAMP" \
      && echo "$STAMP off-site copy ok" \
      || echo "$STAMP OFF-SITE COPY FAILED (the server copy is fine)" >&2
  else
    echo "$STAMP OFF-SITE COPY SKIPPED: rclone is not installed (apt-get install -y rclone)" >&2
  fi
fi

echo "$STAMP backup ok: database $(du -h "$DIR/db/db-$STAMP.dump" | cut -f1), all backups $(du -sh "$DIR" | cut -f1), disk free $(df -h --output=avail "$DIR" | tail -1 | tr -d ' ')"
