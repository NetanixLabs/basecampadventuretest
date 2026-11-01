#!/usr/bin/env bash
# Copies the live website's published content and uploads to this computer, so
# you can work on layouts with real data. Read-only on the server: nothing there
# changes. Usage: bash scripts/pull-content.sh basecamp@your-server-ip
set -euo pipefail
SERVER="${1:?Give the server, e.g. basecamp@203.0.113.10}"
mkdir -p .storage/content .storage/uploads
rsync -az --delete "$SERVER:/srv/basecamp/content/" .storage/content/
rsync -az "$SERVER:/srv/basecamp/uploads/" .storage/uploads/
echo "Done. npm run dev now shows the live content (the admin still uses your local database)."
