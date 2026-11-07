import "server-only";
import type { Booking } from "@/generated/prisma/client";
import { db } from "@/lib/admin/db";
import { getEquipment, getTrip } from "@/lib/content";
import type { TravellerDetails } from "@/lib/server/portal";

/**
 * The document checklist: what we need from the group before the trip.
 * Passport copies, passport photos and insurance are needed once per
 * traveller; flight tickets once per booking. An item is also done when the
 * matching details were typed in (for example the insurance policy number),
 * or when the office ticked it as received another way (email, WhatsApp).
 */
export type DocItem = { key: string; label: string; hint: string; kind: string; have: number; need: number; done: boolean; byOffice: boolean };

const DOCS = [
  { key: "passport", label: "Passport copy", hint: "The photo page, clear and readable, valid 6 months after the trip.", kind: "passport", perPerson: true },
  { key: "photo", label: "Passport-size photo", hint: "For your trekking permits (TIMS and national park).", kind: "photo", perPerson: true },
  { key: "insurance", label: "Travel insurance", hint: "Must cover helicopter rescue up to the highest altitude of your trip.", kind: "insurance", perPerson: true },
  { key: "flight", label: "Flight tickets", hint: "So we can meet you at the airport and plan your last day.", kind: "flight", perPerson: false },
] as const;
export const DOC_KEYS = DOCS.map((d) => d.key);
export const docLabel = (k: string) => DOCS.find((d) => d.key === k)?.label ?? k;

export function docChecklist(b: Pick<Booking, "pax" | "docsDone">, files: { kind: string }[], details: TravellerDetails[]): DocItem[] {
  return DOCS.map((d) => {
    const need = d.perPerson ? Math.max(1, b.pax) : 1;
    let have = files.filter((f) => f.kind === d.kind).length;
    // Typed-in details count too (one per traveller who filled them).
    if (d.key === "insurance") have += details.filter((x) => x.insurancePolicy && x.insuranceCompany).length;
    if (d.key === "flight") have += details.filter((x) => x.arrivalFlight).length;
    have = Math.min(need, have);
    const byOffice = b.docsDone.includes(d.key);
    return { key: d.key, label: d.label, hint: d.hint, kind: d.kind, have, need, done: byOffice || have >= need, byOffice };
  });
}

/** The checklist for a booking, read from the database (files and everyone's details). */
export async function bookingDocs(b: Booking) {
  const { readDetails } = await import("@/lib/server/portal");
  const [files, access] = await Promise.all([
    db.travellerFile.findMany({ where: { bookingId: b.id }, select: { kind: true } }),
    db.bookingAccess.findMany({ where: { bookingId: b.id }, select: { detailsEnc: true } }),
  ]);
  return docChecklist(b, files, [readDetails(b.detailsEnc), ...access.map((a) => readDetails(a.detailsEnc))]);
}

// ---- Packing checklist ----

export type PackItem = { name: string; description: string; image: string; category: string };

/** A short list for tours (city, Tibet, Bhutan) and trips without their own list. */
const TOUR_LIST: PackItem[] = [
  { name: "Passport (valid 6 months) and copies", description: "Keep a photo of it on your phone too.", image: "", category: "Documents" },
  { name: "Travel insurance papers", description: "", image: "", category: "Documents" },
  { name: "Comfortable walking shoes", description: "", image: "/equipment/boots-cutout.webp", category: "Footwear" },
  { name: "Warm layer or fleece", description: "Mornings and evenings are cool, even in spring.", image: "/equipment/down-cutout.webp", category: "Clothing" },
  { name: "Rain jacket", description: "", image: "/equipment/shell-cutout.webp", category: "Clothing" },
  { name: "Sun hat and sunglasses", description: "", image: "/equipment/hat-cutout.webp", category: "Clothing" },
  { name: "Sunscreen and lip balm", description: "", image: "", category: "Health" },
  { name: "Personal medicines", description: "", image: "", category: "Health" },
  { name: "Water bottle", description: "", image: "", category: "Trail essentials" },
  { name: "Day pack", description: "", image: "", category: "Trail essentials" },
  { name: "Phone charger and power bank", description: "Nepal uses round-pin plugs (types C, D and M).", image: "", category: "Electronics" },
];

export function packingItems(tripSlug: string): PackItem[] {
  const own = getEquipment(tripSlug)?.items;
  if (own?.length) return own;
  const trip = getTrip(tripSlug);
  // Treks without their own list use the standard trekking list.
  const trek = trip?.activities?.some((a) => /trek/.test(a));
  if (trek) {
    const std = getEquipment("everest-base-camp-trek")?.items ?? getEquipment("annapurna-base-camp-trek")?.items;
    if (std?.length) return std;
  }
  return TOUR_LIST;
}

export type ExtraItem = { name: string; packed: boolean };
export function cleanExtra(v: unknown): ExtraItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => ({ name: String((x as ExtraItem)?.name ?? "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 80), packed: Boolean((x as ExtraItem)?.packed) }))
    .filter((x) => x.name)
    .slice(0, 40);
}
