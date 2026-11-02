# Phase 3 plan: run the whole business from the admin

Agreed on 2 Nov 2026. Everything below can be switched on or off in
Admin → Settings → Features, and nothing needs a developer to change it.

```
Base Camp Adventure admin
├── People
│   ├── Staff accounts with tick-box permissions (see this / edit that)
│   ├── Customers: every traveller in one place (bookings, payments, notes, documents)
│   ├── Guides & porters: contacts, licence, languages, who is free when
│   └── Agents (partner agencies): code, commission, their bookings
├── Money
│   ├── Receipts (automatic for every payment) and manual bills
│   │   └── PDF with logo, VAT/PAN, NTB licence, NMA, TAAN, signature, stamp,
│   │       and a QR code anyone can scan to check it is genuine
│   ├── Sales dashboard: bookings, money received, best trips, countries, sources
│   └── Prices in EUR / GBP / AUD next to USD (rates set in the admin)
├── Trips & departures
│   ├── Departures: who is going on which date
│   ├── Guide planner: assign guides/porters, warns about double bookings
│   ├── Departure list PDF for the field team
│   └── Emails 30 and 7 days before the trip (packing list, visa, pickup)
├── Traveller page (my.basecampadventure.com), app-like on phones
│   ├── Messages with the office (about documents and anything else)
│   ├── Upload / download documents
│   ├── Trip photos from our team, for everyone on that departure
│   └── Write a review after the trip
├── Website
│   ├── Trip finder quiz · Compare trips · Save a trip (+ reminder email)
│   ├── Trip brochure PDF with photos and the altitude chart
│   ├── Reviews: verified badge; "Review us" on Tripadvisor and Google
│   │   (real logos) and video reviews at the bottom of every trip page
│   └── Every text and photo editable: gallery uploads get the logo
│       watermark (like the videos), team, itinerary photos and packing
│       list, footer registration numbers, homepage sections on/off
└── Safety
    ├── Every admin page and action checks permissions on the server
    ├── Public forms rate-limited, CSRF-checked, honeypots
    ├── Receipts signed (HMAC) so a changed receipt fails the QR check
    └── Security, SEO and launch test suites run after each phase
```

## Order of work

1. Staff permissions; company registration numbers; signature and stamp in Settings.
2. Customers; receipts and manual bills with verification.
3. Guides, agents, departures, guide planner, departure list PDF.
4. Sales dashboard; pre-trip emails.
5. Traveller page: messages, trip photos, reviews, app-like layout.
6. Website: currencies, trip finder, compare, save a trip, brochure, review links, verified badge.
7. "Everything editable" sweep and gallery watermark.
8. Full tests (security, SEO, launch), screenshots on phone and laptop.
9. SEO research and ranking features, keeping the website's design and
   structure exactly as it is (only small, matching additions).

## Idea: Base Camp traveller kit (merchandise)

Show our branded kit (t-shirt, cap, buff, duffel bag, down jacket on longer
treks) on a "Your free traveller kit" page and on each trip page, with the
real shop price of each item and the total ("worth US$ 180, free with your
trek"). Travellers see what they get before they book, which makes the price
feel fairer, and the photos they post later advertise us. Later the same items
can be sold to past travellers and friends through WeTravel or a simple order
form, with stock and sizes managed in the admin. Waiting for the go-ahead.
