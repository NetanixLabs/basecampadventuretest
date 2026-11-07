import { NextResponse } from "next/server";
import { features } from "@/lib/admin/features";
import { limit } from "@/lib/admin/rate-limit";
import { getTraveller, MAX_FILE, ownBooking, storeFile, TRAVELLER_KINDS } from "@/lib/server/portal";

export const dynamic = "force-dynamic";

/** A traveller uploads a document to their own booking. */
export async function POST(req: Request) {
  if (!(await features()).portal.enabled) return NextResponse.json({ error: "Not available." }, { status: 404 });
  const t = await getTraveller();
  if (!t) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const r = await limit(`portal:upload:${t.id}`, { limit: 30, windowMs: 3600_000, blockMs: 3600_000 });
  if (!r.ok) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_FILE + 100_000) return NextResponse.json({ error: "Files can be up to 10 MB." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const booking = await ownBooking(t.id, String(form?.get("booking") ?? ""));
  if (!booking || !(file instanceof File)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const count = await import("@/lib/admin/db").then(({ db }) => db.travellerFile.count({ where: { bookingId: booking.id, uploadedBy: "traveller" } }));
  if (count >= 25 + 6 * booking.pax) return NextResponse.json({ error: "That's the most files for one booking. Delete one first." }, { status: 400 });
  const kind = String(form?.get("kind") ?? "other");
  try {
    await storeFile(booking.id, (TRAVELLER_KINDS as readonly string[]).includes(kind) ? kind : "other", file.name, Buffer.from(await file.arrayBuffer()), "traveller");
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
