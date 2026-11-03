/**
 * Words used across the website (footer, "Let's make a plan", the trip booking
 * box), editable in Admin → More content → Website wording. Empty fields fall
 * back to these defaults, so nothing on the site is ever left blank.
 */
export type LinkItem = { label: string; href: string };

export type SiteCopy = {
  plan: { show: boolean; eyebrow: string; heading: string; accent: string; text: string; button: string };
  footer: { popularTitle: string; popular: string[]; companyTitle: string; company: LinkItem[] };
  booking: { helpTitle: string; helpButton: string; trust: string[]; callTitle: string };
};

export const SITE_COPY_DEFAULTS: SiteCopy = {
  plan: { show: true, eyebrow: "Your time. Your interests. Your trip.", heading: "Let's make", accent: "a plan.", text: "Choose an itinerary or talk to our local team about a journey built around you.", button: "Plan your trip" },
  footer: {
    popularTitle: "Popular treks",
    popular: ["everest-base-camp-trek", "annapurna-base-camp-trek", "annapurna-circuit-trek", "langtang-valley-trek", "manaslu-circuit-trek", "ghorepani-poon-hill-trek"],
    companyTitle: "Company",
    company: [
      { href: "/about-us/", label: "Our story" },
      { href: "/our-team/", label: "Our Team" },
      { href: "/why-book-with-us/", label: "Why Travel With Us?" },
      { href: "/community/", label: "Community & social work" },
      { href: "/gallery/", label: "Photo Gallery" },
      { href: "/legal-documents/", label: "Legal Documents" },
      { href: "/terms-and-conditions/", label: "Terms and Conditions" },
      { href: "/online-payment/", label: "Online Payment" },
    ],
  },
  booking: { helpTitle: "Need help with booking?", helpButton: "Send Us A Message", trust: ["Secure online payment", "No hidden fees · Experienced local guides"], callTitle: "Available 24/7 - Call Us Anytime" },
};

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export function withSiteCopyDefaults(saved: Partial<Record<keyof SiteCopy, Record<string, unknown>>> | null | undefined): SiteCopy {
  const out = structuredClone(SITE_COPY_DEFAULTS) as unknown as Record<string, Record<string, unknown>>;
  for (const [k, v] of Object.entries(saved ?? {})) {
    if (!out[k] || !v) continue;
    for (const [f, raw] of Object.entries(v)) {
      const val = clean(raw);
      if (val === "" || val === null || val === undefined) continue;
      if (Array.isArray(val)) {
        const items = val.filter((x) => (typeof x === "string" ? x.trim() : x && typeof x === "object" && String((x as LinkItem).label ?? "").trim() && String((x as LinkItem).href ?? "").trim()));
        if (items.length) out[k][f] = items;
        continue;
      }
      out[k][f] = val;
    }
  }
  return out as unknown as SiteCopy;
}
