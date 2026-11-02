# Base Camp Adventure: upgrade roadmap

What's built, what's being built now, and ideas to discuss with the client.
Ask Claude to "check the roadmap" to pick up where we left off.

```mermaid
mindmap
  root((Base Camp<br/>Adventure))
    Website
      Trips, blog, pages
      Altitude chart
      Video reviews with logo
      Gift vouchers & coupons
      Languages DE FR ES
      Fixed departures + seats left
      Price in visitor's currency
      Trip finder quiz
      Compare trips
      Seasonal landing pages
      Weather / best month chart
      Wishlist
      Printable brochure
    Sales
      WeTravel booking & payment
      Discount codes by region/activity/trip
      Abandoned booking follow-up
      Quote builder (PDF + pay deposit)
      Trip of the month banner
    Travellers
      Traveller portal (my.)
      Documents upload (encrypted)
      Flight details
      Review collection after trip
      Pre-trip emails 30 / 7 days
      Digital waiver & medical form
    Office
      Admin with 2 roles
      WhatsApp + tawk.to alerts
      Sales dashboard & charts
      Departure manifest PDF
      Guide & staff scheduling
    Growth & trust
      SEO health, llms.txt, IndexNow
      Newsletter & campaigns
      Automatic review publishing
```

## Done

| Area | What |
| --- | --- |
| Admin | Content editors, media library, versions, hide/show/delete, ordering, homepage text, two roles, 2FA, mobile |
| Sales | WeTravel checkout and webhook, discount codes (all / regions / activities / trips), bookings, enquiries |
| Email | Branded templates, newsletter design, gift vouchers with QR code |
| Settings | Company details, social links, encrypted keys, tawk.to, GA4 |
| SEO | Titles/descriptions fixed, real 404s, llms.txt, IndexNow, all checks passing |
| Security | OWASP checks 18/18 (brute force, CSRF, XSS, injection, headers…) |

## Done (approved features, live on main since 1 Nov 2026)

- [x] Feature switches page (turn every feature on/off from the admin)
- [x] Abandoned booking follow-up (reminder if not paid after 24 h)
- [x] WhatsApp alerts to the office + booking/enquiry details in tawk.to chat
- [x] Review collection after the trip, moderated, shown on trip pages
- [x] Traveller portal on my.basecampadventure.com (secure login, documents, payments)
- [x] Languages: German, French, Spanish for the top 20 trips (native-speaker check pending)

## Left to do

Done on 2 Nov 2026: the top 20 trips are translated into German, French and
Spanish (`src/content/trip-translations.json`), and the menu, footer,
newsletter box and photo slider switch language on /de, /fr and /es pages.

1. **Native-speaker check** of the translations before switching the
   languages on (Settings → Features → Languages). Edit them in the admin:
   Trips → the trip → Translations.
2. **Before launch**: add the `my` DNS record in Cloudflare (orange cloud);
   enter WhatsApp keys in Settings → Features if the office wants alerts.
3. **Fix these mistakes in the English trips** (found while translating;
   the translations avoid them, but the English pages still show them):
   - Annapurna Base Camp: day 9 gives Bamboo 2,920 m (about 2,310 m);
     day 10 gives "Pokhara (2,345 m)"; one FAQ says 13 days, the trip is 12.
   - Ghorepani Poon Hill: "highest point" field says 2,860 m; Poon Hill is 3,210 m.
   - Gokyo Valley: day 9 says "44,200 m" (4,200 m).
   - Everest Base Camp and Gokyo: day 12 Machhermo "15,715 ft" (14,665 ft);
     day 13 "33,440 m" (3,440 m).
   - Gokyo with Renjo La: day 4 "33,440 m" (3,440 m).
   - Everest Three Passes: Cho La is 5,368 m on day 11 but 5,420 m in the highlights.
   - Everest Base Camp Tour (Tibet): returns via Zhangmu, a border closed to
     tourists since 2015 (tours now use Kerung/Gyirong). Update the route.
   - Pikey Peak: day 2 text says "after a 6–7-hour drive" on a walking day.
4. Optional: the build notice "Encountered unexpected file in NFT list" is
   harmless (content files are read at runtime) and existed before.

How to check after changes: `npm run build`, then with `next start -p 3100`:
`node scripts/seo-audit.mjs http://localhost:3100`,
`node scripts/launch-check.mjs http://localhost:3100 --admin-host admin.localhost:3100`,
`node scripts/security-check.mjs http://localhost:3100 --admin-host admin.localhost:3100`.
Last results (2 Nov 2026): 0 SEO errors/warnings, 27/27 launch, 18/18 security.
Never set `NEXT_PUBLIC_SITE_URL` to localhost in `.env` before a build: it
changes canonicals and the sitemap.

## Ideas to discuss with the client

| # | Feature | Why it helps | Size |
| --- | --- | --- | --- |
| 1 | Fixed departure dates with seats left | Strongest booking trigger; dates can show in Google | Medium |
| 2 | Price in the visitor's currency | Less hesitation for EU/UK/AU travellers | Small |
| 3 | Trip finder quiz | Guides first-time visitors to the right trip | Small |
| 4 | Compare trips side by side | Helps undecided travellers choose | Small |
| 5 | Pre-trip emails (30 / 7 days before) | Packing list, visa, airport pickup sent automatically | Small |
| 6 | Digital waiver & medical form | No paper forms in Kathmandu | Small |
| 7 | Sales dashboard with charts | Bookings, revenue, top trips, sources | Medium |
| 8 | Departure manifest PDF | Rooms, diets, guides per departure for the field team | Medium |
| 9 | Guide & staff scheduling | Who leads which departure, who is free | Medium |
| 10 | Quote builder | Tailor-made quote as branded PDF with "pay deposit" | Medium |
| 11 | Seasonal landing pages (e.g. "EBC in October") | Ranks for month searches | Small |
| 12 | Wishlist / save a trip + reminder | Brings visitors back | Small |
| 13 | Trip of the month banner | Promote a trip from the admin | Small |
| 14 | Weather & best-month chart per trip | Answers the #1 question | Small |
| 15 | Printable trip brochure | Shareable PDF with photos and altitude chart | Small |
| 16 | More languages (Chinese, Japanese, Hindi…) | New markets, once DE/FR/ES prove out | Medium |
