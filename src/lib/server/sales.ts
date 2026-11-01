import "server-only";
import { db } from "@/lib/admin/db";
import { adminConfigured, env } from "@/lib/admin/env";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { record } from "@/lib/server/store";

/**
 * What happens when a traveller sends a form: it is saved in the admin's
 * database (or, if the database is unreachable, in the fallback log so
 * nothing is lost), the traveller gets a branded confirmation, and the
 * office gets an alert with a link straight to it.
 */
const adminLink = (path: string) => `${(process.env.ADMIN_URL ?? "https://admin.basecampadventure.com").replace(/\/$/, "")}${path}`;
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const dateText = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export type EnquiryInput = { reference: string; kind: string; name: string; email: string; phone?: string; country?: string; trip?: string; data: Record<string, unknown>; ip: string };

export async function saveEnquiry(e: EnquiryInput) {
  let id: string | null = null;
  try {
    if (!adminConfigured()) throw new Error("no database");
    const row = await db.enquiry.create({
      data: { reference: e.reference, kind: e.kind, name: e.name, email: e.email.toLowerCase(), phone: e.phone || null, country: e.country || null, trip: e.trip || null, data: e.data as object, ip: e.ip },
    });
    id = row.id;
  } catch (error) {
    if (adminConfigured()) console.error("[enquiry] database write failed, kept in log", error);
    await record("enquiries", { ...e });
  }
  const kindLabel = e.kind === "custom-trip" ? "tailor-made trip" : e.kind === "trip-request" ? "trip" : "contact";
  const details = Object.entries({ Name: e.name, Email: e.email, Phone: e.phone, Country: e.country, Trip: e.trip, ...flat(e.data) }).filter(([, v]) => v) as [string, string][];
  await Promise.allSettled([
    sendTemplate("enquiry-received", e.email, { name: e.name.split(" ")[0], reference: e.reference, trip: e.trip }, { replyTo: (await officeEmail()) }),
    sendTemplate("enquiry-office", (await officeEmail()), { name: e.name, reference: e.reference, kind: kindLabel, trip: e.trip, email: e.email, phone: e.phone }, { details, buttonHref: adminLink(id ? `/enquiries/${id}` : "/enquiries"), replyTo: e.email }),
  ]);
}

function flat(data: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === "" || ["name", "email", "phone", "country", "trip", "kind", "website"].includes(k)) continue;
    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    out[label] = Array.isArray(v) ? v.join(", ") : String(v).slice(0, 600);
  }
  return out;
}

export type BookingInput = {
  reference: string; tripSlug: string; tripTitle: string; startDate: string; pax: number; each: number; subtotal: number;
  discountCode: string | null; discount: number; total: number; plan: string; due: number;
  lead: { name: string; email: string; phone: string; country: string }; notes?: string;
  paymentUrl: string | null; wetravelId: string | null; paymentError: string | null; ip: string;
};

