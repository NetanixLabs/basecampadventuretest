# Going live on the Frankfurt server

One server runs everything: the website (basecampadventure.com), the admin
(admin.basecampadventure.com), the traveller pages (my.basecampadventure.com),
the PostgreSQL database and the uploaded photos.

**KVM Server S** (2 vCores, 10 GB RAM, 100 GB NVMe, Frankfurt) is enough. In the
load test (50 visitors, 15 travellers signed in, 10 staff and 6 guides at the
same moment) the site used about 1.6 GB of memory and answered pages in under
50 ms. Content, photos and the database are about 2.5 GB. Add CPU cores later
in the hosting panel if the processor stays above about 70% for long periods;
nothing else changes.

## 1. Domain (DNS)

At the company where basecampadventure.com's DNS is managed, create these
records pointing to the server (A = its IPv4 address, AAAA = its IPv6 address):

| Name | Type | Value |
| --- | --- | --- |
| `@` (basecampadventure.com) | A and AAAA | the server's IP addresses |
| `www` | A and AAAA | the same |
| `admin` | A and AAAA | the same |
| `my` | A and AAAA | the same |

Set a short TTL (300 seconds) a day before the switch, so the move is quick.
HTTPS certificates are made automatically by Caddy (Let's Encrypt) as soon as
the records point at the server; nothing to buy or install. The server's
SmartMitigate DDoS protection works in front of it without any setup.

Keep the email records (MX, SPF, DKIM) exactly as they are, so email keeps working.

*Optional, any time later:* Cloudflare's free plan can sit in front (orange
cloud on for the four records, SSL/TLS **Full (strict)**). The server is
already set up for it, but it isn't needed.

## 2. Set up the server (once)

SSH in as root, then:

```bash
git clone https://github.com/NetanixLabs/basecampadventuretest.git /tmp/bca && bash /tmp/bca/deploy/setup-server.sh
```

This installs Node.js 22, PostgreSQL 17, Caddy (automatic HTTPS), the firewall
and fail2ban, automatic security updates, a 2 GB swap file, the app service and
the nightly backup.
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
| `PORTAL_URL`, `PORTAL_HOST`, `PRIVATE_DIR`, `CRON_SECRET` | Already filled in by the setup script; leave as they are |
| `BACKUP_REMOTE` | Recommended: an encrypted off-site copy of every backup, see docs/BACKUPS.md |

For the email address to look trustworthy and land in inboxes, add the SPF and
DKIM records your email provider gives you to the domain's DNS.

**Save the `ENCRYPTION_KEY` line from `/srv/basecamp/.env` in your password
manager now.** Traveller documents, details, messages and saved keys are
encrypted with it; without it a backup can't be read.

## 4. First deploy

```bash
sudo -u basecamp bash /srv/basecamp/repo/deploy/deploy.sh --first
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
sudo -u basecamp bash /srv/basecamp/repo/deploy/deploy.sh
```

Content edits do **not** need a deploy: they go live from the admin in seconds.

Each deploy backs up first, builds beside the live site, switches only if the
build works, and switches back automatically if the site doesn't answer.
Undo the last deploy: `sudo -u basecamp bash /srv/basecamp/repo/deploy/rollback.sh`.
See DEVELOPING.md for changing layouts safely.

## New features and their switches

Admin → Settings → **Features** turns each one on or off:

- **Reminder for unpaid bookings**: one friendly email with the payment link after 24 hours (adjustable).
- **Reviews after the trip**: an email with stars a few days after the trip; you approve each review before it shows.
- **Traveller accounts** on my.basecampadventure.com: only for bookings with a payment received, created from the booking page in the admin. Passwords are chosen by the traveller and stored hashed (Argon2id); documents and details are encrypted and deleted after the trip.
- **WhatsApp alerts** for new bookings, enquiries and payments (CallMeBot or the official WhatsApp Business API).
- **tawk.to**: the visitor's name, email and reference appear in the chat after they book or enquire.
- **Languages**: German, French and Spanish trip pages with hreflang, for trips that have a published translation.

These run on a timer every 15 minutes (set up by `setup-server.sh`). To check it by hand:

