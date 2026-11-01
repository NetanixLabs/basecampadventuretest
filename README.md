# Base Camp Adventure

The new basecampadventure.com: a Next.js 16 site that replaces the WordPress
install while keeping every public URL exactly as it was.

## Run it

```bash
npm install
cp .env.example .env.local     # optional: WeTravel, tawk.to, GA4 keys
npm run dev                    # http://localhost:3000
npm run build && npm start     # production build: every page pre-rendered
```

## The admin (admin.basecampadventure.com)

Our own content management system, in this same app (`src/app/admin`), on
PostgreSQL. Nothing from WordPress runs here.

- **Content:** trips (itinerary, prices, group prices, photos, FAQs, packing
  list, reviews), blog with a rich text editor, pages, destinations,
  activities, offers, video reviews, awards, team, menu, homepage rows.
  Drafts, publish, version history, SEO panel with Google preview.
- **Media library:** drag-and-drop uploads, optimised to high-quality WebP,
  fingerprinted names, alt text, safe delete.
- **Customers:** enquiries, bookings with WeTravel payments (webhook),
  discount codes, newsletter and offer emails, editable email templates.
- **Security:** Argon2id passwords, mandatory two-step sign-in (TOTP + backup
  codes), emailed password reset, database rate limits, roles, activity log.
- **Speed:** publishing writes the files the site reads and refreshes the
  cached pages. Visitors never wait on the database.

```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:17   # or any PostgreSQL
cp .env.example .env          # DATABASE_URL, ENCRYPTION_KEY, ADMIN_URL=http://admin.localhost:3000
npx prisma migrate dev
SEED_OWNER_EMAIL=you@example.com npm run admin:import
npm run dev                   # site: localhost:3000 · admin: admin.localhost:3000
```

Going live on the server: see [DEPLOY.md](DEPLOY.md).

## Content

The original content came from the old WordPress site's public REST API
(`npm run import:wp` refreshes `src/content` and `public/media`), and
`npm run admin:import` moves it into the admin's database. From then on the
admin is the source of truth.

| What | Count |
| --- | --- |
| Trips (`/trip/{slug}/`) | 120 |
| Blog posts (`/{slug}/`) | 161 |
| Pages (`/{slug}/`) | 48 |
| Destinations / activities | 12 / 10 |
| Team members (`/team/{slug}/`) | 13 |
| Images, converted to WebP | ~1,470 |

## SEO carried over

- Same URLs with trailing slashes; old plugin pages redirect (`next.config.ts`).
- Yoast titles and descriptions are imported and used as-is.
- `/wp-content/uploads/...` image URLs 301 to the new WebP files.
- JSON-LD: TravelAgency, WebSite, BreadcrumbList, TouristTrip, Product with
  AggregateRating and Review, FAQPage, BlogPosting, Person, ItemList.
- `sitemap.xml` with images and real lastmod, `robots.txt` without crawl-delay,
  `llms.txt` and `llms-full.txt` for AI search.

## Payments and chat

- Booking: `/booking/` -> `POST /api/booking` prices the trip on the server and
  creates a WeTravel payment link (`src/lib/server/wetravel.ts`).
- Enquiries: contact and tailor-made forms -> `POST /api/enquiry`.
- Submissions are saved in the admin's database (with a `.data/*.jsonl` fallback if it is unreachable) and emailed to the traveller and the office.
- tawk.to and GA4 load after the page is idle, only when their IDs are set.

## Deploy

On the company's own server (Frankfurt KVM) with Caddy, PostgreSQL and Cloudflare: [DEPLOY.md](DEPLOY.md).
