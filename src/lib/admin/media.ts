import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/admin/db";
import { slugify } from "@/lib/admin/html";
import { InputError } from "@/lib/admin/entries";
import { features } from "@/lib/admin/features";

/**
 * Uploads.
 *
 * Photos are checked by their actual contents (not their name), turned the
 * right way up, stripped of camera/GPS data, limited to 2560 px on the long
 * side and saved as high-quality WebP. The file name carries a fingerprint of
 * the picture, so browsers and Cloudflare can cache it forever, and the same
 * photo uploaded twice is stored once. The website then serves each visitor
 * the right size (AVIF/WebP) automatically.
 */
export const uploadsDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".storage", "uploads"));

const MAX_IMAGE = 30 * 1024 * 1024;
const MAX_VIDEO = 300 * 1024 * 1024;
const LONG_EDGE = 2560;
const QUALITY = 86;

const isVideo = (buf: Buffer) => buf.subarray(4, 8).toString("latin1") === "ftyp" || buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

/** Our logo, drawn at the given width and opacity, ready to lay over a photo. */
async function watermarkPng(width: number, opacity: number) {
  const svg = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "brand", "watermark.svg"));
  return sharp(svg, { density: 300 }).resize({ width }).ensureAlpha().linear([1, 1, 1, opacity], [0, 0, 0, 0]).png().toBuffer({ resolveWithObject: true });
}

export async function storeUpload(file: File, folder = "uploads", alt = "", opts: { watermark?: boolean } = {}) {
  const buf = Buffer.from(await file.arrayBuffer());
  if (!buf.length) throw new InputError("That file is empty.");
  const wm = (await features()).watermark;
  const mark = wm.enabled && (opts.watermark ?? wm.scope === "all");
  // A watermarked copy is a different picture from the plain one.
  const hash = createHash("sha256").update(buf).update(mark && !isVideo(buf) ? `:wm:${wm.opacity}:${wm.size}` : "").digest("hex");
  const existing = await db.media.findUnique({ where: { hash } });
  if (existing) return existing;

  const now = new Date();
  const sub = path.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "photo";
  await mkdir(path.join(/*turbopackIgnore: true*/ uploadsDir(), sub), { recursive: true });

  if (isVideo(buf)) {
    if (buf.length > MAX_VIDEO) throw new InputError("Videos can be up to 300 MB. Compress it first (HandBrake, 1080p).");
    const ext = buf.subarray(4, 8).toString("latin1") === "ftyp" ? "mp4" : "webm";
    const name = `${base}-${hash.slice(0, 10)}.${ext}`;
    await writeFile(path.join(/*turbopackIgnore: true*/ uploadsDir(), sub, name), buf);
    return db.media.create({
      data: { src: `/uploads/${sub.split(path.sep).join("/")}/${name}`, hash, originalName: file.name.slice(0, 200), mime: `video/${ext}`, width: 0, height: 0, bytes: buf.length, alt, folder: "videos" },
    });
  }

  if (buf.length > MAX_IMAGE) throw new InputError("Photos can be up to 30 MB.");
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(buf, { failOn: "error" }).metadata();
  } catch {
    throw new InputError("That file isn't a photo we can read. Use JPG, PNG, WebP, AVIF or HEIC.");
  }
  if (!meta.format || !["jpeg", "png", "webp", "avif", "heif", "tiff", "gif"].includes(meta.format)) throw new InputError("Use JPG, PNG, WebP, AVIF or HEIC photos.");

  let pipeline = sharp(buf, { failOn: "none" }).rotate().resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true });
  if (mark && meta.format !== "gif") {
    const sized = await pipeline.toBuffer({ resolveWithObject: true });
    const W = sized.info.width, H = sized.info.height;
    if (W >= 400 && H >= 300) {
      const logo = await watermarkPng(Math.max(110, Math.round((W * wm.size) / 100)), wm.opacity / 100);
      const margin = Math.round(Math.min(W, H) * 0.04);
      pipeline = sharp(sized.data).composite([{ input: logo.data, left: Math.max(0, W - logo.info.width - margin), top: Math.max(0, H - logo.info.height - margin) }]);
    } else pipeline = sharp(sized.data);
  }
  const out = await pipeline.webp({ quality: QUALITY, smartSubsample: true, effort: 5 }).toBuffer({ resolveWithObject: true });
  const name = `${base}-${hash.slice(0, 10)}.webp`;
  await writeFile(path.join(/*turbopackIgnore: true*/ uploadsDir(), sub, name), out.data);
  return db.media.create({
    data: {
      src: `/uploads/${sub.split(path.sep).join("/")}/${name}`,
      hash,
      originalName: file.name.slice(0, 200),
      mime: "image/webp",
      width: out.info.width,
      height: out.info.height,
      bytes: out.data.length,
      alt: alt || base.replace(/-/g, " "),
      folder: folder.slice(0, 40),
    },
  });
}
