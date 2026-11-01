import { clientIpFrom } from "@/lib/ip";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import sharp from "sharp";
import { couponFor } from "@/lib/admin/email/coupon-data";
import { adminConfigured } from "@/lib/admin/env";
import { rateLimited } from "@/lib/server/store";

/**
 * The Base Camp gift voucher as an image (1200×600, JPEG): a Himalayan
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
  // The image shows whether a code exists, so guessing codes through it is throttled.
  const ip = clientIpFrom(req.headers);
  if (rateLimited(`coupon-image:${ip}`, 40)) return new Response("Too many requests", { status: 429 });
  const c = await couponFor(decodeURIComponent((await params).code));
  if (!c) return new Response("Not found", { status: 404 });
  const wanted = new URL(req.url).searchParams.get("photo") ?? "";
  const bgParam = new URL(req.url).searchParams.get("bg") ?? "";
  const BG = /^[0-9a-f]{6}$/i.test(bgParam) ? `#${bgParam}` : "#eef3f4";
  const photoPath = /^\/(photos|media)\/[a-z0-9/_.-]+\.(webp|jpe?g|png)$/i.test(wanted) && !wanted.includes("..") ? wanted : "/photos/hero-ama-dablam.webp";

  const [photo, logoWhite, font] = await Promise.all([
    file(`public${photoPath}`).then((b) => sharp(b).resize(870, 600, { fit: "cover", position: "attention" }).jpeg({ quality: 88 }).toBuffer()).catch(() => file("public/photos/hero-ama-dablam.webp").then((b) => sharp(b).resize(870, 600, { fit: "cover" }).jpeg().toBuffer())),
    file("public/brand/watermark.svg").then((b) => sharp(b, { density: 300 }).resize({ width: 520 }).png().toBuffer()),
    loadFonts(),
  ]);

  const W = 1200;
  const H = 600;
  const STUB = 330;
  const PINE = "#00788a";
  const qr = await QRCode.toDataURL(c.bookUrl, { margin: 1, width: 300, color: { dark: "#1f2527", light: "#ffffff" } });
  const pct = c.amount.match(/^(\d+)%\s*OFF$/i);
  const notch = (top: boolean) => (
    <div style={{ position: "absolute", left: W - STUB - 20, [top ? "top" : "bottom"]: -20, width: 40, height: 40, borderRadius: 20, background: BG, display: "flex" }} />
  );

  const image = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", background: BG, fontFamily: "Manrope" }}>
        <div style={{ position: "relative", width: W, height: H, display: "flex", borderRadius: 30, overflow: "hidden" }}>
          {/* The view */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl(photo, "image/jpeg")} width={W - STUB} height={H} style={{ position: "absolute", top: 0, left: 0, width: W - STUB, height: H, objectFit: "cover" }} alt="" />
          <div style={{ position: "absolute", top: 0, left: 0, width: W - STUB, height: H, display: "flex", backgroundImage: "linear-gradient(90deg, rgba(15,22,24,0.94) 0%, rgba(15,22,24,0.78) 42%, rgba(15,22,24,0.18) 78%, rgba(15,22,24,0.05) 100%)" }} />
          <div style={{ position: "absolute", left: 0, bottom: 0, width: W - STUB, height: 200, display: "flex", backgroundImage: "linear-gradient(0deg, rgba(15,22,24,0.85) 0%, rgba(15,22,24,0) 100%)" }} />
          {/* Thin gold frame */}
          <div style={{ position: "absolute", top: 18, left: 18, width: W - STUB - 36, height: H - 36, display: "flex", border: "1.5px solid rgba(244,182,63,0.55)", borderRadius: 20 }} />

          {/* Offer */}
          <div style={{ position: "absolute", top: 0, left: 0, width: W - STUB, height: H, display: "flex", flexDirection: "column", padding: "46px 58px 44px", color: "#ffffff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: W - STUB - 116 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl(logoWhite, "image/png")} width={175} height={105} style={{ width: 175, height: 105 }} alt="" />
              <div style={{ display: "flex", padding: "9px 20px", border: "1.5px solid #f4b63f", borderRadius: 999, fontSize: 16, letterSpacing: 5, fontWeight: 800, color: "#f4b63f" }}>GIFT VOUCHER</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 36 }}>
              {pct ? (
                <>
                  <div style={{ display: "flex", fontSize: 168, lineHeight: 0.86, fontWeight: 800, letterSpacing: -8 }}>{pct[1]}</div>
                  <div style={{ display: "flex", flexDirection: "column", marginLeft: 14, marginBottom: 6 }}>
                    <div style={{ display: "flex", fontSize: 64, lineHeight: 1, fontWeight: 800, color: "#ffffff" }}>%</div>
                    <div style={{ display: "flex", fontSize: 44, lineHeight: 1, fontWeight: 800, color: "#f4b63f", letterSpacing: 2 }}>OFF</div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", fontSize: 112, lineHeight: 0.9, fontWeight: 800, letterSpacing: -4 }}>{c.amount}</div>
              )}
            </div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 32, fontWeight: 700 }}>{c.label}</div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 20, color: "rgba(255,255,255,0.78)" }}>on your next Himalayan adventure</div>
            <div style={{ display: "flex", marginTop: "auto", gap: 26, fontSize: 17, color: "rgba(255,255,255,0.9)" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 12, letterSpacing: 3, fontWeight: 700, color: "#f4b63f" }}>VALID FOR</div>
                <div style={{ display: "flex", marginTop: 4, fontWeight: 700 }}>{c.validFor}</div>
              </div>
              {c.validUntil ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 12, letterSpacing: 3, fontWeight: 700, color: "#f4b63f" }}>BOOK BY</div>
                  <div style={{ display: "flex", marginTop: 4, fontWeight: 700 }}>{c.validUntil}</div>
                </div>
              ) : null}
              {c.minPax > 1 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 12, letterSpacing: 3, fontWeight: 700, color: "#f4b63f" }}>GROUP</div>
                  <div style={{ display: "flex", marginTop: 4, fontWeight: 700 }}>{`${c.minPax}+ travellers`}</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Stub */}
          <div style={{ position: "absolute", top: 0, right: 0, width: STUB, height: H, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 30px 34px", backgroundImage: `linear-gradient(160deg, ${PINE} 0%, #005f6d 100%)`, color: "#ffffff" }}>
            <div style={{ display: "flex", fontSize: 13, letterSpacing: 5, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>YOUR CODE</div>
            <div style={{ display: "flex", marginTop: 12, padding: "12px 20px", border: "2.5px dashed rgba(255,255,255,0.85)", borderRadius: 14, background: "rgba(0,0,0,0.14)", fontSize: c.code.length > 10 ? 26 : 34, fontWeight: 800, letterSpacing: 3 }}>{c.code}</div>
            <div style={{ display: "flex", marginTop: 26, padding: 10, background: "#ffffff", borderRadius: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={150} height={150} style={{ width: 150, height: 150 }} alt="" />
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 15, fontWeight: 700 }}>Scan to book</div>
            <div style={{ display: "flex", marginTop: "auto", fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}>basecampadventure.com</div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Licensed by Nepal Tourism Board</div>
          </div>
          {/* Perforation */}
          <div style={{ position: "absolute", top: 26, bottom: 26, left: W - STUB - 2, width: 4, display: "flex", borderLeft: "4px dashed rgba(255,255,255,0.55)" }} />
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