export async function saveBooking(b: BookingInput) {
  let id: string | null = null;
  try {
    if (!adminConfigured()) throw new Error("no database");
    const row = await db.$transaction(async (tx) => {
      if (b.discountCode) await tx.discountCode.update({ where: { code: b.discountCode }, data: { used: { increment: 1 } } });
      return tx.booking.create({
        data: {
          reference: b.reference, status: b.paymentUrl ? "awaiting_payment" : "requested", tripSlug: b.tripSlug, tripTitle: b.tripTitle,
          startDate: new Date(`${b.startDate}T00:00:00Z`), pax: b.pax, each: b.each, subtotal: b.subtotal, discountCode: b.discountCode, discount: b.discount,
          total: b.total, plan: b.plan, due: b.due, leadName: b.lead.name, leadEmail: b.lead.email.toLowerCase(), leadPhone: b.lead.phone, leadCountry: b.lead.country,
          notes: b.notes || null, paymentUrl: b.paymentUrl, wetravelId: b.wetravelId, paymentError: b.paymentError, ip: b.ip,
        },
      });
    });
    id = row.id;
  } catch (error) {
    if (adminConfigured()) console.error("[booking] database write failed, kept in log", error);
    await record("bookings", { ...b });
  }
  const vars = { name: b.lead.name.split(" ")[0], reference: b.reference, trip: b.tripTitle, date: dateText(b.startDate), pax: `${b.pax} ${b.pax === 1 ? "traveller" : "travellers"}`, total: usd(b.total), due: usd(b.due), email: b.lead.email, phone: b.lead.phone };
  const details: [string, string][] = [
    ["Reference", b.reference],
    ["Trip", b.tripTitle],
    ["Starts", dateText(b.startDate)],
    ["Travellers", `${b.pax} × ${usd(b.each)}`],
    ...(b.discount ? ([["Discount", `${b.discountCode}: −${usd(b.discount)}`]] as [string, string][]) : []),
    ["Trip total", usd(b.total)],
    [b.plan === "deposit" ? "Deposit due now" : "Due now", usd(b.due)],
  ];
  await Promise.allSettled([
    b.paymentUrl
      ? sendTemplate("booking-received", b.lead.email, vars, { details, buttonHref: b.paymentUrl, replyTo: (await officeEmail()) })
      : sendTemplate("booking-request", b.lead.email, vars, { details, replyTo: (await officeEmail()) }),
    sendTemplate("booking-office", (await officeEmail()), { ...vars, name: b.lead.name }, { details: [...details, ["Lead", `${b.lead.name}, ${b.lead.country}`], ["Email", b.lead.email], ["Phone", b.lead.phone], ...(b.notes ? ([["Notes", b.notes]] as [string, string][]) : []), ...(b.paymentError ? ([["Payment link", `Not created: ${b.paymentError}`]] as [string, string][]) : [])], buttonHref: adminLink(id ? `/bookings/${id}` : "/bookings"), replyTo: b.lead.email }),
  ]);
  return id;
}

export async function saveSubscriber(email: string, source: string) {
  const lower = email.toLowerCase();
  if (!adminConfigured()) return record("newsletter", { email: lower, source });
  const { randomBytes } = await import("node:crypto");
  try {
    const existing = await db.subscriber.findUnique({ where: { email: lower } });
    if (existing?.status === "subscribed") return;
    const sub = existing
      ? await db.subscriber.update({ where: { email: lower }, data: { status: "subscribed", unsubscribedAt: null, source } })
      : await db.subscriber.create({ data: { email: lower, source, token: randomBytes(24).toString("base64url") } });
    await sendWelcome(lower, sub.token);
  } catch (error) {
    console.error("[newsletter] database write failed, kept in log", error);
    await record("newsletter", { email: lower, source });
  }
}

export { env as adminEnv };

/** The welcome email, in the newsletter design, with the homepage's featured trips. */
async function sendWelcome(email: string, token: string) {
  const { renderNewsletter, newsletterText } = await import("@/lib/admin/email/newsletter");
  const { templateDef } = await import("@/lib/admin/email/templates");
  const { sendHtml } = await import("@/lib/admin/email/send");
  const { getFeaturedTrips, getDestination } = await import("@/lib/content");
  const def = templateDef("newsletter-welcome")!;
  const saved = await db.emailTemplate.findUnique({ where: { key: def.key } }).catch(() => null);
  if (saved && !saved.enabled) return;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, "");
  const n = {
    preheader: "Seasonal trip ideas, trekking guides and our festival offers.",
    heading: saved?.heading ?? def.heading,
    body: saved?.body ?? def.body,
    hero: "/photos/hero-ama-dablam.webp",
    heroAlt: "Ama Dablam above the Everest trail",
    offer: null,
    trips: getFeaturedTrips().slice(0, 3).map((t) => ({ slug: t.slug, title: t.title, days: t.days, region: t.destinations[0] ? getDestination(t.destinations[0])?.name ?? null : null, price: t.price?.amount ?? null, regular: t.price?.regular ?? null, image: t.cover?.src ?? null })),
    button: saved?.button ?? def.button ?? "Browse our trips",
    buttonUrl: `${site}/trip/`,
    unsubscribeUrl: `${site}/api/newsletter/unsubscribe/?t=${token}`,
  };
  await sendHtml(email, saved?.subject ?? def.subject, renderNewsletter(n), newsletterText(n), def.key, { replyTo: (await officeEmail()), unsubscribeUrl: n.unsubscribeUrl });
}
