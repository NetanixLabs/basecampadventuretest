import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { ACTIVE, endOf, parseKey } from "@/lib/server/departures";
import { departurePdf } from "@/lib/server/departure-pdf";

export const dynamic = "force-dynamic";

/** The departure list as a PDF (contains personal data: operations permission, logged). */
export async function GET(req: Request) {
  try {
    const { user } = await assertUser("operations");
    const k = parseKey(new URL(req.url).searchParams.get("key") ?? "");
    if (!k) return new NextResponse("Not found", { status: 404 });
    const [bookings, dep] = await Promise.all([
      db.booking.findMany({ where: { tripSlug: k.slug, startDate: k.date, status: { in: [...ACTIVE] } }, orderBy: { createdAt: "asc" } }),
      db.departure.findUnique({ where: { tripSlug_startDate: { tripSlug: k.slug, startDate: k.date } }, include: { staff: { include: { guide: true } } } }),
    ]);
    if (!bookings.length) return new NextResponse("Not found", { status: 404 });
    const pdf = await departurePdf({ title: bookings[0].tripTitle, start: k.date, end: endOf(k.slug, k.date), bookings, staff: dep?.staff ?? [], notes: dep?.notes ?? null });
    await audit(user.id, "departure.pdf", "departure", dep?.id ?? null, `${k.slug} ${k.date.toISOString().slice(0, 10)}`);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Departure-${k.slug}-${k.date.toISOString().slice(0, 10)}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    return new NextResponse(e instanceof Denied ? "Forbidden" : "Not found", { status: e instanceof Denied ? 403 : 404 });
  }
}
