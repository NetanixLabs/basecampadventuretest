/**
 * Company details. One place, so the header, footer, schema and contact
 * pages can never disagree. The admin's Settings screen will own these later.
 */
export const site = {
  name: "Base Camp Adventure",
  legalName: "Base Camp Adventure Pvt. Ltd.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, ""),
  tagline: "Start planning your journey to experience the Himalayas.",
  /** The live site's own About Us text. */
  about:
    "Founded in 2009 by an experienced local guide, Base Camp Adventure has been creating authentic and enriching travel experiences throughout Nepal. Our local expertise enables travelers to explore breathtaking Himalayan landscapes, vibrant cultures, and centuries-old traditions beyond the typical tourist trail. Whatever your journey demands, we are committed to making it happen with care and precision. We specialize in adventures inspired by the heart of Nepal, thoughtfully designed to immerse you in every destination. Since day one, we have continually expanded our knowledge, sharpened the skills these mountains demand, and refined every detail to deliver safe, memorable, and rewarding adventures.",
  customize:
    "Create your perfect Nepal adventure with flexible itineraries tailored to your available time, interests, fitness level, and travel preferences. Our local experts will help design a journey that matches your dream experience.",
  featuredIntro:
    "Explore our handpicked selection of Nepal’s most popular treks and tours, carefully designed to showcase breathtaking landscapes, rich cultures, and unforgettable experiences.",
  description:
    "Founded in 2009 by an experienced local guide, Base Camp Adventure has been creating authentic and enriching travel experiences throughout Nepal.",
  founded: 2009,
  address: {
    street: "Tridevi Marg, Thamel",
    city: "Kathmandu",
    region: "Bagmati",
    postalCode: "44600",
    country: "NP",
    poBox: "P.O. Box 5019",
  },
  geo: { lat: 27.7154, lng: 85.3123 },
  phone: "+977-1-4517875",
  mobile: "+977 985 102 9616",
  mobileHref: "+9779851029616",
  whatsapp: "9779851029616",
  email: "info@basecampadventure.com",
  contactPerson: "Shree Ghimire",
  social: {
    facebook: "https://www.facebook.com/BaseCampAdventure/",
    instagram: "https://www.instagram.com/base.camp.adventure/",
    x: "https://x.com/basecampadven",
    // The company's Tripadvisor listing (from the review widget on the old site).
    tripadvisor: "https://www.tripadvisor.com/Attraction_Review-g293890-d2437309-Reviews-Base_Camp_Adventure-Kathmandu_Kathmandu_Valley_Bagmati_Zone_Central_Region.html",
  },
  registration: [
    { label: "Govt. Reg.", value: "68517/066/067" },
    { label: "VAT", value: "303970392" },
    { label: "NMA", value: "776" },
    { label: "TAAN", value: "2010-868" },
    { label: "NTB Licence", value: "" },
  ],
  /** Google "write a review" link (Admin → Settings → Company). */
  googleReview: "",
  affiliations: [
    { name: "Nepal Tourism Board", short: "NTB · Licensed", logo: "/brand/partners/ntb.png", w: 507, h: 220, href: "https://ntb.gov.np/" },
    { name: "Trekking Agencies' Association of Nepal", short: "TAAN · 2010-868", logo: "/brand/partners/taan.png", w: 162, h: 220, href: "https://www.taan.org.np/" },
    { name: "Nepal Mountaineering Association", short: "NMA · Member 776", logo: "/brand/partners/nma.png", w: 252, h: 220, href: "https://www.nepalmountaineering.org/" },
    { name: "Himalayan Rescue Association", short: "HRA · Partner", logo: "/brand/partners/hra.png", w: 221, h: 220, href: "https://himalayanrescue.org/" },
    { name: "Kathmandu Environmental Education Project", short: "KEEP · Partner", logo: "/brand/partners/keep.png", w: 170, h: 220, href: "https://keepnepal.org/" },
  ],
  integrations: {
    ga4: process.env.NEXT_PUBLIC_GA4_ID ?? "",
    tawkProperty: process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ?? "",
    tawkWidget: process.env.NEXT_PUBLIC_TAWK_WIDGET_ID ?? "default",
  },
} as const;

export const whatsappHref = (text = "Namaste Base Camp Adventure, I would like to ask about a trip.") =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

