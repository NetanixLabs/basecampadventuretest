import "server-only";
import { db } from "@/lib/admin/db";
import { getTrip } from "@/lib/content";

/**
 * Departures: every group of bookings for the same trip on the same start
 * date. The Departure row (created when the office first assigns staff or
 * writes notes) holds the field team; bookings are matched by trip + date.
 */
export const ACTIVE = ["requested", "awaiting_payment", "deposit_paid", "paid", "confirmed"] as const;
const DAY = 86_400_000;

export const depKey = (slug: string, date: Date) => `${slug}~${date.toISOString().slice(0, 10)}`;
export function parseKey(key: string) {
  const m = /^([a-z0-9-]{1,120})~(\d{4}-\d{2}-\d{2})$/.exec(decodeURIComponent(key));
  return m ? { slug: m[1], date: new Date(`${m[2]}T00:00:00Z`) } : null;
}
export const tripDays = (slug: string) => Math.max(1, getTrip(slug)?.days ?? 1);
export const endOf = (slug: string, start: Date) => new Date(start.getTime() + (tripDays(slug) - 1) * DAY);

export async function upcomingDepartures(fromDays = -3, toDays = 400) {
  const from = new Date(Date.now() + fromDays * DAY);
  const to = new Date(Date.now() + toDays * DAY);
  const bookings = await db.booking.findMany({ where: { status: { in: [...ACTIVE] }, startDate: { gte: from, lte: to } }, orderBy: { startDate: "asc" } });
  const groups = new Map<string, { key: string; slug: string; title: string; start: Date; end: Date; pax: number; bookings: typeof bookings; paid: number; total: number }>();
  for (const b of bookings) {
    const key = depKey(b.tripSlug, b.startDate);
    const g = groups.get(key) ?? { key, slug: b.tripSlug, title: b.tripTitle, start: b.startDate, end: endOf(b.tripSlug, b.startDate), pax: 0, bookings: [], paid: 0, total: 0 };
    g.pax += b.pax;
    g.paid += Number(b.paid);
    g.total += Number(b.total);
    g.bookings.push(b);
    groups.set(key, g);
  }
  const deps = await db.departure.findMany({ where: { startDate: { gte: from, lte: to } }, include: { staff: { include: { guide: true } } } });
  const byKey = new Map(deps.map((d) => [depKey(d.tripSlug, d.startDate), d]));
  // Fixed departures put on the website before anyone has booked are listed too.
  for (const d of deps) {
    const key = depKey(d.tripSlug, d.startDate);
    if (d.published && !groups.has(key)) groups.set(key, { key, slug: d.tripSlug, title: getTrip(d.tripSlug)?.title ?? d.tripSlug, start: d.startDate, end: endOf(d.tripSlug, d.startDate), pax: 0, bookings: [], paid: 0, total: 0 });
  }
  return [...groups.values()].sort((a, b) => a.start.getTime() - b.start.getTime()).map((g) => ({ ...g, departure: byKey.get(g.key) ?? null }));
}

/** Travellers already booked on a trip's start date (active bookings only). */
export async function bookedPax(slug: string, date: Date) {
  const r = await db.booking.aggregate({ where: { tripSlug: slug, startDate: date, status: { in: [...ACTIVE] } }, _sum: { pax: true } });
  return r._sum.pax ?? 0;
}

export type OpenDeparture = { date: string; seats: number | null; seatsLeft: number | null; guaranteed: boolean; full: boolean };

