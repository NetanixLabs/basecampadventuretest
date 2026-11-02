import { NextResponse } from "next/server";
import { attachment, fileHeaders } from "@/lib/server/messages";
import { getTraveller, ownBooking } from "@/lib/server/portal";

export const dynamic = "force-dynamic";

/** An attachment from the traveller's own conversation, decrypted on the fly. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTraveller();
  const a = t ? await attachment((await params).id) : null;
  if (!t || !a || !(await ownBooking(t.id, a.bookingId))) return new NextResponse("Not found", { status: 404 });
  const inline = new URL(req.url).searchParams.has("view") && a.mime.startsWith("image/") && a.mime !== "image/heic";
  return new NextResponse(new Uint8Array(a.data), { headers: fileHeaders(a.name, a.mime, inline) });
}
