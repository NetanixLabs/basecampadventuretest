#!/usr/bin/env bash
# Put a backup back. Run as root on the server:
#   bash /srv/basecamp/repo/deploy/restore.sh list                    show the backups
#   bash /srv/basecamp/repo/deploy/restore.sh all latest              database + files from the newest backup
#   bash /srv/basecamp/repo/deploy/restore.sh db 2026-11-07-2045      only the database
#   bash /srv/basecamp/repo/deploy/restore.sh files 2026-11-07-2045   only content, photos and documents
#
# Before anything is replaced, a fresh backup of how things are now is made,
# so a restore can always be undone. The site is stopped for the minute it takes.
set -euo pipefail
ROOT=/srv/basecamp
DIR="$ROOT/backups"
WHAT="${1:-}"
WHEN="${2:-latest}"

if [ "$WHAT" = "list" ] || [ -z "$WHAT" ]; then
  echo "Backups on this server (newest last):"
  ls -1 "$DIR/db" 2>/dev/null | sed -E 's/^db-(.*)\.dump$/  \1/'
  echo
  echo "Use: restore.sh all|db|files <name from the list, or latest>"
  exit 0
fi
case "$WHAT" in all|db|files) ;; *) echo "First word must be list, all, db or files."; exit 1 ;; esac
[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }

if [ "$WHEN" = "latest" ]; then WHEN="$(ls -1 "$DIR/db" | sed -E 's/^db-(.*)\.dump$/\1/' | tail -1)"; fi
DUMP="$DIR/db/db-$WHEN.dump"
FILES="$DIR/files/$WHEN"
[ "$WHAT" = files ] || [ -f "$DUMP" ] || { echo "No database backup called $WHEN."; exit 1; }
[ "$WHAT" = db ] || [ -d "$FILES" ] || { echo "No file backup called $WHEN."; exit 1; }

echo "This replaces the live $WHAT with the backup from $WHEN (UTC)."
read -r -p "Type YES to continue: " ok
[ "$ok" = "YES" ] || { echo "Nothing changed."; exit 1; }

echo "== Safety backup of how things are now"
sudo -u basecamp bash "$ROOT/repo/deploy/backup.sh"

echo "== Stopping the site"
systemctl stop basecamp
trap 'systemctl start basecamp' EXIT

if [ "$WHAT" != files ]; then
  echo "== Database"
  set -a; . "$ROOT/.env"; set +a
  pg_restore --clean --if-exists --no-owner --single-transaction --dbname "$DATABASE_URL" "$DUMP"
fi
if [ "$WHAT" != db ]; then
  echo "== Content, photos and documents"
  for d in content uploads private; do rsync -a --delete "$FILES/$d/" "$ROOT/$d/"; done
  chown -R basecamp:basecamp "$ROOT/content" "$ROOT/uploads" "$ROOT/private"
fi

systemctl start basecamp
trap - EXIT
echo "Done. Restored $WHAT from $WHEN. If this was a mistake, restore the safety backup made a minute ago (restore.sh list)."
