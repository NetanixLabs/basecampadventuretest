import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { couponFor } from "@/lib/admin/email/coupon-data";
import { adminConfigured } from "@/lib/admin/env";

/**
 * The Base Camp gift voucher as an image (1200×630, JPEG): a Himalayan
 * photograph, the logo, the amount and a tear-off stub with the code. Being
 * an image, it looks exactly the same in every email app and can be printed
 * or shared on WhatsApp. /coupon/DASHAIN10/?photo=/photos/hero-gokyo.webp
 */
const root = () => path.join(/*turbopackIgnore: true*/ process.cwd());
const file = (p: string) => readFile(path.join(/*turbopackIgnore: true*/ root(), p));

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 700 | 800; style: "normal" }[]> | null = null;
const loadFonts = () =>
  (fonts ??= Promise.all(
    ([400, 700, 800] as const).map(async (weight) => ({ name: "Manrope", data: await file(`node_modules/@fontsource/manrope/files/manrope-latin-${weight}-normal.woff`), weight, style: "normal" as const })),
  ));

const dataUrl = (buf: Buffer, type: string) => `data:${type};base64,${buf.toString("base64")}`;

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!adminConfigured()) return new Response("Not found", { status: 404 });
  const c = await couponFor(decodeURIComponent((await params).code));
  if (!c) return new Response("Not found", { status: 404 });
  const wanted = new URL(req.url).searchParams.get("photo") ?? "";
  const bgParam = new URL(req.url).searchParams.get("bg") ?? "";
  const BG = /^[0-9a-f]{6}$/i.test(bgParam) ? `#${bgParam}` : "#eef3f4";
  const photoPath = /^\/(photos|media)\/[a-z0-9/_.-]+\.(webp|jpe?g|png)$/i.test(wanted) && !wanted.includes("..") ? wanted : "/photos/hero-ama-dablam.webp";

  const [photo, logoWhite, logo, font] = await Promise.all([
    file(`public${photoPath}`).then((b) => sharp(b).resize(1200, 630, { fit: "cover", position: "attention" }).jpeg({ quality: 88 }).toBuffer()).catch(() => file("public/photos/hero-ama-dablam.webp").then((b) => sharp(b).resize(1200, 630, { fit: "cover" }).jpeg().toBuffer())),
    file("public/brand/watermark.svg").then((b) => sharp(b, { density: 300 }).resize({ width: 520 }).png().toBuffer()),
    file("public/brand/logo.svg").then((b) => sharp(b, { density: 300 }).resize({ width: 300 }).png().toBuffer()),
    loadFonts(),
  ]);

  const W = 1200;
  const H = 630;
  const STUB = 360;
  const notch = (top: boolean) => (
    <div style={{ position: "absolute", left: W - STUB - 22, [top ? "top" : "bottom"]: -22, width: 44, height: 44, borderRadius: 22, background: BG, display: "flex" }} />
  );

  const image = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", background: BG, fontFamily: "Manrope" }}>
        <div style={{ position: "relative", width: W, height: H, display: "flex", borderRadius: 34, overflow: "hidden" }}>
          {/* The view */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl(photo, "image/jpeg")} width={W} height={H} style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }} alt="" />
          <div style={{ position: "absolute", top: 0, left: 0, width: W - STUB, height: H, display: "flex", backgroundImage: "linear-gradient(100deg, rgba(20,26,28,0.92) 0%, rgba(20,26,28,0.72) 45%, rgba(20,26,28,0.15) 100%)" }} />

          {/* Left: the offer */}
          <div style={{ position: "absolute", top: 0, left: 0, width: W - STUB, height: H, display: "flex", flexDirection: "column", padding: "52px 60px", color: "#ffffff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl(logoWhite, "image/png")} width={210} height={126} style={{ width: 210, height: 126 }} alt="" />
            <div style={{ display: "flex", marginTop: 34, fontSize: 20, letterSpacing: 6, fontWeight: 800, color: "#f4b63f", textTransform: "uppercase" }}>Gift voucher</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 104, lineHeight: 1, fontWeight: 800, letterSpacing: -3 }}>{c.amount}</div>
            <div style={{ display: "flex", marginTop: 14, fontSize: 30, fontWeight: 700, color: "#ffffff" }}>{c.label}</div>
            <div style={{ display: "flex", marginTop: "auto", fontSize: 20, color: "rgba(255,255,255,0.82)", fontWeight: 400 }}>
              {`Valid for ${c.validFor.toLowerCase() === "every trip" ? "every trip" : c.validFor}${c.validUntil ? ` · Book by ${c.validUntil}` : ""}`}
            </div>
          </div>

          {/* Right: the tear-off stub */}
          <div style={{ position: "absolute", top: 0, right: 0, width: STUB, height: H, background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 36px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl(logo, "image/png")} width={150} height={86} style={{ width: 150, height: 86 }} alt="" />
            <div style={{ display: "flex", marginTop: 34, fontSize: 16, letterSpacing: 4, fontWeight: 700, color: "#626b70", textTransform: "uppercase" }}>Your code</div>
            <div style={{ display: "flex", marginTop: 12, padding: "16px 22px", border: "3px dashed #00788a", borderRadius: 18, background: "#f0f8f9", fontSize: c.code.length > 10 ? 30 : 38, fontWeight: 800, letterSpacing: 3, color: "#242a2c" }}>{c.code}</div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 17, fontWeight: 700, color: "#00788a" }}>basecampadventure.com</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 14, color: "#626b70", textAlign: "center" }}>Licensed by Nepal Tourism Board</div>
          </div>
          {/* Perforation */}
          <div style={{ position: "absolute", top: 30, bottom: 30, left: W - STUB - 2, width: 4, display: "flex", borderLeft: "4px dashed rgba(36,42,44,0.18)" }} />
          {notch(true)}
          {notch(false)}
        </div>
      </div>
    ),
    { width: W, height: H, fonts: font },
  );
  const jpg = await sharp(Buffer.from(await image.arrayBuffer())).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600", "Content-Disposition": `inline; filename="base-camp-voucher-${c.code}.jpg"` } });
}
