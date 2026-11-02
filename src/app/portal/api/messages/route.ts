import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { env } from "@/lib/admin/env";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { features } from "@/lib/admin/features";
import { limit } from "@/lib/admin/rate-limit";
import { markRead, postMessage, thread, unreadFor } from "@/lib/server/messages";
import { getTraveller, MAX_FILE, ownBooking } from "@/lib/server/portal";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

async function who(bookingId: string) {
  if (!(await features()).portal.enabled) return null;
  const t = await getTraveller();
  if (!t) return null;
  const b = await ownBooking(t.id, bookingId);
  return b ? { t, b } : null;
}

/** The traveller's conversation with the office; opening it marks the office's messages as read. */
export async function GET(req: Request) {
  const x = await who(new URL(req.url).searchParams.get("booking") ?? "");
  if (!x) return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers: noStore });
  await markRead(x.b.id, "traveller");
  return NextResponse.json({ messages: await thread(x.b.id) }, { headers: noStore });
}

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_FILE + 100_000) return NextResponse.json({ error: "Files can be up to 10 MB." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const x = await who(String(form?.get("booking") ?? ""));
  if (!x) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const r = await limit(`portal:msg:${x.t.id}`, { limit: 30, windowMs: 3600_000, blockMs: 3600_000 });
  if (!r.ok) return NextResponse.json({ error: "That's a lot of messages; please wait a little or WhatsApp us." }, { status: 429 });
  const file = form?.get("file");
  // Only the first unread message in a row triggers an email, so the office isn't flooded.
  const waiting = await unreadFor(x.b.id, "office");
  const res = await postMessage({ bookingId: x.b.id, fromOffice: false, authorName: x.t.name, text: String(form?.get("body") ?? ""), file: file instanceof File ? file : null });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  if (!waiting) {
    const admin = `${env().ADMIN_URL.replace(/\/$/, "")}/bookings/${x.b.id}#messages`;
    await sendTemplate("portal-message-office", await officeEmail(), { name: x.t.name, reference: x.b.reference, trip: x.b.tripTitle }, { buttonHref: admin }).catch(() => undefined);
  }
  await markRead(x.b.id, "traveller");
  return NextResponse.json({ ok: true, messages: await thread(x.b.id) }, { headers: noStore });
}
