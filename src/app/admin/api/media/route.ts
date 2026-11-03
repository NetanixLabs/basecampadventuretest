import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { InputError } from "@/lib/admin/entries";
import { Denied, assertUser } from "@/lib/admin/guards";
import { storeUpload } from "@/lib/admin/media";
import { features } from "@/lib/admin/features";
import type { Prisma } from "@/generated/prisma/client";

/** Media library: list (GET) and upload (POST). Admin host only. */
export async function GET(req: Request) {
  try {
    await assertUser("media");
  } catch {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const u = new URL(req.url);
  const q = u.searchParams.get("q")?.trim() ?? "";
  const folder = u.searchParams.get("folder") ?? "";
  const kind = u.searchParams.get("kind") ?? "image";
  const page = Math.max(1, Number(u.searchParams.get("page")) || 1);
  const where: Prisma.MediaWhereInput = {
    ...(kind === "video" ? { mime: { startsWith: "video/" } } : { mime: { startsWith: "image/" } }),
    ...(folder ? { folder } : {}),
    ...(q ? { OR: [{ alt: { contains: q, mode: "insensitive" } }, { originalName: { contains: q, mode: "insensitive" } }, { src: { contains: q.toLowerCase() } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 48, take: 48, select: { id: true, src: true, width: true, height: true, alt: true, bytes: true, mime: true, folder: true } }),
    db.media.count({ where }),
  ]);
  const wm = (await features()).watermark;
  return NextResponse.json({ items, total, pages: Math.ceil(total / 48), watermark: { enabled: wm.enabled, scope: wm.scope } });
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = (await assertUser("media")).user.id;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Denied ? e.message : "Please sign in again." }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  try {
    const w = form?.get("watermark");
    const m = await storeUpload(file, String(form?.get("folder") ?? "uploads"), String(form?.get("alt") ?? ""), { watermark: w === "1" ? true : w === "0" ? false : undefined });
    await audit(userId, "media.upload", "media", m.id, m.src);
    return NextResponse.json({ item: { id: m.id, src: m.src, width: m.width, height: m.height, alt: m.alt, bytes: m.bytes, mime: m.mime, folder: m.folder } });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[media] upload failed", e);
    return NextResponse.json({ error: "The upload failed. Please try again." }, { status: 500 });
  }
}
