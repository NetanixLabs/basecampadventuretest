import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/admin/db";
import { PAID_STATUSES, getTraveller, readFileData } from "@/lib/server/portal";

export const dynamic = "force-dynamic";

/** A trip photo, only for travellers with a paid booking on that same departure. ?w=600 for a thumbnail, ?download=1 to save. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTraveller();
  if (!t) return new NextResponse("Not found", { status: 404 });
  const p = await db.tripPhoto.findUnique({ where: { id: (await params).id }, include: { departure: true } });
  if (!p) return new NextResponse("Not found", { status: 404 });
  const on = await db.booking.count({ where: { travellerId: t.id, tripSlug: p.departure.tripSlug, startDate: p.departure.startDate, status: { in: [...PAID_STATUSES] } } });
  if (!on) return new NextResponse("Not found", { status: 404 });
  const url = new URL(req.url);
  const w = Number(url.searchParams.get("w"));
  let data = await readFileData(p.storageKey);
  if (w === 600) data = await sharp(data).resize(600, 600, { fit: "cover" }).jpeg({ quality: 76 }).toBuffer();
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", ...(url.searchParams.get("download") ? { "Content-Disposition": `attachment; filename="${p.departure.tripSlug}-${p.id.slice(-6)}.jpg"` } : {}) },
  });
}
