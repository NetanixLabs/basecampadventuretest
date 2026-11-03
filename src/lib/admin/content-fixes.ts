/**
 * Content corrections, applied once per server by `npm run admin:fixes`
 * (deploy/deploy.sh) and to the starting files in src/content. Text is only
 * replaced where the old, wrong wording is still there, so later edits made in
 * the admin are never overwritten.
 */
type Day = { day: number; title: string; html?: string; altitude?: number | null } & Record<string, unknown>;
export type TripData = { slug?: string; title?: string; summary?: string; overview?: string; maxAltitude?: number | null; itinerary?: Day[]; seo?: Record<string, unknown>; cover?: { alt?: string } | null; gallery?: { alt?: string }[]; faqs?: { q: string; a: string }[] } & Record<string, unknown>;

export type Fix = {
  id: string;
  /** Trip slugs, or "*" for every trip. */
  slugs: string[] | "*";
  /** Exact text swaps, applied anywhere in the trip (including its translations). */
  replace?: [string, string][];
  /** Pattern swaps (JavaScript regular expressions, global). */
  regex?: [RegExp, string | ((match: string, ...groups: string[]) => string)][];
  /** Changes to fields and itinerary days. */
  transform?: (t: TripData) => TripData;
};

const days = (t: TripData, fn: (d: Day) => Day): TripData => (Array.isArray(t.itinerary) ? { ...t, itinerary: t.itinerary.map((d) => fn({ ...d })) } : t);

const KP_NUM = /5([.,   ]?)545(?= ?(?:m\b|meters|metres|m\)|m<|m\.|m,))/g;

