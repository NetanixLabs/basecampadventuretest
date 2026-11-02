import "server-only";
import type { Booking } from "@/generated/prisma/client";
import { db } from "@/lib/admin/db";
import { features } from "@/lib/admin/features";
import { applyPayment } from "@/lib/server/payments";
import { createHblPayment, hblEnabled, hblInquiry } from "@/lib/server/hbl";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, "");

/** The permanent "pay now" address for a booking (used in emails, never expires). */
export const payLink = (reference: string) => `${site()}/pay/${reference}/`;

/** What the traveller should pay now, in USD cents: the deposit first, then the balance. */
export function dueNowCents(b: Booking) {
  const total = Math.round(Number(b.total) * 100);
  const paid = Math.round(Number(b.paid) * 100);
  if (paid <= 0) return Math.round(Number(b.due) * 100);
  return Math.max(0, total - paid);
}

/** Starts an HBL card payment for a booking; returns the bank's payment page. */
export async function startHblPayment(b: Booking) {
  if (!(await hblEnabled())) throw new Error("HBL payments are switched off.");
  const usdCents = dueNowCents(b);
  if (usdCents <= 0) throw new Error("Nothing left to pay.");
  const f = (await features()).payments;
  const currency = f.hblCurrency;
  const charge = currency === "NPR" ? Math.round((usdCents / 100) * f.nprRate * 100) / 100 : usdCents / 100;
  const orderNo = `${b.reference}-${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
  // The pending payment remembers what this order is for, in USD, before the traveller leaves.
  await db.payment.create({ data: { bookingId: b.id, provider: "hbl", providerId: `hbl:${orderNo}`, amount: usdCents / 100, status: "pending", raw: { orderNo, charge, currency, nprRate: currency === "NPR" ? f.nprRate : null } } });
  return createHblPayment({ orderNo, amount: charge, currency, description: `${b.tripTitle} ${b.reference}`, name: b.leadName, email: b.leadEmail, returnBase: site() });
}

/** Confirms an HBL order with the bank and records the payment once. */
export async function settleHblOrder(orderNo: string) {
  const pending = await db.payment.findUnique({ where: { providerId: `hbl:${orderNo}` }, include: { booking: true } });
  if (!pending?.booking) return { state: "unknown" as const };
  if (pending.status === "succeeded") return { state: "paid" as const, booking: pending.booking };
  const s = await hblInquiry(orderNo);
  const meta = pending.raw as { charge?: number; currency?: string };
  // The bank must confirm the same amount we asked for (to the cent).
  const amountOk = !meta?.charge || Math.round(s.amount * 100) === Math.round(Number(meta.charge) * 100);
  if (s.success && amountOk) {
    await applyPayment(pending.booking, { provider: "hbl", providerId: `hbl:${orderNo}`, amount: Number(pending.amount), success: true, status: s.status, raw: { ...(pending.raw as object), inquiry: s.raw, transactionId: s.transactionId } });
    return { state: "paid" as const, booking: pending.booking };
  }
  if (s.success && !amountOk) {
    await db.payment.update({ where: { id: pending.id }, data: { status: "amount_mismatch", raw: { ...(pending.raw as object), inquiry: s.raw } as object } });
    return { state: "review" as const, booking: pending.booking };
  }
  if (s.failed) await db.payment.update({ where: { id: pending.id }, data: { status: "failed", raw: { ...(pending.raw as object), inquiry: s.raw } as object } });
  return { state: s.failed ? ("failed" as const) : ("pending" as const), booking: pending.booking };
}
