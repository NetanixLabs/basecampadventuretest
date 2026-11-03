/**
 * Feature switches, set in Admin → Settings → Features. Every new feature
 * reads its switch here; anything not saved yet uses these defaults.
 */
export type Features = {
  abandoned: { enabled: boolean; afterHours: number };
  whatsapp: { enabled: boolean; provider: "callmebot" | "meta"; recipients: string; booking: boolean; enquiry: boolean; payment: boolean; template: string; language: string };
  tawk: { details: boolean };
  reviews: { enabled: boolean; afterDays: number };
  portal: { enabled: boolean; autoInvite: boolean; expiryDays: number; inviteHours: number };
  languages: { de: boolean; fr: boolean; es: boolean };
  payments: { wetravel: boolean; hbl: boolean; preferred: "wetravel" | "hbl"; hblCurrency: "USD" | "NPR"; nprRate: number };
  pretrip: { enabled: boolean; d30: boolean; d7: boolean };
  /** Approximate prices in the visitor's currency; rates are "1 US$ = x". */
  currency: { enabled: boolean; eur: number; gbp: number; aud: number };
  /** Saved trips: a list emailed to the visitor, and one reminder a few days later. */
  saved: { enabled: boolean; reminderDays: number };
  /** Logo burned into uploaded photos, bottom right, like the video mark. */
  watermark: { enabled: boolean; scope: "galleries" | "all"; opacity: number; size: number };
};

export const FEATURE_DEFAULTS: Features = {
  abandoned: { enabled: true, afterHours: 24 },
  whatsapp: { enabled: false, provider: "callmebot", recipients: "", booking: true, enquiry: true, payment: true, template: "office_alert", language: "en" },
  tawk: { details: true },
  reviews: { enabled: true, afterDays: 2 },
  portal: { enabled: true, autoInvite: false, expiryDays: 30, inviteHours: 72 },
  languages: { de: false, fr: false, es: false },
  payments: { wetravel: true, hbl: false, preferred: "wetravel", hblCurrency: "USD", nprRate: 133 },
  pretrip: { enabled: true, d30: true, d7: true },
  currency: { enabled: true, eur: 0.86, gbp: 0.75, aud: 1.52 },
  saved: { enabled: true, reminderDays: 3 },
  watermark: { enabled: true, scope: "galleries", opacity: 55, size: 10 },
};

export function withFeatureDefaults(saved: unknown): Features {
  const out = structuredClone(FEATURE_DEFAULTS) as unknown as Record<string, Record<string, unknown>>;
  for (const [k, v] of Object.entries((saved ?? {}) as Record<string, Record<string, unknown>>)) {
    if (out[k] && v && typeof v === "object") for (const [f, val] of Object.entries(v)) if (val !== undefined && val !== null) out[k][f] = val;
  }
  return out as unknown as Features;
}

export const LANGS = { de: "Deutsch", fr: "Français", es: "Español" } as const;
export type Lang = keyof typeof LANGS;
