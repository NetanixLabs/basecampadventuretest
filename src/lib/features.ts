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
};

export const FEATURE_DEFAULTS: Features = {
  abandoned: { enabled: true, afterHours: 24 },
  whatsapp: { enabled: false, provider: "callmebot", recipients: "", booking: true, enquiry: true, payment: true, template: "office_alert", language: "en" },
  tawk: { details: true },
  reviews: { enabled: true, afterDays: 2 },
  portal: { enabled: true, autoInvite: false, expiryDays: 30, inviteHours: 72 },
  languages: { de: false, fr: false, es: false },
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
