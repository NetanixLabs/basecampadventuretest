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
  return [...groups.values()].map((g) => ({ ...g, departure: byKey.get(g.key) ?? null }));
}

/** Other departures a guide is already on during these dates (to avoid double booking). */
export async function clashes(guideId: string, slug: string, start: Date, exceptDepartureId?: string) {
  const end = endOf(slug, start);
  const others = await db.departureStaff.findMany({ where: { guideId, ...(exceptDepartureId ? { departureId: { not: exceptDepartureId } } : {}) }, include: { departure: true } });
  return others.filter((o) => o.departure.startDate <= end && endOf(o.departure.tripSlug, o.departure.startDate) >= start).map((o) => o.departure);
}
