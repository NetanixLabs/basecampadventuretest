# Changing the website safely

You can change any layout or design without risking the admin, the bookings or
any data. This page explains where things are and the few rules to follow.

## Where things are

| What | Where | Touches data? |
| --- | --- | --- |
| Public pages (routes) | `src/app/(site)/` | No |
| Page parts: header, footer, trip cards, carousels… | `src/components/` | No |
| Styles, colours, fonts | `src/app/globals.css`, Tailwind classes | No |
| Homepage words and sections | Admin → More content → Homepage text & sections | Content only |
| How pages read content | `src/lib/content.ts` (the only bridge to data) | Reads only |
| Content shapes | `src/lib/types.ts` | Change with care |
| Admin | `src/app/admin/`, `src/components/admin/`, `src/lib/admin/` | Yes |
| Database tables | `prisma/schema.prisma` + `prisma/migrations/` | Yes |

A layout change lives in the first three rows. Pages get their data from
`src/lib/content.ts`, so you can rearrange, restyle or rebuild a page freely
and the admin keeps working.

## Working on your computer

```bash
npm install
npm run dev                                   # site on localhost:3000, admin on admin.localhost:3000
bash scripts/pull-content.sh basecamp@SERVER  # optional: copy the live content and photos (read-only)
```

Without the copy, the site shows the content saved in `src/content/`.

## Before you push

```bash
npm run typecheck && npm run lint && npm run build
```

GitHub runs the same checks on every push (Actions → Check). Only deploy a green commit.

## Deploying

```bash
sudo -u basecamp bash /srv/basecamp/repo/deploy/deploy.sh
```

Every deploy backs up the database, content and uploads first. It then builds
the new version beside the live one, switches over only if everything works,
and switches back by itself if the site doesn't answer. To go back by hand:

```bash
sudo -u basecamp bash /srv/basecamp/repo/deploy/rollback.sh
```

Data lives outside the code (`/srv/basecamp/content`, `/srv/basecamp/uploads`,
the database, `/srv/basecamp/.env`). No deploy or rollback touches it.

## Rules that keep data safe

1. **Never rename or delete a database column in the same release** as the code
   that stops using it. First release: stop using it. Later release: remove it.
   Adding new tables and columns is always safe.
2. **Never run** `prisma migrate reset` or `prisma db push` on the server. Only
   `prisma migrate deploy` (the deploy script does this).
3. **Don't change the shape of content** in `src/lib/types.ts` without updating
   the admin field definitions in `src/lib/admin/collections.ts` too. Adding an
   optional field is safe.
4. **Never change a page address.** The launch check (`scripts/launch-check.mjs`)
   fails if any of the 481 addresses Google knows changes (`docs/url-baseline.txt`).
   If a page must move, add a redirect in Admin → Redirects.
5. **Keep `ENCRYPTION_KEY`** in `/srv/basecamp/.env` forever and in a password
   manager. Without it, two-step sign-in secrets, saved keys and traveller
   documents can't be read.

## After a deploy

```bash
node scripts/launch-check.mjs https://basecampadventure.com --admin-host admin.basecampadventure.com
node scripts/security-check.mjs https://basecampadventure.com --admin-host admin.basecampadventure.com
```
