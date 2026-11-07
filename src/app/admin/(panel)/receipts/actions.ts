"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { Denied, assertUser } from "@/lib/admin/guards";
import { createReceipt, issueCreditNote, pdfFor, receiptForPayment, verifyUrl } from "@/lib/server/receipts";
import { receiptFileName } from "@/lib/server/receipt-pdf";

type R = { ok: boolean; message: string; id?: string };
const fail = (e: unknown): R => ({ ok: false, message: e instanceof Denied ? e.message : e instanceof Error && e.message.startsWith("!") ? e.message.slice(1) : "Something went wrong. Please try again." });

const schema = z.object({
  kind: z.enum(["receipt", "bill"]),
  bookingId: z.string().max(40).optional().nullable(),
  customerName: z.string().trim().min(2, "Enter the customer's name").max(120),
  customerEmail: z.union([z.email("Check the email address"), z.literal("")]).optional(),
  customerAddress: z.string().trim().max(300).optional(),
  currency: z.enum(["USD", "EUR", "GBP", "AUD", "NPR", "INR", "CNY"]),
  paidVia: z.string().trim().max(60).optional(),
  paidAt: z.string().max(20).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({ description: z.string().max(200), qty: z.coerce.number(), unitPrice: z.coerce.number() })).min(1).max(40),
});

export async function createReceiptAction(input: unknown): Promise<R> {
  try {
    const { user } = await assertUser("receipts");
    const p = schema.safeParse(input);
    if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
    const d = p.data;
    const booking = d.bookingId ? await db.booking.findUnique({ where: { id: d.bookingId } }) : null;
    if (d.bookingId && !booking) return { ok: false, message: "That booking doesn't exist." };
    // Balance block from the booking itself (same currency only), in cents.
    let summary = null;
    if (booking && booking.currency === d.currency) {
      const c = (n: number) => Math.round(n * 100);
      const tripTotal = c(Number(booking.total));
      const paidBefore = c(Number(booking.paid));
      const thisPayment = d.kind === "receipt" ? d.items.reduce((s, i) => s + Math.round(Number(i.qty)) * c(Number(i.unitPrice)), 0) : 0;
      summary = { tripTotal, paidBefore, thisPayment, balance: Math.max(0, tripTotal - paidBefore - thisPayment), tripPrice: c(Number(booking.subtotal)), discount: c(Number(booking.discount)), discountCode: booking.discountCode };
    }
    const r = await createReceipt({ ...d, customerEmail: d.customerEmail || null, paidAt: d.paidAt ? new Date(`${d.paidAt}T12:00:00Z`) : null, summary }, { id: user.id, name: user.name });
    await audit(user.id, `${r.kind}.create`, "receipt", r.id, `${r.number} ${r.currency} ${r.total}`);
    revalidatePath("/admin/receipts");
    return { ok: true, message: `${r.kind === "bill" ? "Bill" : "Receipt"} ${r.number} created.`, id: r.id };
  } catch (e) {
    return fail(e);
  }
}

export async function voidReceipt(id: string, reason: string): Promise<R> {
  try {
    const { user } = await assertUser("receipts");
    if (reason.trim().length < 3) return { ok: false, message: "Give a short reason." };
    const r = await db.receipt.update({ where: { id }, data: { voidedAt: new Date(), voidReason: reason.trim().slice(0, 300) } });
    await audit(user.id, "receipt.void", "receipt", id, `${r.number}: ${reason}`);
    revalidatePath(`/admin/receipts/${id}`);
    return { ok: true, message: `${r.number} cancelled. Its QR check now shows "Cancelled".` };
  } catch (e) {
    return fail(e);
  }
}

export async function emailReceipt(id: string): Promise<R> {
  try {
    const { user } = await assertUser("receipts");
    const r = await db.receipt.findUnique({ where: { id } });
    if (!r) return { ok: false, message: "Not found." };
    if (!r.customerEmail) return { ok: false, message: "This receipt has no email address." };
    if (r.voidedAt) return { ok: false, message: "Cancelled receipts can't be sent." };
    const url = verifyUrl(r);
    const pdf = await pdfFor(r);
    const total = `${r.currency} ${Number(r.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    const against = r.creditForId ? (await db.receipt.findUnique({ where: { id: r.creditForId }, select: { number: true } }))?.number ?? "" : "";
    const sent = await sendTemplate(r.kind === "bill" ? "bill-email" : r.kind === "credit" ? "credit-note-email" : "receipt-email", r.customerEmail, { name: r.customerName.split(" ")[0], number: r.number, total, receipt: against }, { buttonHref: url, replyTo: await officeEmail(), attachments: [{ filename: receiptFileName(r), content: pdf, contentType: "application/pdf" }] });
    if (!sent.ok) return { ok: false, message: `The email couldn't be sent: ${sent.error}` };
    await audit(user.id, "receipt.email", "receipt", id, r.customerEmail);
    return { ok: true, message: `Sent to ${r.customerEmail}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function receiptForPaymentAction(paymentId: string): Promise<R> {
  try {
    const { user } = await assertUser("receipts");
    const r = await receiptForPayment(paymentId, { id: user.id, name: user.name });
    if (!r) return { ok: false, message: "Only successful payments get a receipt." };
    revalidatePath("/admin/bookings");
    return { ok: true, message: `Receipt ${r.number} ready.`, id: r.id };
  } catch (e) {
    return fail(e);
  }
}

/** A credit note for a refund (part or all of a receipt). */
export async function creditNote(receiptId: string, input: { amount: number; reason: string; method: string; recordRefund: boolean; email: boolean }): Promise<R> {
  try {
    const { user } = await assertUser("receipts");
    const n = await issueCreditNote(receiptId, { amount: Number(input.amount), reason: String(input.reason ?? ""), method: String(input.method ?? ""), recordRefund: Boolean(input.recordRefund) }, { id: user.id, name: user.name });
    await audit(user.id, "receipt.credit", "receipt", n.id, `${n.number} for ${receiptId}`);
    let note = "";
    if (input.email && n.customerEmail) note = (await emailReceipt(n.id)).ok ? ` Emailed to ${n.customerEmail}.` : " The email couldn't be sent; use Email on the credit note.";
    revalidatePath(`/admin/receipts/${receiptId}`);
    return { ok: true, message: `Credit note ${n.number} created.${note}`, id: n.id };
  } catch (e) {
    return fail(e);
  }
}
