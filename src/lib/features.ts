/**
 * Feature switches, set in Admin → Settings → Features. Every new feature
 * reads its switch here; anything not saved yet uses these defaults.
 */
export type Features = {
  /** Unpaid bookings: a reminder after some hours, and an optional second one days later (with an optional discount code). */
  abandoned: { enabled: boolean; afterHours: number; second: boolean; secondDays: number; secondCode: string };
  whatsapp: { enabled: boolean; provider: "callmebot" | "meta"; recipients: string; booking: boolean; enquiry: boolean; payment: boolean; template: string; language: string };
  tawk: { details: boolean };
  reviews: { enabled: boolean; afterDays: number };
  portal: { enabled: boolean; autoInvite: boolean; expiryDays: number; inviteHours: number };
  languages: { de: boolean; fr: boolean; es: boolean };
  payments: { wetravel: boolean; hbl: boolean; preferred: "wetravel" | "hbl"; hblCurrency: "USD" | "NPR"; nprRate: number };
  pretrip: { enabled: boolean; d30: boolean; d7: boolean; d1: boolean };
  /** Reminders for the balance, this many days before the trip ("60,30,14"). */
  balance: { enabled: boolean; days: string; dueDays: number };
  /** Reminders for missing documents (passport, photo, insurance, flights), this many days before the trip. */
  docs: { enabled: boolean; days: string };
  /** Phone notifications for travellers (Web Push) when the office replies, a payment arrives, etc. */
  push: { enabled: boolean };
  /** Email a guide or porter when they are assigned to a departure. */
  guideNotify: { enabled: boolean };
  /** Approximate prices in the visitor's currency; rates are "1 US$ = x". */
  currency: { enabled: boolean; eur: number; gbp: number; aud: number; auto: boolean; updatedAt: string };
  /** Saved trips: a list emailed to the visitor, and one reminder a few days later. */
  saved: { enabled: boolean; reminderDays: number };
  /** Logo burned into uploaded photos, bottom right, like the video mark. */
  watermark: { enabled: boolean; scope: "galleries" | "all"; opacity: number; size: number };
};

export const FEATURE_DEFAULTS: Features = {
  abandoned: { enabled: true, afterHours: 24, second: true, secondDays: 3, secondCode: "" },
  whatsapp: { enabled: false, provider: "callmebot", recipients: "", booking: true, enquiry: true, payment: true, template: "office_alert", language: "en" },
  tawk: { details: true },
  reviews: { enabled: true, afterDays: 2 },
  portal: { enabled: true, autoInvite: false, expiryDays: 30, inviteHours: 72 },
  languages: { de: false, fr: false, es: false },
  payments: { wetravel: true, hbl: false, preferred: "wetravel", hblCurrency: "USD", nprRate: 133 },
  pretrip: { enabled: true, d30: true, d7: true, d1: true },
  balance: { enabled: true, days: "60,30,14", dueDays: 30 },
  docs: { enabled: true, days: "45,21,10" },
  push: { enabled: true },
  guideNotify: { enabled: true },
  currency: { enabled: true, eur: 0.86, gbp: 0.75, aud: 1.52, auto: true, updatedAt: "" },
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
