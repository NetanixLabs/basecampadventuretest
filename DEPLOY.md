# Going live on the Frankfurt server

One server runs everything: the website (basecampadventure.com), the admin
(admin.basecampadventure.com), the PostgreSQL database and the uploaded photos.
The KVM Server M (4 vCores, 20 GB RAM, 200 GB NVMe) is more than enough. The
site uses about 1 GB of RAM, and the content plus photos are under 1 GB.

## 1. DNS and Cloudflare

1. Add basecampadventure.com to Cloudflare (free plan) and switch the
   nameservers at your domain registrar.
2. Create these DNS records pointing to the server's IPv4 (and AAAA to its IPv6),
   with the orange cloud **on**:
   - `basecampadventure.com`
   - `www`
   - `admin`
3. SSL/TLS → **Full (strict)**. Speed → enable Brotli. Caching → Standard.
4. Optional extra lock for the admin: Zero Trust → Access → add an application
   for `admin.basecampadventure.com` allowing only your team's emails.

Cloudflare serves photos and pages from near each visitor, so Frankfurt's
distance from the US or Australia stops mattering.

## 2. Set up the server (once)

SSH in as root, then:

```bash
git clone https://github.com/NetanixLabs/basecampadventuretest.git /tmp/bca && bash /tmp/bca/deploy/setup-server.sh
```

This installs Node.js 22, PostgreSQL 17, Caddy (automatic HTTPS), the firewall
and fail2ban, automatic security updates, the app service and a nightly backup.
It creates `/srv/basecamp/.env` with a random database password and encryption key.

## 3. Fill in the settings

```bash
nano /srv/basecamp/.env
```

| Setting | What to put |
| --- | --- |
| `SEED_OWNER_EMAIL`, `SEED_OWNER_NAME` | The first admin account (you) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Your email service. Google Workspace: smtp.gmail.com, 587, the mailbox and an app password |
| `EMAIL_FROM` | e.g. `Base Camp Adventure <info@basecampadventure.com>` |
| `OFFICE_EMAIL` | Where enquiry, booking and payment alerts go |
| `WETRAVEL_API_KEY`, `WETRAVEL_ENV=production` | From WeTravel → Profile → API |
| `WETRAVEL_WEBHOOK_SECRET` | See step 5 |
| `NEXT_PUBLIC_GA4_ID` | `G-XGW9MS2DX0` (the old site's, to keep history) |
| `NEXT_PUBLIC_TAWK_PROPERTY_ID` | From tawk.to (can also be set later in Admin → Settings) |
| `BACKUP_REMOTE` | Optional: an rclone remote for off-site backups |

For the email address to look trustworthy and land in inboxes, add the SPF and
DKIM records your email provider gives you to Cloudflare DNS.

## 4. First deploy

```bash
sudo -u basecamp bash /srv/basecamp/app/deploy/deploy.sh --first
```

This builds the site, creates the database tables and **imports everything**:
all trips, blog posts, pages, team, destinations, reviews, menus and images.
It prints a temporary password for the owner account if you didn't set one.

Open https://admin.basecampadventure.com, sign in, and set up two-step sign-in
with an authenticator app. Keep the backup codes somewhere safe.

## 5. WeTravel payment notifications

In WeTravel: Profile → Edit Profile → Webhooks → **Yes**, then add the endpoint

```
https://basecampadventure.com/api/webhooks/wetravel
```

with the events `payment.created`, `payment.updated` and `transaction.updated`.
Copy its signing secret (`whsec_…`) into `WETRAVEL_WEBHOOK_SECRET`, then run
`deploy.sh` again. Make one test booking in sandbox mode first
(`WETRAVEL_ENV=sandbox`) and check it shows as paid in Admin → Bookings.

## 6. Before switching the domain

On the server, compare every URL Google knows from the old site against the new one:

```bash
cd /srv/basecamp/app && node scripts/check-urls.mjs http://127.0.0.1:3000
```

Then move DNS to the new server. Submit `https://basecampadventure.com/sitemap.xml`
in Google Search Console.

## Every update after that

```bash
sudo -u basecamp bash /srv/basecamp/app/deploy/deploy.sh
```

Content edits do **not** need a deploy: they go live from the admin in seconds.

## Backups

Every night: the database, the published content and all uploads, kept 14 days
in `/srv/basecamp/backups`. Plus the hosting company's own 4 backups. To
restore the database:

```bash
pg_restore --clean --no-owner -d "$DATABASE_URL" /srv/basecamp/backups/db-YYYY-MM-DD-HHMM.dump
```
