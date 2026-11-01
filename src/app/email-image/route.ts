import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { uploadsDir } from "@/lib/admin/media";

/**
 * Photos for emails: JPEG (every email app shows it, Outlook included),
 * resized for a 600 px email at 2x. /email-image?src=/media/…&w=1200&h=700
 */
const WIDTHS = [400, 600, 800, 1200];

export async function GET(req: Request) {
  const u = new URL(req.url);
  const src = u.searchParams.get("src") ?? "";
  const w = WIDTHS.find((x) => x >= Number(u.searchParams.get("w") || 1200)) ?? 1200;
  const h = Math.min(1600, Math.max(0, Number(u.searchParams.get("h")) || 0)) || undefined;
  if (!/^\/(media|photos|uploads|brand)\/[a-z0-9/_.-]+\.(webp|jpe?g|png|avif)$/i.test(src) || src.includes("..")) return new Response("Not found", { status: 404 });
  const file = src.startsWith("/uploads/")
    ? path.join(/*turbopackIgnore: true*/ uploadsDir(), src.slice("/uploads/".length))
    : path.join(/*turbopackIgnore: true*/ process.cwd(), "public", src);
  try {
    const out = await sharp(await readFile(file))
      .rotate()
      .resize({ width: w, height: h, fit: "cover", position: "attention", withoutEnlargement: !h })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80, mozjpeg: true, progressive: true })
      .toBuffer();
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
