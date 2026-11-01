/**
 * The homepage's words, editable in Admin → More content → Homepage text &
 * sections. In headings each line of text is a line on the page, and a word
 * in *stars* gets the accent style (e.g. "in the *Himalayas.*").
 */
export type HomeSection = { show: boolean; eyebrow: string; heading: string; intro: string };

export type HomeCopy = {
  hero: { eyebrow: string; heading: string; text: string; button: string };
  find: HomeSection;
  collections: { show: boolean };
  regions: HomeSection;
  popular: HomeSection;
  offers: { show: boolean };
  story: HomeSection;
  awards: { show: boolean };
  videos: HomeSection;
  testimonials: { show: boolean };
  journal: HomeSection;
};

export const HOME_COPY_DEFAULTS: HomeCopy = {
  hero: { eyebrow: "Beyond the everyday", heading: "Find yourself\nin the *Himalayas.*", text: "Remarkable trails. Rich cultures.\nAn adventure that feels like yours.", button: "Explore our trips" },
  find: { show: true, eyebrow: "01 / Find your trail", heading: "Where do you\nwant to *go?*", intro: "From the foothills to Everest Base Camp. Find a trip that fits your time and your sense of adventure." },
  collections: { show: true },
  regions: { show: true, eyebrow: "02 / Get to know Nepal", heading: "Same country.\n*Different worlds.*", intro: "Everest, Annapurna, Langtang, Manaslu. There's more than one way into the Himalayas." },
  popular: { show: true, eyebrow: "", heading: "Popular trekking\n& tour *packages.*", intro: "" },
  offers: { show: true },
  story: { show: true, eyebrow: "Our story & community", heading: "Local roots.\n*Open horizons.*", intro: "" },
  awards: { show: true },
  videos: { show: true, eyebrow: "Watch", heading: "Videos from\n*the trail.*", intro: "" },
  testimonials: { show: true },
  journal: { show: true, eyebrow: "Journal", heading: "Notes from\n*the trail.*", intro: "" },
};

/** Fills anything the office left empty with the defaults above. */
export function withHomeDefaults(saved: Partial<Record<keyof HomeCopy, Record<string, unknown>>> | null | undefined): HomeCopy {
  const out = structuredClone(HOME_COPY_DEFAULTS) as unknown as Record<string, Record<string, unknown>>;
  for (const [k, v] of Object.entries(saved ?? {})) {
    if (!out[k] || !v) continue;
    for (const [f, val] of Object.entries(v)) if (val !== "" && val !== null && val !== undefined) out[k][f] = val;
  }
  return out as unknown as HomeCopy;
}

/** "Where do you\nwant to *go?*" → lines, each made of plain and accent parts. */
export function headingParts(text: string): { text: string; accent: boolean }[][] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => line.split(/(\*[^*]+\*)/).filter(Boolean).map((p) => (p.startsWith("*") && p.endsWith("*") ? { text: p.slice(1, -1), accent: true } : { text: p, accent: false })));
}
