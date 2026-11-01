import { NextResponse } from "next/server";
import { db } from "@/lib/admin/db";
import { deleteFile, getTraveller, ownBooking, readFileData } from "@/lib/server/portal";

export const dynamic = "force-dynamic";

async function own(id: string) {
  const t = await getTraveller();
  if (!t) return null;
  const f = await db.travellerFile.findUnique({ where: { id } });
  if (!f || !(await ownBooking(t.id, f.bookingId))) return null;
  return f;
}

/** Download one of the traveller's own documents (decrypted on the fly). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const f = await own((await params).id);
  if (!f) return new NextResponse("Not found", { status: 404 });
  const data = await readFileData(f.storageKey);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `attachment; filename="${f.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

/** Travellers can delete what they uploaded, not the office's documents. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const f = await own((await params).id);
  if (!f || f.uploadedBy !== "traveller") return new NextResponse("Not found", { status: 404 });
  await deleteFile(f.id);
  return NextResponse.json({ ok: true });
}
