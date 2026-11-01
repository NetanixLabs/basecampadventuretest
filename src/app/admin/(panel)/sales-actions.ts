"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { Denied, assertUser } from "@/lib/admin/guards";
import type { BookingStatus, EnquiryStatus } from "@/generated/prisma/client";

type R = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof Denied ? e.message : e instanceof Error && e.message.startsWith("!") ? e.message.slice(1) : "Something went wrong. Please try again." });
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export async function updateEnquiry(id: string, status: EnquiryStatus, notes: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    await db.enquiry.update({ where: { id }, data: { status, notes: notes.slice(0, 5000) } });
    await audit(user.id, "enquiry.update", "enquiry", id, status);
    revalidatePath("/admin/enquiries");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateBooking(id: string, status: BookingStatus, internalNotes: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    await db.booking.update({ where: { id }, data: { status, internalNotes: internalNotes.slice(0, 5000) } });
    await audit(user.id, "booking.update", "booking", id, status);
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

/** Records a payment received outside WeTravel (bank transfer, cash in Kathmandu). */
export async function recordPayment(id: string, amount: number, note: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    if (!(amount > 0)) throw new Error("!Enter the amount received.");
    const b = await db.booking.findUnique({ where: { id } });
    if (!b) throw new Error("!Booking not found.");
    await db.payment.create({ data: { bookingId: id, provider: "manual", providerId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, amount, status: "succeeded", raw: { note, by: user.email } } });
    const paid = Number((await db.payment.aggregate({ where: { bookingId: id, status: "succeeded" }, _sum: { amount: true } }))._sum.amount ?? 0);
    const status = paid >= Number(b.total) - 0.5 ? "paid" : "deposit_paid";
    await db.booking.update({ where: { id }, data: { paid, status: b.status === "confirmed" ? "confirmed" : status } });
    await audit(user.id, "booking.payment", "booking", id, `${usd(amount)} ${note}`);
    return { ok: true, message: `Recorded ${usd(amount)}.` };
  } catch (e) {
    return fail(e);
  }
}

const EMAILS = ["booking-confirmed", "payment-reminder", "review-request", "booking-received"] as const;

/** Sends one of the booking emails to the lead traveller, now. */
export async function emailTraveller(id: string, template: (typeof EMAILS)[number]): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    if (!EMAILS.includes(template)) throw new Error("!Unknown email.");
    const b = await db.booking.findUnique({ where: { id } });
    if (!b) throw new Error("!Booking not found.");
    const due = Math.max(0, Number(b.total) - Number(b.paid));
    const vars = { name: b.leadName.split(" ")[0], reference: b.reference, trip: b.tripTitle, date: b.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), pax: `${b.pax}`, total: usd(Number(b.total)), due: usd(Number(b.paid) > 0 ? due : Number(b.due)) };
    if ((template === "payment-reminder" || template === "booking-received") && !b.paymentUrl) throw new Error("!This booking has no WeTravel payment link yet. Add one first.");
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, "");
    const r = await sendTemplate(template, b.leadEmail, vars, {
      buttonHref: template === "review-request" ? "https://www.tripadvisor.com/UserReviewEdit-g293890-d2437309" : template === "booking-confirmed" ? `${site}/trip/${b.tripSlug}/` : b.paymentUrl ?? undefined,
      replyTo: officeEmail(),
    });
    if (!r.ok) throw new Error(`!The email couldn't be sent: ${r.error}`);
    if (template === "booking-confirmed") await db.booking.update({ where: { id }, data: { status: "confirmed" } });
    await audit(user.id, "booking.email", "booking", id, template);
    return { ok: true, message: `Email sent to ${b.leadEmail}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function setPaymentLink(id: string, url: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    if (url && !z.url().safeParse(url).success) throw new Error("!That doesn't look like a link.");
    await db.booking.update({ where: { id }, data: { paymentUrl: url || null, status: url ? "awaiting_payment" : undefined } });
    await audit(user.id, "booking.link", "booking", id);
    return { ok: true, message: "Payment link saved." };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------- discounts */

const discountSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/, "Codes use 3–30 letters, numbers or hyphens."),
  label: z.string().trim().min(2, "Give it a name").max(80),
  kind: z.enum(["percent", "fixed"]),
  value: z.coerce.number().positive("Enter the discount"),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  maxUses: z.string().optional(),
  minPax: z.coerce.number().int().min(1).default(1),
  trips: z.array(z.string()).default([]),
  destinations: z.array(z.string()).default([]),
  activities: z.array(z.string()).default([]),
  active: z.boolean(),
});

export async function saveDiscount(id: string | null, input: unknown): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const p = discountSchema.safeParse(input);
    if (!p.success) throw new Error(`!${p.error.issues[0]?.message}`);
    const d = p.data;
    if (d.kind === "percent" && d.value > 90) throw new Error("!A percentage discount can be at most 90%.");
    const data = { code: d.code, label: d.label, kind: d.kind, value: d.value, startsAt: d.startsAt ? new Date(d.startsAt) : null, endsAt: d.endsAt ? new Date(`${d.endsAt}T23:59:59`) : null, maxUses: d.maxUses ? Number(d.maxUses) : null, minPax: d.minPax, trips: d.trips, destinations: d.destinations, activities: d.activities, active: d.active };
    const clash = await db.discountCode.findUnique({ where: { code: d.code } });
    if (clash && clash.id !== id) throw new Error("!That code already exists.");
    if (id) await db.discountCode.update({ where: { id }, data });
    else await db.discountCode.create({ data });
    await audit(user.id, id ? "discount.update" : "discount.create", "discount", id, d.code);
    revalidatePath("/admin/discounts");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteDiscount(id: string): Promise<R> {
  try {
    const { user } = await assertUser("sales");
    const d = await db.discountCode.delete({ where: { id } });
    await audit(user.id, "discount.delete", "discount", id, d.code);
    revalidatePath("/admin/discounts");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