```bash
curl -X POST -H "Authorization: Bearer $(grep -m1 '^CRON_SECRET=' /srv/basecamp/.env | cut -d= -f2-)" http://127.0.0.1:3000/api/cron/
```

**If your server was set up before these features:** run these once as root:

```bash
install -d -m 700 -o basecamp -g basecamp /srv/basecamp/private
```

```bash
grep -q '^CRON_SECRET=' /srv/basecamp/.env || echo "CRON_SECRET=$(openssl rand -hex 32)" >> /srv/basecamp/.env
```

```bash
printf 'PORTAL_URL=https://my.basecampadventure.com\nPORTAL_HOST=my.basecampadventure.com\nPRIVATE_DIR=/srv/basecamp/private\n' >> /srv/basecamp/.env
```

then copy the scheduled-jobs line from `deploy/setup-server.sh` into `/etc/cron.d/basecamp-jobs`, copy `deploy/Caddyfile` to `/etc/caddy/Caddyfile`, run `systemctl reload caddy`, and deploy.

## Backups

Automatic, every night at 02:30 Nepal time and before every update: the
database (bookings, payments, receipts, customers, messages), the published
content, all photos and the travellers' encrypted documents.

- Kept on the server: every night for 14 days, and every Sunday for 13 weeks.
- Each database copy is checked after it is made.
- Photos that didn't change take no extra space.
- With `BACKUP_REMOTE` set, every backup is also copied off the server (encrypted).
- The hosting company's 4 included backups come on top: use them for the whole
  server, for example once a week.

```bash
bash /srv/basecamp/repo/deploy/restore.sh list
```

```bash
sudo bash /srv/basecamp/repo/deploy/restore.sh all latest
```

The restore asks you to type YES, makes a safety backup of the current state
first (so a restore can be undone), stops the site for about a minute and starts
it again. `db` or `files` instead of `all` restores only one part. Full guide,
including the off-site copy: docs/BACKUPS.md. The log is in
`/srv/basecamp/backups/backup.log`.

## Checks before and after launch

Run these on the server against the live site. Each must end with everything passing.

```bash
cd /srv/basecamp/app
node scripts/seo-audit.mjs https://basecampadventure.com          # every page: status, titles, canonicals, structured data, links
node scripts/launch-check.mjs https://basecampadventure.com --admin-host admin.basecampadventure.com
node scripts/security-check.mjs https://basecampadventure.com --admin-host admin.basecampadventure.com
node scripts/check-urls.mjs https://basecampadventure.com --live https://old-site-address   # every old WordPress URL still works
```

After launch: add the site to Google Search Console and Bing Webmaster Tools and
submit `https://basecampadventure.com/sitemap.xml`. Bing (and ChatGPT search)
also hear about every publish instantly through IndexNow.

## Security in place

- Admin only on admin.basecampadventure.com (404 on the public site), never indexed.
- Argon2id passwords (12+ characters), mandatory two-step sign-in with backup codes,
  new session token after two-step sign-in, 72-hour sessions that end after 60 idle minutes.
- Brute force: 5 wrong passwords or codes lock that account for 30–60 minutes; per-IP limits
  on sign-in, password reset and every public form. The visitor's real IP comes from Caddy
  (Cloudflare's header is trusted only from Cloudflare's network).
- CSRF: SameSite=Strict, host-only `__Host-` cookie; every admin write must come from the
  admin itself; public forms refuse other websites; Next.js checks the origin of every action.
- XSS: everything written in the editor is cleaned (no scripts, event handlers or
  `javascript:` links); strict Content-Security-Policy.
- Headers: CSP, HSTS (preload), X-Frame-Options DENY, frame-ancestors none, nosniff,
  Referrer-Policy, Permissions-Policy, COOP; admin pages no-store and noindex.
- Uploads checked by content (not file name), re-encoded, camera/GPS data removed.
- Keys encrypted (AES-256-GCM) in the database, never shown after saving.
- WeTravel notifications verified by signature, replay-protected, processed once.
- Every sign-in, change and email in the Activity log.

If the server is ever restored from a backup, keep the same `ENCRYPTION_KEY`.
Locked out completely? On the server: `npm run admin:user -- --email you@example.com --reset-password`.
