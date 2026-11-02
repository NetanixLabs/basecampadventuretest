import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { clientIpFrom } from "@/lib/ip";
import { rateLimited } from "@/lib/server/store";
import { startHblPayment } from "@/lib/server/gateway";

export const dynamic = "force-dynamic";

/**
 * /pay/<booking reference>/ — the link in every booking and reminder email.
 * Opens a fresh checkout each time (bank pages expire), with the amount
 * worked out on the server: the deposit first, then the balance.
 */
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const home = new URL("/contact-us/", req.url);
  if (!/^(BCA|PAY)-[A-Z0-9]{6}$/.test(ref) || rateLimited(`pay:${clientIpFrom(req.headers)}`, 20)) return NextResponse.redirect(home, 303);
  const b = await db.booking.findUnique({ where: { reference: ref } });
  if (!b || ["cancelled", "refunded"].includes(b.status)) return NextResponse.redirect(home, 303);
  if (Number(b.paid) >= Number(b.total) - 0.005) return NextResponse.redirect(new URL(`/pay/return/?done=${ref}`, req.url), 303);
  if (b.gateway === "hbl") {
    try {
      return NextResponse.redirect(await startHblPayment(b), 303);
    } catch (e) {
      console.error("[hbl] could not start payment", ref, e);
      return NextResponse.redirect(new URL(`/pay/return/?error=${ref}`, req.url), 303);
    }
  }
  if (b.paymentUrl && /^https:\/\/([a-z0-9-]+\.)*wetravel\.com\//.test(b.paymentUrl)) return NextResponse.redirect(b.paymentUrl, 303);
  return NextResponse.redirect(home, 303);
}
