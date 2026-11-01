import "server-only";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/admin/db";
import { slugify } from "@/lib/admin/html";
import { InputError } from "@/lib/admin/entries";

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

export async function storeUpload(file: File, folder = "uploads", alt = "") {
  const buf = Buffer.from(await file.arrayBuffer());
  if (!buf.length) throw new InputError("That file is empty.");
  const hash = createHash("sha256").update(buf).digest("hex");
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

  const out = await sharp(buf, { failOn: "none" })
    .rotate()
    .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY, smartSubsample: true, effort: 5 })
    .toBuffer({ resolveWithObject: true });
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
