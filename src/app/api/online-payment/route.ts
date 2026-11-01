import { NextResponse } from "next/server";
import { clientIpFrom } from "@/lib/ip";
import { z } from "zod";
import { getTrips } from "@/lib/content";
import { saveBooking } from "@/lib/server/sales";
import { rateLimited, reference } from "@/lib/server/store";
import { createPaymentLink, wetravelEnabled } from "@/lib/server/wetravel";

/** The live site's "Online Payment Form": a client pays an agreed amount. */
const schema = z.object({
  fullname: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.email("That email address doesn't look right").max(200),
  phone: z.string().trim().min(6, "Please enter a phone number").max(40),
  country: z.string().trim().min(2, "Please choose a country").max(80),
  trip: z.string().trim().min(1, "Please choose a trip").max(200),
  travellers: z.coerce.number().int().min(1, "Number of travellers").max(60),
  date: z.iso.date("Please enter the trip date"),
  amount: z.coerce.number().min(1, "Please enter the amount").max(100000),
  message: z.string().trim().max(3000).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const ip = clientIpFrom(req.headers);
  if (rateLimited(`pay:${ip}`, 8)) return NextResponse.json({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" }, { status: 400 });
  const input = parsed.data;
  if (input.website) return NextResponse.json({ ok: true, reference: "BCA-OK", paymentUrl: null });

  const trip = getTrips().find((t) => t.slug === input.trip);
  const ref = reference("PAY");
  let paymentUrl: string | null = null;
  let wetravelId: string | null = null;
  let paymentError: string | null = null;
  if (await wetravelEnabled()) {
    const link = await createPaymentLink({ reference: ref, title: trip?.title ?? "Base Camp Adventure payment", startDate: input.date, days: trip?.days ?? 1, amount: input.amount });
    if ("url" in link) {
      paymentUrl = link.url;
      wetravelId = link.id;
    } else paymentError = link.error;
  }
  // An agreed amount (e.g. a balance or a tailor-made trip) is kept as a booking too.
  await saveBooking({
    reference: ref,
    tripSlug: trip?.slug ?? input.trip,
    tripTitle: trip?.title ?? input.trip,
    startDate: input.date,
    pax: input.travellers,
    each: Math.round((input.amount / input.travellers) * 100) / 100,
    subtotal: input.amount,
    discountCode: null,
    discount: 0,
    total: input.amount,
    plan: "agreed amount",
    due: input.amount,
    lead: { name: input.fullname, email: input.email, phone: input.phone, country: input.country },
    notes: input.message || undefined,
    paymentUrl,
    wetravelId,
    paymentError,
    ip,
  });
  return NextResponse.json({ ok: true, reference: ref, paymentUrl });
}