export const FIXES: Fix[] = [
  // 3 Nov 2026: clear typos
  { id: "2026-11-ebc3-namche", slugs: ["3-days-everest-base-camp-trek"], replace: [["Fly from Namche Bazaar (5,545 m / 18,192 ft) to Kala Patthar", "Fly from Namche Bazaar (3,440 m / 11,286 ft) to Kala Patthar (5,545 m / 18,192 ft)"]] },
  { id: "2026-11-ebcgokyo-altitudes", slugs: ["everest-base-camp-and-gokyo-trek"], replace: [["Namche Bazaar (33,440 m / 11,286 ft)", "Namche Bazaar (3,440 m / 11,286 ft)"], ["Machhermo (4,470 m / 15,715 ft)", "Machhermo (4,470 m / 14,665 ft)"]] },
  { id: "2026-11-gokyo-dole", slugs: ["gokyo-valley-trek"], replace: [["Dole (44,200 m / 13,780 ft)", "Dole (4,200 m / 13,780 ft)"]] },
  { id: "2026-11-renjo-namche", slugs: ["gokyo-valley-with-renjo-la-pass-trek"], replace: [["Namche Bazaar (33,440 m / 11,286 ft)", "Namche Bazaar (3,440 m / 11,286 ft)"]] },
  { id: "2026-11-pikey-walk", slugs: ["pikey-peak-trek"], replace: [["After a scenic 6–7-hour drive, we reach Japrey", "After a scenic 6–7-hour walk, we reach Japrey"]] },
  { id: "2026-11-poonhill-max", slugs: ["ghorepani-poon-hill-trek"], transform: (t) => (t.maxAltitude === 2860 ? { ...t, maxAltitude: 3210 } : t) },

  {
    id: "2026-11-kailash-nyalam",
    slugs: "*",
    // Nyalam is no longer on the overland route (see 2026-11-tibet-kerung).
    replace: [
      ["Hot spring bath is possible (only in Nyalam, and Chu Gomba on direct payment basis)", "Hot spring bath is possible (only at Chu Gomba, on direct payment basis)"],
      ["(nur in Nyalam und Chu Gomba, vor Ort zu zahlen)", "(nur in Chu Gomba, vor Ort zu zahlen)"],
      ["(uniquement à Nyalam et Chu Gomba, à payer sur place)", "(uniquement à Chu Gomba, à payer sur place)"],
      ["(solo en Nyalam y Chu Gomba, se paga allí)", "(solo en Chu Gomba, se paga allí)"],
    ],
    transform: (t) =>
      t.slug !== "mount-kailash-tour"
        ? t
        : days(t, (d) => ([2, 3, 12].includes(d.day) && typeof d.html === "string" ? { ...d, html: d.html.replace(/Nyalam/g, "Kerung (Gyirong)").replace(/data-meters="3750">3,750 m/g, 'data-meters="2700">2,700 m') } : d)),
  },
  { id: "2026-11-tsum-jagat", slugs: ["tsum-valley-and-manaslu-trek"], replace: [["Jagat (,340 m / 4,396 ft)", "Jagat (1,340 m / 4,396 ft)"]], transform: (t) => days(t, (d) => (d.title.includes("Jagat (1,340 m") && d.altitude == null ? { ...d, altitude: 1340 } : d)) },

  // 3 Nov 2026, agreed with the office
  {
    id: "2026-11-kalapatthar-5644",
    slugs: "*",
    regex: [[KP_NUM, "5$1644"], [/data-meters=\\?"5545\\?"/g, (m) => m.replace("5545", "5644")], [/18,192 ?ft/g, "18,517 ft"], [/18,187ft/g, "18,517 ft"]],
    transform: (t) => days(t.maxAltitude === 5545 ? { ...t, maxAltitude: 5644 } : t, (d) => (d.altitude === 5545 ? { ...d, altitude: 5644 } : d)),
  },
  {
    id: "2026-11-chola-5420",
    slugs: "*",
    replace: [["Cho La Pass (5,368 m / 17,612 ft)", "Cho La Pass (5,420 m / 17,782 ft)"]],
    regex: [[/data-meters=\\?"5368\\?">5,368 m/g, (m) => m.replace("5368", "5420").replace("5,368", "5,420")]],
  },
  {
    id: "2026-11-abc-bamboo-v2",
    slugs: ["annapurna-base-camp-trek", "annapurna-base-camp-trek-via-poon-hill", "short-annapurna-base-camp-trek-5-days", "tent-peak-climbing"],
    transform: (t) => {
      const out = days(t, (d) => {
        const toBamboo = /to Bamboo \(|back to Bamboo|Trek to Bamboo/.test(d.title);
        if (toBamboo) {
          d.title = d.title.replace("Bamboo (2,920 m / 9,580 ft)", "Bamboo (2,310 m / 7,579 ft)").replace("Bamboo (2345 meters)", "Bamboo (2,310 meters)").replace("Bamboo (2500m)", "Bamboo (2,310 m)");
          if (d.altitude === 2920 || d.altitude === 2345 || d.altitude === 2500) d.altitude = 2310;
          if (typeof d.html === "string") d.html = d.html.replace(/data-meters="2345">2,345 m/g, 'data-meters="2310">2,310 m');
        }
        // 1,780 m is Jhinu Danda, not Pokhara (822 m).
        if (typeof d.html === "string" && d.html.includes("Afterward, drive to Pokhara (")) d.html = d.html.replace(/Upon reaching Jhinu,/, "Upon reaching Jhinu (1,780 m),").replace(/drive to Pokhara \(<span class="measurement" data-meters="1780">1,780 m<\/span>\)/, 'drive to Pokhara (<span class="measurement" data-meters="822">822 m</span>)');
        if (d.title.includes("drive to Pokhara (2,345 m / 7,694 ft)")) {
          d.title = d.title.replace("Pokhara (2,345 m / 7,694 ft)", "Pokhara (822 m / 2,697 ft)");
          if (d.altitude === 2345) d.altitude = 822;
        }
        return d;
      });
      if (t.slug === "annapurna-base-camp-trek" && out.faqs) out.faqs = out.faqs.map((f) => ({ ...f, a: f.a.replace("part of the 13 days", "part of the 12 days") }));
      return out;
    },
  },
  {
    id: "2026-11-tibet-kerung",
    slugs: ["everest-base-camp-tour", "kathmandu-lhasa-everest-base-camp-tour", "kailash-tour-and-simikot-trek", "advanced-base-camp-with-lhasa-tour", "simikot-kailash-zhangmu-tour", "mount-kailash-tour"],
    // Translated day titles of the Everest Base Camp Tour (Tibet).
    replace: [
      ["Fahrt nach Zhangmu (2.300 m), 181 km", "Fahrt nach Kerung (Gyirong, 2.700 m)"],
      ["Route vers Zhangmu (2 300 m), 181 km", "Route vers Kerung (Gyirong, 2 700 m)"],
      ["Traslado a Zhangmu (2300 m), 181 km", "Traslado a Kerung (Gyirong, 2700 m)"],
      ["Fahrt nach Kathmandu (1.345 m)", "Fahrt über die Grenze bei Rasuwagadhi nach Kathmandu (1.345 m)"],
    ],
    transform: (t) => {
      // The Zhangmu / Kodari border has been closed to tourists since 2015; overland trips now use Kerung (Gyirong) and Rasuwagadhi.
      const set = (day: number, from: string, title: string, altitude?: number | null) => (d: Day) => (d.day === day && d.title.trim() === from ? { ...d, title, ...(altitude !== undefined ? { altitude } : {}) } : d);
      const steps: Record<string, ((d: Day) => Day)[]> = {
        "everest-base-camp-tour": [
          set(11, "Drive to Zhangmu (2300meters) – 181 k.m. Overnight at hotel.", "Drive to Kerung (Gyirong) (2,700 meters). Overnight at hotel.", 2700),
          set(12, "Drive to Kathmandu(1345 meters). Overnight at hotel.", "Drive to Kathmandu (1,345 meters) via the Rasuwagadhi border. Overnight at hotel."),
        ],
        "kathmandu-lhasa-everest-base-camp-tour": [
          set(8, "Tingri to Nyalam or Zhangmu.", "Drive Tingri – Kerung (Gyirong) [2,700m].", 2700),
          set(9, "Drive Nyalam – Kathmandu [1400m] 153km.", "Drive Kerung – Rasuwagadhi border – Kathmandu [1400m]."),
        ],
        "kailash-tour-and-simikot-trek": [
          set(22, "Drive from Saga to Nyalam", "Drive from Saga to Kerung (Gyirong) [2,700 m]", 2700),
          set(23, "Drive from Nyalam to Kathmandu via Zhangmu", "Drive from Kerung to Kathmandu via the Rasuwagadhi border"),
        ],
        "advanced-base-camp-with-lhasa-tour": [
          set(1, "Drive to Zhangmu, Tibet.", "Drive to Kerung (Gyirong), Tibet (2,700m), crossing at Rasuwagadhi.", 2700),
          set(2, "Acclimatize in Zhangmu.", "Acclimatize in Kerung (Gyirong)."),
          set(3, "Drive to Nyalam, Tibet (3,700m).", "Drive to Gyirong County town (Zongga), Tibet.", null),
          set(4, "Acclimatize in Nyalam.", "Acclimatize in Gyirong County town."),
        ],
        "mount-kailash-tour": [
          set(2, "Drive to Nylam (150km), 3750m", "Drive to Kerung (Gyirong), 2,700m, via the Rasuwagadhi border", 2700),
          set(3, "Rest Day at Nylam, 3750m: It is more a day for acclimatization.", "Rest Day at Kerung (Gyirong), 2,700m: It is more a day for acclimatization.", 2700),
          set(12, "Drive to Nylam or Zang Mu: (296km) 6-7 hr.", "Drive to Kerung (Gyirong), 2,700m.", 2700),
          set(13, "Drive back to Kathmandu (150 km) 9-10 hr.", "Drive back to Kathmandu via the Rasuwagadhi border."),
        ],
        "simikot-kailash-zhangmu-tour": [set(19, "Drive Nyalam – Zhangmu – Kathmandu.", "Drive via Kerung (Gyirong) and the Rasuwagadhi border to Kathmandu.")],
      };
      let out = days(t, (d) => (steps[String(t.slug)] ?? []).reduce((x, f) => f(x), d));
      if (t.slug === "simikot-kailash-zhangmu-tour") {
        const k = (s?: string) => (typeof s === "string" ? s.replace(/Zhangmu/g, "Kerung") : s);
        out = {
          ...out,
          title: k(out.title),
          summary: k(out.summary),
          overview: k(out.overview),
          seo: out.seo ? { ...out.seo, title: k(out.seo.title as string), description: k(out.seo.description as string) } : out.seo,
          cover: out.cover ? { ...out.cover, alt: k(out.cover.alt) } : out.cover,
          gallery: out.gallery?.map((g) => ({ ...g, alt: k(g.alt) })),
          facts: Array.isArray(out.facts) ? (out.facts as { label: string; value: string }[]).map((f) => ({ ...f, value: k(f.value) as string })) : out.facts,
        };
      }
      return out;
    },
  },
];

const escapeJson = (s: string) => JSON.stringify(s).slice(1, -1);

/** Applies one fix to a trip (or to any JSON value that belongs to it, such as its translations). */
export function applyFix<T>(value: T, fix: Fix, slug?: string): T {
  if (value == null) return value;
  let s = JSON.stringify(value);
  for (const [a, b] of fix.replace ?? []) s = s.split(escapeJson(a)).join(escapeJson(b));
  for (const [re, b] of fix.regex ?? []) s = typeof b === "string" ? s.replace(re, b) : s.replace(re, b as (m: string, ...g: string[]) => string);
  let o = JSON.parse(s) as T;
  if (fix.transform && o && typeof o === "object" && !Array.isArray(o) && (slug ?? (o as TripData).slug)) {
    const hadSlug = "slug" in (o as object);
    const t = fix.transform({ ...(o as TripData), slug: (o as TripData).slug ?? slug }) as TripData;
    if (!hadSlug) delete t.slug;
    o = t as T;
  }
  return o;
}

export const appliesTo = (fix: Fix, slug: string) => fix.slugs === "*" || fix.slugs.includes(slug);
