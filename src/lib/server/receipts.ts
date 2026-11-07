import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import type { Receipt } from "@/generated/prisma/client";
import { db } from "@/lib/admin/db";
import { env } from "@/lib/admin/env";
import { safeEqual } from "@/lib/admin/crypto";
import { getBrand } from "@/lib/server/receipt-brand";
import { LOCALE, asDocLang, t } from "@/lib/receipt-i18n";
import { getTrip } from "@/lib/content";
import { translation } from "@/lib/i18n";

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
  kind: "receipt" | "bill" | "credit";
  /** Language the PDF is printed in. */
  lang?: string;
  /** Credit notes: the receipt refunded; its VAT treatment is used. */
  creditFor?: { id: string; vatMode: string; vatRate: unknown } | null;
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
  const vatMode = (input.creditFor?.vatMode ?? brand.vatMode) as "none" | "included" | "added";
  const rate = vatMode === "none" ? 0 : input.creditFor ? Number(input.creditFor.vatRate) : brand.vatRate;
  // VAT included: the VAT part of a gross price is price × rate / (100 + rate).
  const vatCents = vatMode === "added" ? Math.round((lineCents * rate) / 100) : vatMode === "included" ? Math.round((lineCents * rate) / (100 + rate)) : 0;
  const totalCents = vatMode === "added" ? lineCents + vatCents : lineCents;
  const subtotalCents = vatMode === "included" ? lineCents - vatCents : lineCents;
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
  const prefix = `${input.kind === "bill" ? brand.billPrefix : input.kind === "credit" ? brand.creditPrefix : brand.receiptPrefix}-${year}-`;

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
      paidVia: input.kind !== "bill" ? input.paidVia?.slice(0, 60) || null : null,
      items,
      subtotal,
      vat,
      total,
      issuedAt: new Date(new Date().toISOString().slice(0, 19) + ".000Z"),
      paidAt: input.kind !== "bill" ? input.paidAt ?? new Date() : null,
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
          vatMode,
          lang: ["de", "fr", "es"].includes(input.lang ?? "") ? input.lang! : "en",
          creditForId: input.creditFor?.id ?? null,
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
  const L = asDocLang(b.lang);
  const date = b.startDate.toLocaleDateString(LOCALE[L], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const trip = getTrip(b.tripSlug);
  const title = (L !== "en" && trip ? translation(trip, L)?.title : null) || b.tripTitle;
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
      lang: L,
      items: [{ description: t(L, "tripLine", { trip: title, date, pax: `${b.pax} ${t(L, b.pax === 1 ? "traveller" : "travellers")}`, ref: b.reference }), qty: 1, unitPrice: Number(p.amount) }],
      currency: p.currency,
      paidVia: p.provider === "manual" ? raw?.note?.slice(0, 60) || t(L, "atOffice") : p.provider === "hbl" ? t(L, "viaHbl") : t(L, "viaWetravel"),
      paidAt: p.createdAt,
      summary: { tripTotal, paidBefore, thisPayment, balance: Math.max(0, tripTotal - paidBefore - thisPayment), tripPrice: cents(Number(b.subtotal)), discount: cents(Number(b.discount)), discountCode: b.discountCode },
    },
    by,
  );
}

/** The PDF of any receipt, bill or credit note (a credit note names the receipt it refunds). */
export async function pdfFor(r: Receipt) {
  const { receiptPdf } = await import("@/lib/server/receipt-pdf");
  const against = r.creditForId ? (await db.receipt.findUnique({ where: { id: r.creditForId }, select: { number: true } }))?.number ?? null : null;
  return receiptPdf(r, verifyUrl(r), isGenuine(r), against);
}

/** Money already refunded against a receipt (credit notes that aren't cancelled), in cents. */
export async function creditedCents(receiptId: string) {
  const rows = await db.receipt.findMany({ where: { creditForId: receiptId, kind: "credit", voidedAt: null }, select: { total: true } });
  return rows.reduce((s, x) => s + cents(Number(x.total)), 0);
}

/**
 * A credit note: part or all of a receipt refunded. Optionally records the
 * refund against the booking (so "paid" goes down) and emails the PDF.
 */
export async function issueCreditNote(receiptId: string, input: { amount: number; reason: string; method: string; recordRefund: boolean }, by: { id: string | null; name: string }) {
  const r = await db.receipt.findUnique({ where: { id: receiptId } });
  if (!r || r.kind !== "receipt") throw new Error("!Credit notes can only be made for receipts (money received).");
  if (r.voidedAt) throw new Error("!This receipt is cancelled.");
  const amountC = cents(input.amount);
  const left = cents(Number(r.total)) - (await creditedCents(r.id));
  if (amountC <= 0) throw new Error("!Enter the amount refunded.");
  if (amountC > left) throw new Error(`!At most ${fromCents(left)} ${r.currency} can still be refunded on this receipt.`);
  const reason = input.reason.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 200);
  if (reason.length < 3) throw new Error("!Write the reason for the refund (printed on the credit note).");
  const L = asDocLang(r.lang);
  const desc = { en: `Refund for receipt ${r.number}: ${reason}`, de: `Erstattung zu Beleg ${r.number}: ${reason}`, fr: `Remboursement du reçu ${r.number} : ${reason}`, es: `Reembolso del recibo ${r.number}: ${reason}` }[L];
  // With VAT added on top, the line is the net part, so the credit total equals the money returned.
  const rate = Number(r.vatRate);
  const line = r.vatMode === "added" ? Math.round((amountC * 100) / (100 + rate)) / 100 : amountC / 100;
  const note = await createReceipt(
    { kind: "credit", lang: L, creditFor: { id: r.id, vatMode: r.vatMode, vatRate: r.vatRate }, bookingId: r.bookingId, customerName: r.customerName, customerEmail: r.customerEmail, customerAddress: r.customerAddress, items: [{ description: desc, qty: 1, unitPrice: line }], currency: r.currency, paidVia: input.method.trim().slice(0, 60) || r.paidVia, paidAt: new Date(), notes: null },
    by,
  );
  if (input.recordRefund && r.bookingId) {
    const b = await db.booking.findUnique({ where: { id: r.bookingId } });
    if (b) {
      await db.payment.create({ data: { bookingId: b.id, provider: "refund", providerId: `refund:${note.id}`, amount: -Number(note.total), currency: note.currency, status: "succeeded", raw: { note: `Refund, credit note ${note.number}`, creditNote: note.id } } });
      const rows = await db.payment.findMany({ where: { bookingId: b.id, status: "succeeded" }, select: { amount: true } });
      const paid = Math.max(0, rows.reduce((s, x) => s + cents(Number(x.amount)), 0)) / 100;
      await db.booking.update({ where: { id: b.id }, data: { paid, ...(paid <= 0 ? { status: "refunded" } : {}) } });
    }
  }
  return note;
}