/** Region photography, chosen from the company's own uploads (scripts/prepare-photos.py). */
export const regionMeta: Record<string, { photo: string }> = {
  "everest-region": { photo: "/photos/region-everest.webp" },
  "annapurna-region": { photo: "/photos/region-annapurna.webp" },
  "langtang-region": { photo: "/photos/region-langtang.webp" },
  "manaslu-region": { photo: "/photos/region-manaslu.webp" },
  "remote-area-trekking": { photo: "/photos/region-remote.webp" },
  nepal: { photo: "/photos/region-nepal.webp" },
  bhutan: { photo: "/photos/region-bhutan.webp" },
  tibet: { photo: "/photos/region-tibet.webp" },
};

export const activityMeta: Record<string, { photo: string; icon: string }> = {
  "trekking-in-nepal": { photo: "/photos/activity-trekking.webp", icon: "footprints" },
  "nepal-peak-climbing": { photo: "/photos/activity-peak.webp", icon: "mountain-snow" },
  "nepal-tour": { photo: "/photos/activity-tour.webp", icon: "landmark" },
  "river-rafting-in-nepal": { photo: "/photos/activity-rafting.webp", icon: "waves" },
  "day-tours": { photo: "/photos/activity-day.webp", icon: "sun" },
  "tours-in-bhutan": { photo: "/photos/activity-bhutan.webp", icon: "castle" },
  "bhutan-trek": { photo: "/photos/region-bhutan.webp", icon: "footprints" },
  "tours-in-tibet": { photo: "/photos/activity-tibet.webp", icon: "tent" },
  "expedition-in-nepal": { photo: "/photos/activity-peak.webp", icon: "mountain-snow" },
};

export const difficultyLabel: Record<string, string> = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Challenging",
  extreme: "Strenuous",
};

/* ------------------------------------------------------------------ live company details */

/** Company details the office edits in Admin → Settings → Company. */
export type CompanySettings = Partial<{
  contactPerson: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  email: string;
  street: string;
  city: string;
  poBox: string;
  facebook: string;
  instagram: string;
  x: string;
  tripadvisor: string;
  legalName: string;
  govReg: string;
  vat: string;
  ntbLicence: string;
  nma: string;
  taan: string;
  googleReview: string;
}>;

/**
 * Applies the admin's company details on top of the defaults above. Called on
 * the server whenever settings are published (src/lib/company.ts) and in the
 * browser from the values the page carries, so both always agree.
 */
export function applyCompany(c: CompanySettings | null | undefined) {
  if (!c) return;
  const s = site as unknown as { contactPerson: string; phone: string; mobile: string; mobileHref: string; whatsapp: string; email: string; legalName: string; googleReview: string; address: Record<string, string>; social: Record<string, string>; registration: { label: string; value: string }[] };
  const reg = (label: string, v: string) => {
    const r = s.registration.find((x) => x.label === label);
    if (r) r.value = v;
  };
  const set = <K extends keyof CompanySettings>(k: K, fn: (v: string) => void) => {
    const v = c[k]?.trim();
    if (v) fn(v);
  };
  set("contactPerson", (v) => (s.contactPerson = v));
  set("phone", (v) => (s.phone = v));
  set("mobile", (v) => {
    s.mobile = v;
    s.mobileHref = `+${v.replace(/[^0-9]/g, "")}`;
  });
  set("whatsapp", (v) => (s.whatsapp = v.replace(/[^0-9]/g, "")));
  set("email", (v) => (s.email = v));
  set("street", (v) => (s.address.street = v));
  set("city", (v) => (s.address.city = v));
  set("poBox", (v) => (s.address.poBox = v));
  set("facebook", (v) => (s.social.facebook = v));
  set("instagram", (v) => (s.social.instagram = v));
  set("x", (v) => (s.social.x = v));
  set("tripadvisor", (v) => (s.social.tripadvisor = v));
  set("legalName", (v) => (s.legalName = v));
  set("govReg", (v) => reg("Govt. Reg.", v));
  set("vat", (v) => reg("VAT", v));
  set("nma", (v) => reg("NMA", v));
  set("taan", (v) => reg("TAAN", v));
  set("ntbLicence", (v) => reg("NTB Licence", v));
  set("googleReview", (v) => (s.googleReview = v));
}

/** A registration number by label ("VAT", "TAAN", "NMA", "Govt. Reg.", "NTB Licence"). */
export const regNo = (label: string) => site.registration.find((r) => r.label === label)?.value ?? "";

declare global {
  interface Window {
    __BCA_COMPANY__?: CompanySettings;
  }
}

if (typeof window !== "undefined") applyCompany(window.__BCA_COMPANY__);
