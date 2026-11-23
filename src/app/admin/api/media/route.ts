import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { InputError } from "@/lib/admin/entries";
import { Denied, assertUser } from "@/lib/admin/guards";
import { storeUpload } from "@/lib/admin/media";
import { features } from "@/lib/admin/features";
import { forgetUsage, referencedSources } from "@/lib/admin/media-usage";
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
  const show = u.searchParams.get("show") ?? ""; // "" | "unused" | "noalt"
  const sort = u.searchParams.get("sort") ?? "new"; // new | old | big | small | name
  const page = Math.max(1, Number(u.searchParams.get("page")) || 1);
  const per = Math.min(96, Math.max(12, Number(u.searchParams.get("per")) || 48));
  const base: Prisma.MediaWhereInput = kind === "video" ? { mime: { startsWith: "video/" } } : { mime: { startsWith: "image/" } };
  const where: Prisma.MediaWhereInput = {
    ...base,
    ...(folder ? { folder } : {}),
    ...(q ? { OR: [{ alt: { contains: q, mode: "insensitive" } }, { originalName: { contains: q, mode: "insensitive" } }, { src: { contains: q.toLowerCase() } }] } : {}),
  };
  const orderBy: Prisma.MediaOrderByWithRelationInput =
    sort === "old" ? { createdAt: "asc" } : sort === "big" ? { bytes: "desc" } : sort === "small" ? { width: "asc" } : sort === "name" ? { originalName: "asc" } : { createdAt: "desc" };
  const select = { id: true, src: true, width: true, height: true, alt: true, bytes: true, mime: true, folder: true, originalName: true, createdAt: true } as const;
  /** A description made from the file name is not a real description. */
  const weakAlt = (m: { alt: string; originalName: string }) => {
    const a = m.alt.trim().toLowerCase();
    const n = m.originalName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().toLowerCase();
    return !a || a === n || /^(img|dsc|photo|image|screenshot)[ _-]?\d*/.test(a);
  };
  let items: (Prisma.MediaGetPayload<{ select: typeof select }> & { unused?: boolean; weakAlt?: boolean })[];
  let total: number;
  if (show) {
    const all = await db.media.findMany({ where, orderBy, select });
    const refs = show === "unused" ? await referencedSources() : null;
    const hit = all.filter((m) => (refs ? !refs.has(m.src) : weakAlt(m)));
    total = hit.length;
    items = hit.slice((page - 1) * per, page * per);
  } else {
    [items, total] = await Promise.all([db.media.findMany({ where, orderBy, skip: (page - 1) * per, take: per, select }), db.media.count({ where })]);
  }
  const refs = await referencedSources();
  items = items.map((m) => ({ ...m, unused: !refs.has(m.src), weakAlt: weakAlt(m) }));
  const folders = (await db.media.groupBy({ by: ["folder"], where: base, _count: true, orderBy: { folder: "asc" } })).map((f) => ({ name: f.folder, count: f._count }));
  const wm = (await features()).watermark;
  return NextResponse.json({ items, total, pages: Math.max(1, Math.ceil(total / per)), folders, watermark: { enabled: wm.enabled, scope: wm.scope } });
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
    forgetUsage();
    return NextResponse.json({ item: { id: m.id, src: m.src, width: m.width, height: m.height, alt: m.alt, bytes: m.bytes, mime: m.mime, folder: m.folder } });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[media] upload failed", e);
    return NextResponse.json({ error: "The upload failed. Please try again." }, { status: 500 });
  }
}
