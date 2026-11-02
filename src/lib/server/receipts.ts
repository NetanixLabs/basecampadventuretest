import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import type { Receipt } from "@/generated/prisma/client";
import { db } from "@/lib/admin/db";
import { env } from "@/lib/admin/env";
import { safeEqual } from "@/lib/admin/crypto";
import { getBrand } from "@/lib/server/receipt-brand";

/**
 * Receipts (money received) and bills (money asked for).
 *
 * Every one gets a running number per year (BCA-R-2026-0001), a short random
 * code for its QR link (/verify/<code>/), and an HMAC signature over its
 * contents made with a key derived from the server's ENCRYPTION_KEY. If
 * anyone edits a receipt (in the database or a PDF), the signature no longer
 * matches and the verification page says so.
 */
export type ReceiptItem = { description: string; qty: number; unitPrice: number };
/** Where the booking stands, in cents, printed under the totals. */
export type ReceiptSummary = { tripTotal: number; paidBefore: number; thisPayment: number; balance: number; tripPrice?: number; discount?: number; discountCode?: string | null };
export type ReceiptInput = {
  kind: "receipt" | "bill";
  bookingId?: string | null;
  paymentId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  items: ReceiptItem[];
  currency?: string;
  paidVia?: string | null;
  paidAt?: Date | null;
  notes?: string | null;
  summary?: ReceiptSummary | null;
};

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newCode() {
  let s = "";
  for (const b of randomBytes(12)) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s.slice(0, 10);
}

/** All sums are done in whole cents, so there are never rounding mistakes. */
const cents = (n: number) => Math.round(Number(n) * 100);
const fromCents = (c: number) => (c / 100).toFixed(2);
const hmacKey = () => createHmac("sha256", Buffer.from(env().ENCRYPTION_KEY, "base64")).update("receipt-signature-v1").digest();

/** The exact contents the signature covers. */
function canonical(r: Pick<Receipt, "number" | "kind" | "code" | "customerName" | "customerEmail" | "currency" | "paidVia"> & { items: unknown; subtotal: unknown; vat: unknown; total: unknown; issuedAt: Date; paidAt: Date | null; summary?: unknown }) {
  // Items in a fixed shape: the database may store JSON keys in another order.
  const items = (Array.isArray(r.items) ? r.items : []).map((i: ReceiptItem) => [String(i.description), Number(i.qty), Number(i.unitPrice).toFixed(2)]);
  return JSON.stringify([r.number, r.kind, r.code, r.customerName, r.customerEmail ?? "", items, String(Number(r.subtotal).toFixed(2)), String(Number(r.vat).toFixed(2)), String(Number(r.total).toFixed(2)), r.currency, r.paidVia ?? "", r.issuedAt.toISOString(), r.paidAt ? r.paidAt.toISOString() : "", summaryShape(r.summary)]);
}
function summaryShape(s: unknown) {
  if (!s || typeof s !== "object") return null;
  const x = s as ReceiptSummary;
  return [Number(x.tripTotal), Number(x.paidBefore), Number(x.thisPayment), Number(x.balance), Number(x.tripPrice ?? 0), Number(x.discount ?? 0), String(x.discountCode ?? "")];
}
const sign = (data: Parameters<typeof canonical>[0]) => createHmac("sha256", hmacKey()).update(canonical(data)).digest("hex");

/**
 * The secret part of the QR link: 43 characters derived from the receipt's
 * number and code with the server's key. Nobody can guess or list it; the
 * database keeps only its SHA-256, and the PDF can be re-made at any time.
 */
export function verifyToken(r: Pick<Receipt, "number" | "code">) {
  return createHmac("sha256", hmacKey()).update(`verify-link-v1|${r.number}|${r.code}`).digest("base64url");
}
export const verifyHashOf = (token: string) => createHash("sha256").update(token).digest("hex");
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, "");
export const verifyUrl = (r: Pick<Receipt, "number" | "code">) => `${siteUrl()}/verify/${verifyToken(r)}/`;

/** Finds a receipt from the token in its QR link. */
export async function receiptByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const r = await db.receipt.findUnique({ where: { verifyHash: verifyHashOf(token) } });
  // Belt and braces: the token must also re-derive from the receipt itself.
  return r && safeEqual(verifyToken(r), token) ? r : null;
}

export function isGenuine(r: Receipt) {
  return safeEqual(sign({ ...r, items: r.items }), r.signature);
}

export function cleanItems(items: ReceiptItem[]): ReceiptItem[] {
  return items
    .map((i) => ({ description: String(i.description ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 200), qty: Math.max(0, Math.min(999, Math.round(Number(i.qty) || 0))), unitPrice: cents(Math.max(-1_000_000, Math.min(1_000_000, Number(i.unitPrice) || 0))) / 100 }))
    .filter((i) => i.description && i.qty > 0)
    .slice(0, 40);
}

