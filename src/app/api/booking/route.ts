import { NextResponse } from "next/server";
import { clientIpFrom } from "@/lib/ip";
import { z } from "zod";
import { getTrip } from "@/lib/content";
import { checkDiscount } from "@/lib/server/discounts";
import { saveBooking } from "@/lib/server/sales";
import { rateLimited, reference } from "@/lib/server/store";
import { createPaymentLink, wetravelEnabled } from "@/lib/server/wetravel";
import { features } from "@/lib/admin/features";
import { db } from "@/lib/admin/db";
import { hblEnabled } from "@/lib/server/hbl";
import { payLink } from "@/lib/server/gateway";

const schema = z.object({
  trip: z.string().trim().min(1).max(200),
  date: z.iso.date("Please choose a start date"),
  pax: z.coerce.number().int().min(1).max(30),
  plan: z.enum(["deposit", "full"]),
  name: z.string().trim().min(2, "Please tell us the lead traveller's name").max(120),
  email: z.email("That email address doesn't look right").max(200),
  phone: z.string().trim().min(6, "A phone or WhatsApp number helps us reach you on the trail").max(40),
  country: z.string().trim().min(2, "Please choose a nationality").max(80),
  notes: z.string().trim().max(3000).optional().or(z.literal("")),
  terms: z.literal(true, "Please accept the booking terms"),
  discountCode: z.string().trim().max(40).optional().or(z.literal("")),
  method: z.enum(["wetravel", "hbl"]).optional(),
  website: z.string().max(0).optional().or(z.literal("")),
});

/** Deposit taken at booking; the balance is due before departure. */
const DEPOSIT_RATE = 0.2;

export async function POST(req: Request) {
  const ip = clientIpFrom(req.headers);
  if (rateLimited(`booking:${ip}`, 8)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" }, { status: 400 });
  }
  const input = parsed.data;
  if (input.website) return NextResponse.json({ ok: true, reference: "BCA-OK", paymentUrl: null, total: 0, discount: 0, due: 0 });

  const trip = getTrip(input.trip);
  if (!trip || !trip.price) {
    return NextResponse.json({ ok: false, error: "This trip is booked on request. Please send an enquiry." }, { status: 400 });
  }
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + 13);
  if (new Date(input.date) < earliest) {
    return NextResponse.json({ ok: false, error: "Please choose a start date at least two weeks away, or call us for a short-notice trip." }, { status: 400 });
  }

  // The price is always worked out here, never taken from the browser.
  const tier = trip.price.groupTiers.find((t) => input.pax >= t.from && (!t.to || input.pax <= t.to));
  const each = tier?.price ?? trip.price.amount;
  // In whole cents, so totals, discounts and deposits never drift.
  const c = (n: number) => Math.round(n * 100);
  const subtotal = (c(each) * input.pax) / 100;
  let discountCode: string | null = null;
  let discount = 0;
  if (input.discountCode) {
    const d = await checkDiscount(input.discountCode, trip, input.pax, subtotal);
    if (!d.ok) return NextResponse.json({ ok: false, error: d.error }, { status: 400 });
    discountCode = d.discount.code;
    discount = d.discount.amount;
  }
  const totalC = c(subtotal) - c(discount);
  const total = totalC / 100;
  const deposit = Math.round(totalC * DEPOSIT_RATE) / 100;
  const due = input.plan === "deposit" ? deposit : total;
  const ref = reference("BCA");

  let paymentUrl: string | null = null;
  let wetravelId: string | null = null;
  let paymentError: string | null = null;
  // Which checkout: the traveller's choice if offered, else the office's preferred one.
  const pay = (await features()).payments;
  const wantHbl = input.method ? input.method === "hbl" : pay.preferred === "hbl";
  const gateway = wantHbl && (await hblEnabled()) ? "hbl" : pay.wetravel ? "wetravel" : null;
  if (gateway === "hbl") paymentUrl = payLink(ref);
  if (gateway === "wetravel" && (await wetravelEnabled())) {
    const link = await createPaymentLink({
      reference: ref,
      title: trip.title,
      startDate: input.date,
      days: trip.days,
      amount: total,
      deposit: input.plan === "deposit" ? deposit : undefined,
    });
    if ("url" in link) {
      paymentUrl = link.url;
      wetravelId = link.id;
    } else paymentError = link.error;
  }
  // No API key (or WeTravel unreachable): use the trip's own WeTravel checkout, if the office added one.
  if (gateway === "wetravel" && !paymentUrl && trip.wetravelUrl && /^https:\/\/([a-z0-9-]+\.)*wetravel\.com\//.test(trip.wetravelUrl)) paymentUrl = trip.wetravelUrl;

  // Credited to a partner agent if the traveller came through their link.
  const refCode = /(?:^|;\s*)bca_ref=([A-Z0-9-]{3,20})/.exec(req.headers.get("cookie") ?? "")?.[1];
  const agent = refCode ? await db.agent.findFirst({ where: { code: refCode, active: true }, select: { id: true } }).catch(() => null) : null;

  await saveBooking({
    reference: ref,
    tripSlug: trip.slug,
    tripTitle: trip.title,
    startDate: input.date,
    pax: input.pax,
    each,
    subtotal,
    discountCode,
    discount,
    total,
    plan: input.plan,
    due,
    lead: { name: input.name, email: input.email, phone: input.phone, country: input.country },
    notes: input.notes || undefined,
    paymentUrl,
    wetravelId,
    paymentError,
    ip,
    gateway,
    agentId: agent?.id ?? null,
  });

  return NextResponse.json({ ok: true, reference: ref, paymentUrl, total, discount, due });
}
