import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { env } from "@/lib/admin/env";
import { officeEmail, sendTemplate } from "@/lib/admin/email/send";
import { Denied, assertUser } from "@/lib/admin/guards";
import { markRead, postMessage, thread, unreadFor } from "@/lib/server/messages";
import { MAX_FILE } from "@/lib/server/portal";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
const deny = (e: unknown) => NextResponse.json({ error: e instanceof Denied ? e.message : "Something went wrong." }, { status: e instanceof Denied ? 403 : 500 });

/** The office's view of a booking's conversation; opening it marks the traveller's messages as read. */
export async function GET(req: Request) {
  try {
    await assertUser("sales");
    const b = await db.booking.findUnique({ where: { id: new URL(req.url).searchParams.get("booking") ?? "" }, select: { id: true } });
    if (!b) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    await markRead(b.id, "office");
    return NextResponse.json({ messages: await thread(b.id) }, { headers: noStore });
  } catch (e) {
    return deny(e);
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await assertUser("sales");
    if (Number(req.headers.get("content-length") ?? 0) > MAX_FILE + 100_000) return NextResponse.json({ error: "Files can be up to 10 MB." }, { status: 413 });
    const form = await req.formData();
    const b = await db.booking.findUnique({ where: { id: String(form.get("booking") ?? "") } });
    if (!b) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    const file = form.get("file");
    const waiting = await unreadFor(b.id, "traveller");
    const res = await postMessage({ bookingId: b.id, fromOffice: true, authorName: user.name.split(" ")[0], text: String(form.get("body") ?? ""), file: file instanceof File ? file : null });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    await markRead(b.id, "office");
    if (b.travellerId && !waiting) await sendTemplate("portal-message-traveller", b.leadEmail, { name: b.leadName.split(" ")[0], trip: b.tripTitle }, { buttonHref: `${env().PORTAL_URL.replace(/\/$/, "")}/trip/${b.id}/#messages`, replyTo: await officeEmail() }).catch(() => undefined);
    // The text stays private: the notification only says who replied.
    const { notifyBooking } = await import("@/lib/server/push");
    await notifyBooking(b.id, { kind: "message", title: `${user.name.split(" ")[0]} from our office replied`, body: `New message about your ${b.tripTitle}. Tap to read it.`, href: `/trip/${b.id}/#messages` });
    await audit(user.id, "booking.message", "booking", b.id);
    return NextResponse.json({ ok: true, messages: await thread(b.id), note: b.travellerId ? "" : "Saved. The traveller will see it once their account is created." }, { headers: noStore });
  } catch (e) {
    return deny(e);
  }
}
