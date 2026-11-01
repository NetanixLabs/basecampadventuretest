import "server-only";
import type { Booking } from "@/generated/prisma/client";
import { db } from "@/lib/admin/db";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";

/**
 * Turns a WeTravel notification into a recorded payment on the right booking.
 *
 * WeTravel sends our booking reference back (we set it as the trip reference
 * when creating the payment link), so the booking is found by reference
 * first, then by WeTravel's own id. Every event is stored, so the office can
 * always see exactly what WeTravel reported.
 */
const REF = /\b(?:BCA|PAY)-[A-Z0-9]{6}\b/;
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type Json = Record<string, unknown>;

function deepFind(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) if (k in (obj as Json) && (obj as Json)[k] !== null && (obj as Json)[k] !== "") return (obj as Json)[k];
  for (const v of Object.values(obj as Json)) {
    const hit = deepFind(v, keys);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

async function findBooking(payload: Json): Promise<Booking | null> {
  const text = JSON.stringify(payload);
  const ref = text.match(REF)?.[0];
  if (ref) {
    const b = await db.booking.findUnique({ where: { reference: ref } });
    if (b) return b;
  }
  const ids = [...new Set([...text.matchAll(/"(?:uuid|trip_uuid|payment_link_uuid|id)"\s*:\s*"([^"]{6,})"/g)].map((m) => m[1]))];
  if (ids.length) return db.booking.findFirst({ where: { wetravelId: { in: ids } } });
  return null;
}

/** WeTravel may report dollars or cents; a value far above the booking total is cents. */
function amountOf(payload: Json, booking: Booking | null): number {
  const raw = Number(deepFind(payload, ["amount", "total_amount", "paid_amount", "net_amount", "price"]));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const total = booking ? Number(booking.total) : 0;
  return Number.isInteger(raw) && total && raw > total * 1.5 ? raw / 100 : raw;
}

const SUCCESS = /succe|paid|complete|captur|settled|approved/i;
const REFUND = /refund/i;

export async function handleWetravelEvent(eventId: string, payload: Json) {
  const type = String(payload.type ?? payload.event ?? payload.event_type ?? "unknown");
  const existing = await db.webhookEvent.findUnique({ where: { provider_eventId: { provider: "wetravel", eventId } } });
  if (existing?.processedAt) return { duplicate: true };
  const event = existing ?? (await db.webhookEvent.create({ data: { provider: "wetravel", eventId, type, payload: payload as object } }));

  try {
    const booking = await findBooking(payload);
    const status = String(deepFind(payload, ["status", "payment_status", "state"]) ?? type);
    const isPayment = /payment|transaction/i.test(type);
    if (!isPayment || !booking) {
      await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), error: booking ? null : "No matching booking (kept for the office to check)" } });
      return { matched: Boolean(booking) };
    }

    const amount = amountOf(payload, booking);
    const providerId = String(deepFind(payload, ["payment_id", "transaction_id", "uuid", "id"]) ?? eventId);
    const refund = REFUND.test(type) || REFUND.test(status);
    const success = !refund && SUCCESS.test(status);

    await db.payment.upsert({
      where: { providerId },
      create: { bookingId: booking.id, providerId, amount, status: refund ? "refunded" : success ? "succeeded" : status.slice(0, 40), payerEmail: String(deepFind(payload, ["email", "buyer_email", "payer_email"]) ?? "") || null, raw: payload as object },
      update: { status: refund ? "refunded" : success ? "succeeded" : status.slice(0, 40), raw: payload as object },
    });

    const paid = Number((await db.payment.aggregate({ where: { bookingId: booking.id, status: "succeeded" }, _sum: { amount: true } }))._sum.amount ?? 0);
    const total = Number(booking.total);
    const next = refund ? "refunded" : paid >= total - 0.5 ? "paid" : paid > 0 ? "deposit_paid" : booking.status;
    const updated = await db.booking.update({ where: { id: booking.id }, data: { paid, status: ["confirmed", "cancelled"].includes(booking.status) && !refund ? booking.status : next } });

    if (success && amount > 0) {
      const vars = { name: booking.leadName.split(" ")[0], reference: booking.reference, trip: booking.tripTitle, date: booking.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), amount: usd(amount), balance: usd(Math.max(0, total - paid)) };
      const admin = `${(process.env.ADMIN_URL ?? "https://admin.basecampadventure.com").replace(/\/$/, "")}/bookings/${booking.id}`;
      await Promise.allSettled([
        sendTemplate("payment-received", booking.leadEmail, vars, { details: [["Reference", booking.reference], ["Paid now", usd(amount)], ["Paid in total", usd(paid)], ["Trip total", usd(total)], ["Balance", usd(Math.max(0, total - paid))]], replyTo: (await officeEmail()) }),
        sendTemplate("payment-office", (await officeEmail()), { ...vars, name: booking.leadName }, { buttonHref: admin }),
      ]);
    }
    await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), error: null } });
    return { matched: true, status: updated.status };
  } catch (e) {
    await db.webhookEvent.update({ where: { id: event.id }, data: { error: e instanceof Error ? e.message.slice(0, 500) : "failed" } });
    throw e;
  }
}
