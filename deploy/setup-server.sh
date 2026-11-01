#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server (run as root):
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/deploy/setup-server.sh | bash
# or copy this file over and: bash setup-server.sh
set -euo pipefail

REPO="${REPO:-https://github.com/NetanixLabs/basecampadventuretest.git}"

echo "== Updates, firewall, brute-force protection"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw fail2ban unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https gnupg rsync
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== Node.js 22"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "== PostgreSQL 17"
install -d /usr/share/postgresql-common/pgdg
curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release; echo "$VERSION_CODENAME")-pgdg main" > /etc/apt/sources.list.d/pgdg.list
apt-get update -y && apt-get install -y postgresql-17
DBPASS="$(openssl rand -base64 30 | tr -dc 'A-Za-z0-9' | head -c 32)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'basecamp') THEN CREATE ROLE basecamp LOGIN PASSWORD '${DBPASS}'; END IF; END \$\$;
SELECT 'CREATE DATABASE basecamp OWNER basecamp' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'basecamp')\gexec
SQL

echo "== Caddy (automatic HTTPS)"
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y && apt-get install -y caddy
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy

echo "== App user and folders"
id basecamp >/dev/null 2>&1 || useradd --system --create-home --home-dir /srv/basecamp --shell /bin/bash basecamp
install -d -o basecamp -g basecamp /srv/basecamp/{content,uploads,backups}
chmod 711 /srv/basecamp
chmod 755 /srv/basecamp/uploads
[ -d /srv/basecamp/app/.git ] || sudo -u basecamp git clone "$REPO" /srv/basecamp/app

if [ ! -f /srv/basecamp/.env ]; then
  sed -e "s|postgresql://basecamp:CHANGE_ME@localhost:5432/basecamp|postgresql://basecamp:${DBPASS}@localhost:5432/basecamp|" \
      -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -base64 32)|" \
      /srv/basecamp/app/.env.example > /srv/basecamp/.env
  chown basecamp:basecamp /srv/basecamp/.env && chmod 600 /srv/basecamp/.env
  echo ">> Created /srv/basecamp/.env. Fill in SMTP_*, WETRAVEL_*, SEED_OWNER_EMAIL and SEED_OWNER_NAME now."
fi
# Caddy needs to reach the uploads folder.
usermod -aG basecamp caddy

cp /srv/basecamp/app/deploy/Caddyfile /etc/caddy/Caddyfile
cp /srv/basecamp/app/deploy/basecamp.service /etc/systemd/system/basecamp.service
systemctl daemon-reload && systemctl enable basecamp caddy
# Lets deploy.sh restart the site without full root rights.
echo "basecamp ALL=(root) NOPASSWD: /usr/bin/systemctl restart basecamp" > /etc/sudoers.d/basecamp && chmod 440 /etc/sudoers.d/basecamp

echo "== Nightly backup at 02:30 Nepal time (20:45 UTC)"
echo "45 20 * * * basecamp /srv/basecamp/app/deploy/backup.sh >> /srv/basecamp/backups/backup.log 2>&1" > /etc/cron.d/basecamp-backup

echo
echo "Done. Next:"
echo "  1. nano /srv/basecamp/.env   (email, WeTravel, first owner)"
echo "  2. sudo -u basecamp bash /srv/basecamp/app/deploy/deploy.sh --first"
