#!/usr/bin/env bash
# Deploy the latest code (run as the basecamp user):
#   bash /srv/basecamp/app/deploy/deploy.sh            normal update
#   bash /srv/basecamp/app/deploy/deploy.sh --first    first time: also imports all content
set -euo pipefail
cd /srv/basecamp/app
set -a; . /srv/basecamp/.env; set +a

git fetch --quiet origin main
git reset --hard origin/main
npm ci --no-audit --no-fund
npx prisma migrate deploy

if [ "${1:-}" = "--first" ]; then
  # Moves every trip, article, page and image into the database and writes
  # the published content the site reads (CONTENT_DIR).
  npm run admin:import
fi

npm run build
sudo systemctl restart basecamp
sleep 3
curl -fsS -o /dev/null -w "Site answers: %{http_code}\n" -H "Host: basecampadventure.com" http://127.0.0.1:3000/
