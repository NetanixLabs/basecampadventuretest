import { NextResponse } from "next/server";
import { Denied, assertUser } from "@/lib/admin/guards";
import { attachment, fileHeaders } from "@/lib/server/messages";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertUser("sales");
  } catch (e) {
    return new NextResponse(e instanceof Denied ? "Forbidden" : "Error", { status: e instanceof Denied ? 403 : 500 });
  }
  const a = await attachment((await params).id);
  if (!a) return new NextResponse("Not found", { status: 404 });
  const inline = new URL(req.url).searchParams.has("view") && a.mime.startsWith("image/") && a.mime !== "image/heic";
  return new NextResponse(new Uint8Array(a.data), { headers: fileHeaders(a.name, a.mime, inline) });
}
