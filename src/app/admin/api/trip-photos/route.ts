import { NextResponse } from "next/server";
import sharp from "sharp";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { parseKey } from "@/lib/server/departures";
import { removePrivate, writePrivate } from "@/lib/server/portal";

export const dynamic = "force-dynamic";

/** The office uploads photos for one departure; everyone on it sees them on their trip page. */
export async function POST(req: Request) {
  try {
    const { user } = await assertUser("operations");
    if (Number(req.headers.get("content-length") ?? 0) > 60_000_000) return NextResponse.json({ error: "Upload up to 50 MB at a time." }, { status: 413 });
    const form = await req.formData();
    const k = parseKey(String(form.get("key") ?? ""));
    if (!k) return NextResponse.json({ error: "Departure not found." }, { status: 404 });
    const dep = await db.departure.upsert({ where: { tripSlug_startDate: { tripSlug: k.slug, startDate: k.date } }, create: { tripSlug: k.slug, startDate: k.date }, update: {} });
    let added = 0;
    for (const f of form.getAll("files").slice(0, 30)) {
      if (!(f instanceof File) || f.size > 25_000_000) continue;
      try {
        // Re-encoded (no hidden data, camera/GPS info removed), sensible size.
        const { data, info } = await sharp(Buffer.from(await f.arrayBuffer()), { failOn: "error" }).rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
        const key = await writePrivate(data);
        await db.tripPhoto.create({ data: { departureId: dep.id, storageKey: key, width: info.width, height: info.height, bytes: data.length } });
        added++;
      } catch {
        /* not an image: skipped */
      }
    }
    if (added) {
      const { notifyBooking } = await import("@/lib/server/push");
      const on = await db.booking.findMany({ where: { tripSlug: k.slug, startDate: k.date, status: { in: ["deposit_paid", "paid", "confirmed"] } }, select: { id: true, tripTitle: true } });
      for (const b of on) await notifyBooking(b.id, { kind: "photos", title: "New trip photos", body: `${added} new ${added === 1 ? "photo" : "photos"} from ${b.tripTitle}. Tap to see and download.`, href: `/trip/${b.id}/#photos` });
    }
    await audit(user.id, "departure.photos", "departure", dep.id, String(added));
    return NextResponse.json({ ok: true, added });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Denied ? e.message : "Upload failed." }, { status: e instanceof Denied ? 403 : 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { user } = await assertUser("operations");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    const p = await db.tripPhoto.delete({ where: { id } });
    await removePrivate(p.storageKey);
    await audit(user.id, "departure.photo.delete", "departure", p.departureId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Denied ? e.message : "Not found." }, { status: e instanceof Denied ? 403 : 404 });
  }
}

/** Thumbnail for the admin. */
export async function GET(req: Request) {
  try {
    await assertUser("operations");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    const p = await db.tripPhoto.findUnique({ where: { id } });
    if (!p) return new NextResponse("Not found", { status: 404 });
    const { readFileData } = await import("@/lib/server/portal");
    const thumb = await sharp(await readFileData(p.storageKey)).resize(480, 480, { fit: "cover" }).jpeg({ quality: 75 }).toBuffer();
    return new NextResponse(new Uint8Array(thumb), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=600" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