export async function createReceipt(input: ReceiptInput, by: { id: string | null; name: string }) {
  const brand = await getBrand();
  const items = cleanItems(input.items);
  if (!items.length) throw new Error("!Add at least one line with a description and amount.");
  const lineCents = items.reduce((s, i) => s + i.qty * cents(i.unitPrice), 0);
  const rate = brand.vatMode === "none" ? 0 : brand.vatRate;
  // VAT included: the VAT part of a gross price is price × rate / (100 + rate).
  const vatCents = brand.vatMode === "added" ? Math.round((lineCents * rate) / 100) : brand.vatMode === "included" ? Math.round((lineCents * rate) / (100 + rate)) : 0;
  const totalCents = brand.vatMode === "added" ? lineCents + vatCents : lineCents;
  const subtotalCents = brand.vatMode === "included" ? lineCents - vatCents : lineCents;
  if (totalCents <= 0) throw new Error("!The total must be more than zero.");
  const subtotal = fromCents(subtotalCents);
  const vat = fromCents(vatCents);
  const total = fromCents(totalCents);
  const summary = input.summary
    ? {
        tripTotal: Math.round(input.summary.tripTotal),
        paidBefore: Math.round(input.summary.paidBefore),
        thisPayment: Math.round(input.summary.thisPayment),
        balance: Math.round(input.summary.balance),
        tripPrice: Math.round(input.summary.tripPrice ?? input.summary.tripTotal),
        discount: Math.round(input.summary.discount ?? 0),
        discountCode: input.summary.discountCode ? String(input.summary.discountCode).slice(0, 40) : null,
      }
    : null;
  const year = new Date().getUTCFullYear();
  const prefix = `${input.kind === "bill" ? brand.billPrefix : brand.receiptPrefix}-${year}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await db.receipt.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
    const n = (last ? Number(last.number.slice(prefix.length)) || 0 : 0) + 1;
    const base = {
      number: `${prefix}${String(n).padStart(4, "0")}`,
      kind: input.kind,
      code: newCode(),
      customerName: input.customerName.trim().slice(0, 120),
      customerEmail: input.customerEmail?.trim().toLowerCase().slice(0, 200) || null,
      currency: (input.currency || "USD").toUpperCase().slice(0, 3),
      paidVia: input.kind === "receipt" ? input.paidVia?.slice(0, 60) || null : null,
      items,
      subtotal,
      vat,
      total,
      issuedAt: new Date(new Date().toISOString().slice(0, 19) + ".000Z"),
      paidAt: input.kind === "receipt" ? input.paidAt ?? new Date() : null,
      summary,
    };
    try {
      return await db.receipt.create({
        data: {
          ...base,
          summary: base.summary ?? undefined,
          bookingId: input.bookingId || null,
          paymentId: input.paymentId || null,
          customerAddress: input.customerAddress?.trim().slice(0, 300) || null,
          vatRate: rate,
          vatMode: brand.vatMode,
          notes: input.notes?.trim().slice(0, 1000) || null,
          issuedById: by.id,
          issuedByName: by.name,
          signature: sign(base),
          verifyHash: verifyHashOf(verifyToken(base)),
        },
      });
    } catch (e) {
      // Two receipts created at the same moment: take the next number.
      if (e instanceof Error && /Unique constraint/i.test(e.message) && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("!Couldn't number the receipt, please try again.");
}

/** A receipt for one payment (WeTravel or recorded by hand). Never twice for the same payment. */
export async function receiptForPayment(paymentId: string, by: { id: string | null; name: string } = { id: null, name: "System" }) {
  const existing = await db.receipt.findUnique({ where: { paymentId } });
  if (existing) return existing;
  const p = await db.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.status !== "succeeded" || !p.bookingId) return null;
  const b = await db.booking.findUnique({ where: { id: p.bookingId } });
  if (!b) return null;
  const date = b.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const raw = p.raw as { note?: string } | null;
  // Advance paid before this payment (successful payments only, earlier ones first).
  const earlier = await db.payment.findMany({ where: { bookingId: b.id, status: "succeeded", id: { not: p.id }, createdAt: { lte: p.createdAt } }, select: { amount: true } });
  const paidBefore = earlier.reduce((s, x) => s + cents(Number(x.amount)), 0);
  const thisPayment = cents(Number(p.amount));
  const tripTotal = cents(Number(b.total));
  return createReceipt(
    {
      kind: "receipt",
      bookingId: b.id,
      paymentId: p.id,
      customerName: b.leadName,
      customerEmail: b.leadEmail,
      items: [{ description: `${b.tripTitle}, starting ${date}, ${b.pax} ${b.pax === 1 ? "traveller" : "travellers"} (booking ${b.reference})`, qty: 1, unitPrice: Number(p.amount) }],
      currency: p.currency,
      paidVia: p.provider === "manual" ? raw?.note?.slice(0, 60) || "Paid at the office" : "Card via WeTravel",
      paidAt: p.createdAt,
      summary: { tripTotal, paidBefore, thisPayment, balance: Math.max(0, tripTotal - paidBefore - thisPayment), tripPrice: cents(Number(b.subtotal)), discount: cents(Number(b.discount)), discountCode: b.discountCode },
    },
    by,
  );
}
