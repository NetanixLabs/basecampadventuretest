import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { readFileData } from "@/lib/server/portal";

export const dynamic = "force-dynamic";

/** The office downloads a traveller's document. Every download is in the Activity log. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await assertUser("sales");
    const f = await db.travellerFile.findUnique({ where: { id: (await params).id } });
    if (!f) return new NextResponse("Not found", { status: 404 });
    const data = await readFileData(f.storageKey);
    await audit(user.id, "booking.file.download", "booking", f.bookingId, f.name);
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": f.mime, "Content-Disposition": `attachment; filename="${f.name.replace(/"/g, "")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" },
    });
  } catch (e) {
    return new NextResponse(e instanceof Denied ? "Forbidden" : "Not found", { status: e instanceof Denied ? 403 : 404 });
  }
}
