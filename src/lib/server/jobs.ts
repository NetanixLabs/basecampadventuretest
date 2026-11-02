import "server-only";
import { savedReminders } from "@/lib/server/saved";
import { db } from "@/lib/admin/db";
import { hashToken, randomToken } from "@/lib/admin/crypto";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { features } from "@/lib/admin/features";
import { purgeTraveller, tripEnd } from "@/lib/server/portal";

/**
 * The scheduled jobs, run every 15 minutes by the server's timer through
 * /api/cron. Each job is idempotent: it marks what it did, so running it
 * twice never sends anything twice.
 */
const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, "");
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const dateText = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export async function paymentReminders() {
  const f = (await features()).abandoned;
  if (!f.enabled) return 0;
  const before = new Date(Date.now() - f.afterHours * 3600_000);
  const due = await db.booking.findMany({
    where: { status: "awaiting_payment", paid: 0, reminderSentAt: null, paymentUrl: { not: null }, createdAt: { lt: before, gt: new Date(Date.now() - 14 * 86_400_000) }, startDate: { gt: new Date() } },
    take: 50,
  });
  let sent = 0;
  for (const b of due) {
    // Claim it first so a parallel run can't send it again.
    const claimed = await db.booking.updateMany({ where: { id: b.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
    if (!claimed.count) continue;
    const r = await sendTemplate("payment-reminder", b.leadEmail, { name: b.leadName.split(" ")[0], reference: b.reference, trip: b.tripTitle, date: dateText(b.startDate), due: usd(Number(b.due)) }, { buttonHref: b.paymentUrl!, details: [["Reference", b.reference], ["Trip", b.tripTitle], ["Starts", dateText(b.startDate)], ["Due now", usd(Number(b.due))]], replyTo: await officeEmail() });
    if (r.ok) sent++;
  }
  return sent;
}

export async function reviewRequests() {
  const f = (await features()).reviews;
  if (!f.enabled) return 0;
  const candidates = await db.booking.findMany({
    where: { status: { in: ["paid", "confirmed", "deposit_paid"] }, reviewRequestedAt: null, startDate: { lt: new Date(), gt: new Date(Date.now() - 120 * 86_400_000) } },
    take: 100,
  });
  let sent = 0;
  for (const b of candidates) {
    if (tripEnd(b).getTime() + f.afterDays * 86_400_000 > Date.now()) continue;
    const token = randomToken();
    const claimed = await db.booking.updateMany({ where: { id: b.id, reviewRequestedAt: null }, data: { reviewRequestedAt: new Date(), reviewTokenHash: hashToken(token) } });
    if (!claimed.count) continue;
    const r = await sendTemplate("review-request", b.leadEmail, { name: b.leadName.split(" ")[0], trip: b.tripTitle }, { buttonHref: `${site()}/review/?t=${token}`, replyTo: await officeEmail() });
    if (r.ok) sent++;
  }
  return sent;
}

/** Emails 30 and 7 days before departure (once each), with the balance and pay link if anything is still open. */
export async function preTripEmails() {
  const f = (await features()).pretrip;
  if (!f.enabled) return 0;
  const { payLink } = await import("@/lib/server/gateway");
  const portal = (process.env.PORTAL_URL ?? "https://my.basecampadventure.com").replace(/\/$/, "");
  let sent = 0;
  for (const [days, flag, template, on] of [[30, "pretrip30At", "pretrip-30", f.d30], [7, "pretrip7At", "pretrip-7", f.d7]] as const) {
    if (!on) continue;
    const from = new Date(Date.now() + (days - 1) * 86_400_000);
    const to = new Date(Date.now() + days * 86_400_000);
    const due = await db.booking.findMany({ where: { status: { in: ["deposit_paid", "paid", "confirmed"] }, startDate: { gte: from, lte: to }, [flag]: null }, take: 100 });
    for (const b of due) {
      const claimed = await db.booking.updateMany({ where: { id: b.id, [flag]: null }, data: { [flag]: new Date() } });
      if (!claimed.count) continue;
      const balanceCents = Math.max(0, Math.round(Number(b.total) * 100) - Math.round(Number(b.paid) * 100));
      const balance = usd(balanceCents / 100);
      const r = await sendTemplate(template, b.leadEmail, { name: b.leadName.split(" ")[0], trip: b.tripTitle, date: dateText(b.startDate), balance }, {
        buttonHref: b.travellerId ? `${portal}/` : `${site()}/trip/${b.tripSlug}/`,
        details: [["Reference", b.reference], ["Trip", b.tripTitle], ["Starts", dateText(b.startDate)], ...(balanceCents > 0 ? ([["Balance to pay", balance], ["Pay online", payLink(b.reference)]] as [string, string][]) : [])],
        replyTo: await officeEmail(),
      });
      if (r.ok) sent++;
    }
  }
  return sent;
}

export async function expirePortal() {
  const old = await db.traveller.findMany({ where: { status: { in: ["invited", "active", "disabled"] }, expiresAt: { lt: new Date() } }, select: { id: true }, take: 50 });
  for (const t of old) await purgeTraveller(t.id);
  await db.travellerSession.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: new Date(Date.now() - 7 * 86_400_000) } }] } });
  return old.length;
}

export async function runJobs() {
  const out: Record<string, number | string> = {};
  for (const [name, job] of Object.entries({ reminders: paymentReminders, preTrip: preTripEmails, reviews: reviewRequests, portalExpired: expirePortal, savedReminders })) {
    try {
      out[name] = await job();
    } catch (e) {
      console.error(`[jobs] ${name} failed`, e);
      out[name] = "failed";
    }
  }
  return out;
}
