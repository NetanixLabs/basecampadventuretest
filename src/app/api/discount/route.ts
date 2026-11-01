import { NextResponse } from "next/server";
import { clientIpFrom } from "@/lib/ip";
import { getTrip } from "@/lib/content";
import { checkDiscount } from "@/lib/server/discounts";
import { rateLimited } from "@/lib/server/store";

/** Checks a discount code while the traveller fills in the booking form. */
export async function GET(req: Request) {
  const ip = clientIpFrom(req.headers);
  if (rateLimited(`discount:${ip}`, 20)) return NextResponse.json({ ok: false, error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  const u = new URL(req.url);
  const trip = getTrip(u.searchParams.get("trip") ?? "");
  const pax = Math.min(30, Math.max(1, Number(u.searchParams.get("pax")) || 1));
  if (!trip?.price) return NextResponse.json({ ok: false, error: "This trip is booked on request." }, { status: 400 });
  const tier = trip.price.groupTiers.find((t) => pax >= t.from && (!t.to || pax <= t.to));
  const subtotal = (tier?.price ?? trip.price.amount) * pax;
  const r = await checkDiscount(u.searchParams.get("code") ?? "", trip, pax, subtotal);
  return NextResponse.json(r, { status: r.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
}
