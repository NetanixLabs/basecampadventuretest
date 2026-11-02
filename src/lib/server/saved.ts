import "server-only";
import { db } from "@/lib/admin/db";
import { hashToken } from "@/lib/admin/crypto";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { features } from "@/lib/admin/features";
import { getTrip } from "@/lib/content";
import { site } from "@/lib/site";
import { usd } from "@/lib/utils";

export const tripDetails = (slugs: string[]) =>
  slugs.map((s) => getTrip(s)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((t) => [t.title, `${t.days} days${t.price ? ` · from ${usd(t.price.amount)}` : ""}`] as [string, string]);

/** The trips in an emailed list, from the link's token (only its hash is stored). */
export async function savedByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const row = await db.savedList.findUnique({ where: { token: hashToken(token) } });
  return row ? row.trips.filter((s) => getTrip(s)) : null;
}

/** Scheduled job: one reminder per list, after the days set in Features. */
export async function savedReminders() {
  if (!(await features()).saved.enabled) return 0;
  const due = await db.savedList.findMany({ where: { remindAt: { lte: new Date() }, remindedAt: null }, take: 50 });
  let sent = 0;
  for (const l of due) {
    await db.savedList.update({ where: { id: l.id }, data: { remindedAt: new Date() } });
    const trips = l.trips.filter((s) => getTrip(s));
    if (!trips.length) continue;
    // The reminder carries a fresh link only in the first email; here we link to the trips directly.
    await sendTemplate("saved-reminder", l.email, { count: trips.length }, { details: tripDetails(trips), buttonHref: `${site.url}/trip/${trips[0]}/`, replyTo: await officeEmail() }).catch(() => undefined);
    sent++;
  }
  return sent;
}
