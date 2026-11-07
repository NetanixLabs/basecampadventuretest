import "server-only";
import { db } from "@/lib/admin/db";

/**
 * Automatic customer groups, worked out from bookings (nothing to keep up
 * to date by hand): past travellers, repeat travellers, VIPs (3+ trips or
 * US$5,000+ paid) and travellers with a trip coming up.
 */
export const SEGMENTS = { travelled: "Past travellers", repeat: "Repeat", vip: "VIP", upcoming: "Upcoming trip" } as const;
export type Segment = keyof typeof SEGMENTS;
export const isSegment = (s: string): s is Segment => s in SEGMENTS;
const VIP_SPEND = 5000;

export type Stats = { trips: number; paid: number; last: Date | null; next: Date | null; segments: Segment[] };

/** Stats and groups per email, from bookings with money received (cancelled and refunded left out). */
export async function customerStats(emails?: string[]): Promise<Map<string, Stats>> {
  const rows = await db.booking.findMany({
    where: { status: { in: ["deposit_paid", "paid", "confirmed"] }, paid: { gt: 0 }, ...(emails ? { leadEmail: { in: emails } } : {}) },
    select: { leadEmail: true, paid: true, startDate: true },
  });
  const now = Date.now();
  const out = new Map<string, Stats>();
  for (const r of rows) {
    const e = r.leadEmail.toLowerCase();
    const s = out.get(e) ?? { trips: 0, paid: 0, last: null, next: null, segments: [] };
    s.trips++;
    s.paid += Number(r.paid);
    if (r.startDate.getTime() < now) { if (!s.last || r.startDate > s.last) s.last = r.startDate; }
    else if (!s.next || r.startDate < s.next) s.next = r.startDate;
    out.set(e, s);
  }
  for (const s of out.values()) {
    if (s.last) s.segments.push("travelled");
    if (s.trips >= 2) s.segments.push("repeat");
    if (s.trips >= 3 || s.paid >= VIP_SPEND) s.segments.push("vip");
    if (s.next) s.segments.push("upcoming");
  }
  return out;
}

/** Emails in a group. */
export async function emailsIn(seg: Segment) {
  return [...(await customerStats()).entries()].filter(([, s]) => s.segments.includes(seg)).map(([e]) => e);
}
