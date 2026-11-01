#!/usr/bin/env bash
# Instantly go back to the previous version (or a named one):
#   bash /srv/basecamp/repo/deploy/rollback.sh              previous release
#   bash /srv/basecamp/repo/deploy/rollback.sh 20261101-120000
# Only the code changes; the database, content and uploads are untouched.
set -euo pipefail
ROOT=/srv/basecamp
CURRENT="$(readlink -f "$ROOT/app")"
if [ -n "${1:-}" ]; then
  TARGET="$ROOT/releases/$1"
else
  TARGET="$(ls -1dt "$ROOT"/releases/*/ | sed 's#/$##' | grep -vx "$CURRENT" | head -1)"
fi
[ -d "$TARGET" ] || { echo "No such release: ${TARGET:-none}"; ls -1 "$ROOT/releases"; exit 1; }
ln -sfn "$TARGET" "$ROOT/app.next" && mv -Tf "$ROOT/app.next" "$ROOT/app"
sudo systemctl restart basecamp
echo "Rolled back to $(basename "$TARGET")."
