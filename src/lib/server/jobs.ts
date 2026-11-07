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

/**
 * The second, more personal reminder for unpaid bookings, a few days after the
 * first one, optionally with a small discount code made by the office.
 */
export async function secondPaymentReminders() {
  const f = (await features()).abandoned;
  if (!f.enabled || !f.second) return 0;
  const before = new Date(Date.now() - f.secondDays * 86_400_000);
  const due = await db.booking.findMany({
    where: { status: "awaiting_payment", paid: 0, reminderSentAt: { lt: before, gt: new Date(Date.now() - 21 * 86_400_000) }, reminder2SentAt: null, paymentUrl: { not: null }, startDate: { gt: new Date(Date.now() + 14 * 86_400_000) } },
    take: 50,
  });
  let code: { code: string; kind: string; value: unknown } | null = null;
  if (f.secondCode) code = await db.discountCode.findFirst({ where: { code: f.secondCode, active: true }, select: { code: true, kind: true, value: true } }).catch(() => null);
  const { payLink } = await import("@/lib/server/gateway");
  let sent = 0;
  for (const b of due) {
    // A newer booking by the same person (they booked again) needs no reminder.
    const again = await db.booking.count({ where: { leadEmail: b.leadEmail, createdAt: { gt: b.createdAt }, status: { in: ["deposit_paid", "paid", "confirmed"] } } });
    const claimed = await db.booking.updateMany({ where: { id: b.id, reminder2SentAt: null }, data: { reminder2SentAt: new Date() } });
    if (!claimed.count || again) continue;
    const off = code ? (code.kind === "percent" ? `${Number(code.value)}%` : usd(Number(code.value))) : "";
    const offer = code ? `As a small thank-you, use the code **${code.code}** for ${off} off when you book again on our website.` : "";
    const r = await sendTemplate("payment-reminder-2", b.leadEmail, { name: b.leadName.split(" ")[0], reference: b.reference, trip: b.tripTitle, date: dateText(b.startDate), due: usd(Number(b.due)), code: code?.code ?? "", offer }, {
      buttonHref: code ? `${site()}/booking/?${new URLSearchParams({ trip: b.tripSlug, date: b.startDate.toISOString().slice(0, 10), pax: String(b.pax), code: code.code })}` : payLink(b.reference),
      details: [["Reference", b.reference], ["Trip", b.tripTitle], ["Starts", dateText(b.startDate)], ...(code ? ([["Discount code", code.code]] as [string, string][]) : [])],
      replyTo: await officeEmail(),
    });
    if (r.ok) sent++;
  }
  return sent;
}

