import { NextResponse } from "next/server";
import { adminConfigured } from "@/lib/admin/env";
import { handleWetravelEvent } from "@/lib/server/payments";
import { verifySvix } from "@/lib/server/svix";

/**
 * WeTravel webhook: https://basecampadventure.com/api/webhooks/wetravel
 * Set up in WeTravel → Profile → Webhooks (payment.created, payment.updated,
 * transaction.updated). Only signed messages are accepted.
 */
export async function POST(req: Request) {
  const secret = process.env.WETRAVEL_WEBHOOK_SECRET ?? "";
  const body = await req.text();
  if (!secret || !verifySvix(secret, req.headers, body)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (!adminConfigured()) return NextResponse.json({ error: "not ready" }, { status: 503 });
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const eventId = req.headers.get("svix-id") ?? req.headers.get("webhook-id") ?? String(payload.id ?? Date.now());
  try {
    const r = await handleWetravelEvent(eventId, payload);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error("[wetravel] webhook failed", e);
    // A 500 makes WeTravel retry later, which is what we want.
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
