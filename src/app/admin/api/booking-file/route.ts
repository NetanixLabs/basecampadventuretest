import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { FILE_KINDS, MAX_FILE, storeFile } from "@/lib/server/portal";

export const dynamic = "force-dynamic";

/** The office uploads a document (voucher, permit, itinerary…) to a booking. */
export async function POST(req: Request) {
  try {
    const { user } = await assertUser("sales");
    if (Number(req.headers.get("content-length") ?? 0) > MAX_FILE + 100_000) return NextResponse.json({ error: "Files can be up to 10 MB." }, { status: 413 });
    const form = await req.formData();
    const file = form.get("file");
    const booking = await db.booking.findUnique({ where: { id: String(form.get("booking") ?? "") }, select: { id: true } });
    if (!booking || !(file instanceof File)) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const kind = String(form.get("kind") ?? "other");
    const f = await storeFile(booking.id, kind in FILE_KINDS ? kind : "other", file.name, Buffer.from(await file.arrayBuffer()), user.id);
    await audit(user.id, "booking.file.upload", "booking", booking.id, f.name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Denied) return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
  }
}