/** Reminders for missing documents (passport, photo, insurance, flights) at the stages set in Features. */
export async function documentReminders() {
  const f = (await features()).docs;
  if (!f.enabled) return 0;
  const { bookingDocs } = await import("@/lib/server/checklist");
  const { notifyBooking } = await import("@/lib/server/push");
  const portal = (process.env.PORTAL_URL ?? "https://my.basecampadventure.com").replace(/\/$/, "");
  const stages = [...new Set(String(f.days).split(",").map((x) => Math.round(Number(x.trim()))).filter((n) => n >= 1 && n <= 180))].sort((a, b) => b - a);
  let sent = 0;
  for (const days of stages) {
    const stage = String(days);
    const due = await db.booking.findMany({ where: { status: { in: ["deposit_paid", "paid", "confirmed"] }, travellerId: { not: null }, startDate: { gte: new Date(Date.now() + (days - 1) * 86_400_000), lte: new Date(Date.now() + days * 86_400_000) }, NOT: { docReminders: { has: stage } } }, include: { access: { include: { traveller: { select: { email: true, name: true } } } } }, take: 100 });
    for (const b of due) {
      const missing = (await bookingDocs(b)).filter((d) => !d.done);
      const claimed = await db.booking.updateMany({ where: { id: b.id, NOT: { docReminders: { has: stage } } }, data: { docReminders: { push: stage } } });
      if (!claimed.count || !missing.length) continue;
      const list = missing.map((d) => `• **${d.label}**${d.need > 1 ? ` (${d.have} of ${d.need} received)` : ""}`).join("\n");
      const people = [{ email: b.leadEmail, name: b.leadName }, ...b.access.map((a) => a.traveller)];
      for (const p of people) {
        const r = await sendTemplate("documents-reminder", p.email, { name: p.name.split(" ")[0], trip: b.tripTitle, date: dateText(b.startDate), days, missing: list }, { buttonHref: `${portal}/trip/${b.id}/#documents`, replyTo: await officeEmail() });
        if (r.ok) sent++;
      }
      await notifyBooking(b.id, { kind: "reminder", title: `${days} days to go: documents missing`, body: `Still needed: ${missing.map((d) => d.label.toLowerCase()).join(", ")}.`, href: `/trip/${b.id}/#documents` });
    }
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

/** Balance reminders at the stages set in Features (default 60, 30 and 14 days before the start), once each. */
export async function balanceReminders() {
  const all = await features();
  const f = all.balance;
  if (!f.enabled) return 0;
  const { payLink } = await import("@/lib/server/gateway");
  const stages = [...new Set(String(f.days).split(",").map((x) => Math.round(Number(x.trim()))).filter((n) => n >= 1 && n <= 180))].sort((a, b) => b - a);
  let sent = 0;
  for (const days of stages) {
    // The one-month email already shows the balance and the pay link.
    if (days === 30 && all.pretrip.enabled && all.pretrip.d30) continue;
    const stage = String(days);
    const from = new Date(Date.now() + (days - 1) * 86_400_000);
    const to = new Date(Date.now() + days * 86_400_000);
    const due = await db.booking.findMany({ where: { status: { in: ["deposit_paid", "confirmed"] }, startDate: { gte: from, lte: to }, NOT: { balanceReminders: { has: stage } } }, take: 100 });
    for (const b of due) {
      const balanceCents = Math.round(Number(b.total) * 100) - Math.round(Number(b.paid) * 100);
      if (balanceCents <= 0) continue;
      // Claimed first, so two job runs at the same moment never both send it.
      const claimed = await db.booking.updateMany({ where: { id: b.id, NOT: { balanceReminders: { has: stage } } }, data: { balanceReminders: { push: stage } } });
      if (!claimed.count) continue;
      const balance = usd(balanceCents / 100);
      const r = await sendTemplate("balance-reminder", b.leadEmail, { name: b.leadName.split(" ")[0], trip: b.tripTitle, date: dateText(b.startDate), balance, days }, {
        buttonHref: payLink(b.reference),
        details: [["Reference", b.reference], ["Trip", b.tripTitle], ["Starts", dateText(b.startDate)], ["Trip total", usd(Number(b.total))], ["Paid so far", usd(Number(b.paid))], ["Balance", balance]],
        replyTo: await officeEmail(),
      });
      if (r.ok) sent++;
      const { notifyBooking } = await import("@/lib/server/push");
      await notifyBooking(b.id, { kind: "reminder", title: `Balance due: ${balance}`, body: `${b.tripTitle} starts in ${days} days. Tap to pay securely.`, href: `/trip/${b.id}/#payments` }, b.travellerId ? [b.travellerId] : []);
    }
  }
  return sent;
}

/** The day before the start: pickup time and place, and who the guide is. */
export async function dayBeforeEmails() {
  const f = (await features()).pretrip;
  if (!f.enabled || !f.d1) return 0;
  const portal = (process.env.PORTAL_URL ?? "https://my.basecampadventure.com").replace(/\/$/, "");
  const due = await db.booking.findMany({ where: { status: { in: ["deposit_paid", "paid", "confirmed"] }, startDate: { gte: new Date(), lte: new Date(Date.now() + 86_400_000) }, pretrip1At: null }, take: 100 });
  let sent = 0;
  for (const b of due) {
    const claimed = await db.booking.updateMany({ where: { id: b.id, pretrip1At: null }, data: { pretrip1At: new Date() } });
    if (!claimed.count) continue;
    const dep = await db.departure.findUnique({ where: { tripSlug_startDate: { tripSlug: b.tripSlug, startDate: b.startDate } }, include: { staff: { include: { guide: true } } } });
    const lead = dep?.staff.find((s) => s.role === "leader") ?? dep?.staff.find((s) => s.role === "guide");
    const pickup = [dep?.pickupTime, dep?.pickupPlace].filter(Boolean).join(", ") || "our team will confirm the time with you today";
    const guide = lead ? `${lead.guide.name}${lead.guide.phone ? ` (${lead.guide.phone})` : ""}` : "our office will introduce your guide";
    const r = await sendTemplate("pretrip-1", b.leadEmail, { name: b.leadName.split(" ")[0], trip: b.tripTitle, date: dateText(b.startDate), pickup, guide }, {
      buttonHref: b.travellerId ? `${portal}/trip/${b.id}/` : `${site()}/trip/${b.tripSlug}/`,
      details: [["Reference", b.reference], ["Starts", dateText(b.startDate)], ["Pickup", pickup], ["Guide", guide], ["Office 24/7", "+977 985 102 9616"]],
      replyTo: await officeEmail(),
    });
    if (r.ok) sent++;
    const { notifyBooking } = await import("@/lib/server/push");
    await notifyBooking(b.id, { kind: "trip", title: "Your trip starts tomorrow!", body: `Pickup: ${pickup}. Guide: ${guide}.` });
  }
  return sent;
}

/** Exchange rates for prices in EUR / GBP / AUD, refreshed once a day when Automatic is on. */
export async function refreshRates() {
  const row = await db.setting.findUnique({ where: { key: "features" } });
  const { withFeatureDefaults } = await import("@/lib/features");
  const f = withFeatureDefaults(row?.value);
  if (!f.currency.enabled || !f.currency.auto) return "off";
  if (f.currency.updatedAt && Date.now() - new Date(f.currency.updatedAt).getTime() < 23 * 3600_000) return "fresh";
  const sources = [process.env.RATES_URL, "https://open.er-api.com/v6/latest/USD", "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,AUD"].filter(Boolean) as string[];
  for (const url of sources) {
    try {
      const j = (await (await fetch(url, { signal: AbortSignal.timeout(10_000) })).json()) as { rates?: Record<string, number> };
      const r = j.rates ?? {};
      const ok = (n: unknown, lo: number, hi: number) => typeof n === "number" && n > lo && n < hi;
      // Sanity limits: a broken answer never reaches the website.
      if (!ok(r.EUR, 0.5, 1.5) || !ok(r.GBP, 0.4, 1.3) || !ok(r.AUD, 0.9, 2.5)) continue;
      const round = (n: number) => Math.round(n * 10000) / 10000;
      f.currency = { ...f.currency, eur: round(r.EUR), gbp: round(r.GBP), aud: round(r.AUD), updatedAt: new Date().toISOString() };
      await db.setting.update({ where: { key: "features" }, data: { value: f as object } });
      const { writeSettings } = await import("@/lib/admin/publish");
      await writeSettings();
      return `updated from ${new URL(url).host}`;
    } catch {
      /* try the next source; the last good rates stay in place */
    }
  }
  return "unreachable";
}

export async function expirePortal() {
  const old = await db.traveller.findMany({ where: { status: { in: ["invited", "active", "disabled"] }, expiresAt: { lt: new Date() } }, select: { id: true }, take: 50 });
  for (const t of old) await purgeTraveller(t.id);
  await db.travellerSession.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: new Date(Date.now() - 7 * 86_400_000) } }] } });
  return old.length;
}

export async function runJobs() {
  const out: Record<string, number | string> = {};
  for (const [name, job] of Object.entries({ reminders: paymentReminders, reminders2: secondPaymentReminders, documents: documentReminders, preTrip: preTripEmails, balance: balanceReminders, dayBefore: dayBeforeEmails, rates: refreshRates, galleryWatermarks: async () => ((await (await import("@/lib/admin/bulk-watermark")).startBulkWatermark({ auto: true })).ok ? 1 : 0), pagesAfterWatermark: async () => (await (await import("@/lib/admin/bulk-watermark")).refreshIfPending()) ? 1 : 0, reviews: reviewRequests, portalExpired: expirePortal, savedReminders })) {
    try {
      out[name] = await job();
    } catch (e) {
      console.error(`[jobs] ${name} failed`, e);
      out[name] = "failed";
    }
  }
  return out;
}
