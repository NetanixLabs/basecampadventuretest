import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { hblNotificationOrder } from "@/lib/server/hbl";
import { settleHblOrder } from "@/lib/server/gateway";

export const dynamic = "force-dynamic";

/**
 * Himalayan Bank / PACO server-to-server notification. The message must
 * decrypt with our key and carry PACO's signature; even then, the payment is
 * only recorded after asking PACO for the order's real status.
 */
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 100_000) return new NextResponse("Too large", { status: 413 });
  let orderNo: string | null = null;
  try {
    orderNo = await hblNotificationOrder(body);
  } catch {
    return new NextResponse("Invalid", { status: 400 });
  }
  if (!orderNo) return new NextResponse("No order", { status: 400 });
  await db.webhookEvent.upsert({ where: { provider_eventId: { provider: "hbl", eventId: orderNo } }, create: { provider: "hbl", eventId: orderNo, type: "notification", payload: { orderNo } }, update: {} }).catch(() => undefined);
  const r = await settleHblOrder(orderNo).catch((e) => {
    console.error("[hbl] settle failed", orderNo, e);
    return { state: "pending" as const };
  });
  await db.webhookEvent.update({ where: { provider_eventId: { provider: "hbl", eventId: orderNo } }, data: { processedAt: new Date(), error: r.state === "paid" ? null : r.state } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