/** Fixed departures shown on a trip's booking form: published, and at least 14 days ahead, like the booking calendar. */
export async function openDepartures(slug: string): Promise<OpenDeparture[]> {
  const from = new Date(Date.now() + 14 * DAY);
  const deps = await db.departure.findMany({ where: { tripSlug: slug, published: true, startDate: { gte: from } }, orderBy: { startDate: "asc" }, take: 24 });
  if (!deps.length) return [];
  const sums = await db.booking.groupBy({ by: ["startDate"], where: { tripSlug: slug, startDate: { in: deps.map((d) => d.startDate) }, status: { in: [...ACTIVE] } }, _sum: { pax: true } });
  const booked = new Map(sums.map((x) => [x.startDate.toISOString().slice(0, 10), x._sum.pax ?? 0]));
  return deps.map((d) => {
    const date = d.startDate.toISOString().slice(0, 10);
    const left = d.seats == null ? null : Math.max(0, d.seats - (booked.get(date) ?? 0));
    return { date, seats: d.seats, seatsLeft: left, guaranteed: d.guaranteed, full: left === 0 };
  });
}

/** Seats still free on a published departure with a seat limit, or null when there is no limit. */
export async function seatsLeftOn(slug: string, date: Date) {
  const d = await db.departure.findUnique({ where: { tripSlug_startDate: { tripSlug: slug, startDate: date } } });
  if (!d?.published || d.seats == null) return null;
  return Math.max(0, d.seats - (await bookedPax(slug, date)));
}

/** Other departures a guide is already on during these dates (to avoid double booking). */
export async function clashes(guideId: string, slug: string, start: Date, exceptDepartureId?: string) {
  const end = endOf(slug, start);
  const others = await db.departureStaff.findMany({ where: { guideId, ...(exceptDepartureId ? { departureId: { not: exceptDepartureId } } : {}) }, include: { departure: true } });
  return others.filter((o) => o.departure.startDate <= end && endOf(o.departure.tripSlug, o.departure.startDate) >= start).map((o) => o.departure);
}

/** Emails a guide or porter their assignment with the departure list PDF. Returns what happened. */
export async function notifyAssignment(departureId: string, guideId: string): Promise<"sent" | "no-email" | "off" | "failed"> {
  const { features } = await import("@/lib/admin/features");
  if (!(await features()).guideNotify.enabled) return "off";
  const row = await db.departureStaff.findUnique({ where: { departureId_guideId: { departureId, guideId } }, include: { guide: true, departure: { include: { staff: { include: { guide: true } } } } } });
  if (!row) return "failed";
  if (!row.guide.email) return "no-email";
  const d = row.departure;
  const bookings = await db.booking.findMany({ where: { tripSlug: d.tripSlug, startDate: d.startDate, status: { in: [...ACTIVE] } }, orderBy: { createdAt: "asc" } });
  const title = bookings[0]?.tripTitle ?? getTrip(d.tripSlug)?.title ?? d.tripSlug;
  const [{ departurePdf }, { sendTemplate, officeEmail }] = await Promise.all([import("@/lib/server/departure-pdf"), import("@/lib/admin/email/send")]);
  const pdf = await departurePdf({ title, start: d.startDate, end: endOf(d.tripSlug, d.startDate), bookings, staff: d.staff, notes: d.notes });
  const pax = bookings.reduce((s, b) => s + b.pax, 0);
  const date = d.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const r = await sendTemplate("guide-assignment", row.guide.email, { name: row.guide.name.split(" ")[0], trip: title, date, role: row.role, travellers: `${pax} ${pax === 1 ? "traveller" : "travellers"}` }, {
    details: [["Trip", title], ["Starts", date], ["Role", row.role], ["Travellers", String(pax)], ...(d.pickupTime || d.pickupPlace ? ([["Pickup", [d.pickupTime, d.pickupPlace].filter(Boolean).join(", ")]] as [string, string][]) : [])],
    replyTo: await officeEmail(),
    attachments: [{ filename: `Departure-${d.tripSlug}-${d.startDate.toISOString().slice(0, 10)}.pdf`, content: pdf, contentType: "application/pdf" }],
  });
  if (!r.ok) return "failed";
  await db.departureStaff.update({ where: { id: row.id }, data: { notifiedAt: new Date() } });
  return "sent";
}
