#!/usr/bin/env bash
# Safe deploy (run as the basecamp user):
#   bash /srv/basecamp/app/deploy/deploy.sh            update to the latest main
#   bash /srv/basecamp/app/deploy/deploy.sh --first    first time: also imports all content
#
# How it keeps the site and data safe:
#   1. Backs up the database, published content and uploads first.
#   2. Builds the new version in its own folder (releases/<time>) while the
#      live site keeps running untouched.
#   3. Only if the build succeeds: applies database migrations and switches
#      the site to the new folder in one step.
#   4. Checks the site answers properly; if not, switches straight back.
# Data never lives in a release folder: the database, CONTENT_DIR, UPLOADS_DIR
# and .env are outside it, so no deploy can touch them.
set -euo pipefail
ROOT=/srv/basecamp
set -a; . "$ROOT/.env"; set +a

for d in CONTENT_DIR UPLOADS_DIR; do
  v="${!d:-}"
  if [ -z "$v" ] || [[ "$v" == "$ROOT/releases"* ]] || [[ "$v" == "$ROOT/app"* ]]; then
    echo "Refusing to deploy: $d must be set in $ROOT/.env to a folder outside the code (e.g. $ROOT/content)." >&2
    exit 1
  fi
done

STAMP="$(date -u +%Y%m%d-%H%M%S)"
NEW="$ROOT/releases/$STAMP"
PREV="$(readlink -f "$ROOT/app" 2>/dev/null || true)"

echo "== 1/5 Backup"
bash "$ROOT/repo/deploy/backup.sh" || { echo "Backup failed: not deploying." >&2; exit 1; }

echo "== 2/5 Build $STAMP (the live site keeps running)"
git -C "$ROOT/repo" fetch --quiet origin main
git -C "$ROOT/repo" reset --quiet --hard origin/main
mkdir -p "$NEW"
git -C "$ROOT/repo" archive HEAD | tar -x -C "$NEW"
cd "$NEW"
npm ci --no-audit --no-fund
npm run build

echo "== 3/5 Database migrations"
npx prisma migrate deploy
if [ "${1:-}" = "--first" ]; then npm run admin:import; fi
# One-time content corrections (each runs once per server; never overwrites later admin edits).
npm run admin:fixes

echo "== 4/5 Switch"
ln -sfn "$NEW" "$ROOT/app.next" && mv -Tf "$ROOT/app.next" "$ROOT/app"
sudo systemctl restart basecamp

echo "== 5/5 Health check"
ok=1
for i in $(seq 1 30); do
  sleep 2
  home=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: basecampadventure.com" http://127.0.0.1:3000/ || true)
  trip=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: basecampadventure.com" http://127.0.0.1:3000/trip/everest-base-camp-trek/ || true)
  admin=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: admin.basecampadventure.com" http://127.0.0.1:3000/login/ || true)
  if [ "$home" = 200 ] && [ "$trip" = 200 ] && [ "$admin" = 200 ]; then ok=0; break; fi
done

if [ "$ok" != 0 ]; then
  echo "Health check failed (home $home, trip $trip, admin $admin). Switching back." >&2
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    ln -sfn "$PREV" "$ROOT/app.next" && mv -Tf "$ROOT/app.next" "$ROOT/app"
    sudo systemctl restart basecamp
    echo "Back on $(basename "$PREV")." >&2
  fi
  exit 1
fi

# Keep the last 5 releases for instant rollback.
ls -1dt "$ROOT"/releases/*/ | tail -n +6 | xargs -r rm -rf
echo "Live: $STAMP (previous: $(basename "${PREV:-none}")). Roll back with: bash $ROOT/repo/deploy/rollback.sh"
