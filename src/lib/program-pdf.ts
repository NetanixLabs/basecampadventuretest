import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { site } from "@/lib/site";
import { cropFor } from "@/lib/banner";
import { durationOf } from "@/lib/itinerary";
import type { InfoItem } from "@/lib/trip-info";
import type { Trip } from "@/lib/types";

/**
 * The trip program as a printable A4 PDF: cover, key facts and price,
 * the day-by-day itinerary, what is included, and how to book.
 * Built from the same content as the trip page, so it is never out of date.
 */

const C = { teal: "#00788a", tealSoft: "#e3f2f4", ink: "#242a2c", soft: "#4a5357", muted: "#626b70", line: "#d8e3e6", snow: "#f7fafb", red: "#c2392d" };
const font = (pkg: string, file: string) => path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file);
const M = 48; // side margin
const W = 595.28; // A4 width
const H = 841.89; // A4 height
const CW = W - M * 2; // content width
const BOTTOM = H - 70; // last y content may reach
const COVER = { w: W - M * 2, h: 236 };

/* ---------------------------------------------------------- html to text */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", deg: "°", times: "×" };
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

type Block = { kind: "p" | "li"; text: string };

/** Paragraphs and list items from imported HTML. */
function blocks(html: string): Block[] {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n\u0001")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|table|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  return decode(text)
    .split(/\n{2,}|(?=\u0001)/)
    .map((b) => b.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, " ").trim())
    .filter((b) => b && b !== "\u0001")
    .map((b) => (b.startsWith("\u0001") ? { kind: "li" as const, text: b.slice(1).trim() } : { kind: "p" as const, text: b }));
}

/* ------------------------------------------------------------- assets */

async function fetchBuffer(url: string) {
  try {
    const res = await fetch(url);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** PDF can embed JPEG and PNG only: photos become JPEG, the logo a sharp PNG. */
async function assets(trip: Trip, origin: string) {
  const [logoSvg, cover] = await Promise.all([fetchBuffer(`${origin}/brand/logo.svg`), trip.cover ? fetchBuffer(`${origin}${trip.cover.src}`) : null]);
  const logo = logoSvg ? await sharp(logoSvg, { density: 600 }).resize(528).png().toBuffer() : null;
  let photo: Buffer | null = null;
  if (cover) {
    // Crop to the cover's shape the way the site does: the photo's own logo
    // either stays whole or is left out completely, never cut in half.
    const img = sharp(cover);
    const { width = 0, height = 0 } = await img.metadata();
    const aspect = COVER.w / COVER.h;
    const p = Number(cropFor(width, height, aspect).position.split(" ")[1].replace("%", "")) / 100;
    const winH = Math.min(height, Math.round(width / aspect));
    const winW = Math.min(width, Math.round(height * aspect));
    const box = winH < height ? { left: 0, top: Math.round(p * (height - winH)), width, height: winH } : { left: width - winW, top: 0, width: winW, height };
    photo = await img.extract(box).resize(1600).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }
  // Up to three gallery photos for the brochure strip.
  const gallery: Buffer[] = [];
  for (const g of trip.gallery.slice(0, 6)) {
    if (gallery.length >= 3) break;
    const b = await fetchBuffer(`${origin}${g.src}`);
    if (!b) continue;
    try { gallery.push(await sharp(b).resize(900, 600, { fit: "cover" }).jpeg({ quality: 78, mozjpeg: true }).toBuffer()); } catch { /* skip */ }
  }
  return { logo, photo, gallery };
}

/* -------------------------------------------------------------- render */

export async function programPdf(trip: Trip, origin: string, info: InfoItem[]): Promise<Buffer> {
  const { logo, photo, gallery } = await assets(trip, origin);
  const url = `${site.url}/trip/${trip.slug}/`;
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 78, bottom: 70, left: M, right: M },
    bufferPages: true,
    // Search engines show the PDF's Title as its headline.
    info: {
      Title: `${trip.title}: ${trip.days}-Day Itinerary${trip.price ? " & Cost" : ""} (PDF) | ${site.name}`,
      Author: site.legalName,
      Subject: trip.summary || `${trip.title} day-by-day itinerary`,
      Keywords: `${trip.title}, ${trip.title} itinerary, ${trip.title} cost, ${trip.days} days, Nepal, trekking, ${site.name}`,
      Creator: site.name,
    },
  });
  doc.registerFont("Display", font("manrope", "manrope-latin-700-normal.woff"));
  doc.registerFont("Semi", font("manrope", "manrope-latin-600-normal.woff"));
  doc.registerFont("Body", font("dm-sans", "dm-sans-latin-400-normal.woff"));
  doc.registerFont("Medium", font("dm-sans", "dm-sans-latin-500-normal.woff"));
  doc.registerFont("Bold", font("dm-sans", "dm-sans-latin-700-normal.woff"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const room = (need: number) => {
    if (doc.y + need > BOTTOM) doc.addPage();
  };
  const eyebrow = (text: string, x = M, y = doc.y) => doc.font("Bold").fontSize(7.5).fillColor(C.teal).text(text.toUpperCase(), x, y, { characterSpacing: 1.6 });
  const heading = (text: string) => {
    room(70);
    doc.moveDown(1.2);
    doc.font("Display").fontSize(18).fillColor(C.ink).text(text, M, doc.y, { width: CW });
    doc.moveDown(0.5);
  };

  /* Cover */
  if (logo) doc.image(logo, M, 30, { width: 116 });
  eyebrow("Trip program", W - M - 200, 44);
  doc.font("Body").fontSize(8.5).fillColor(C.muted).text(site.url.replace("https://", ""), W - M - 200, 56, { width: 200, align: "right", link: url });
  doc.y = 116;
  if (photo) {
    doc.save().roundedRect(M, 116, CW, 236, 10).clip().image(photo, M, 116, { width: CW, height: 236, cover: [CW, 236], align: "center", valign: "center" }).restore();
    doc.y = 116 + 236 + 22;
  }
  doc.font("Display").fontSize(25).fillColor(C.ink).text(trip.title, M, doc.y, { width: CW, lineGap: 1 });
  doc.moveDown(0.4);
  if (trip.summary) doc.font("Body").fontSize(10.5).fillColor(C.soft).text(trip.summary, { width: CW, lineGap: 2.5 });
  doc.moveDown(1);

  // Trip information (the same fields as the trip page) and the price
  const facts = [
    ...info.map((f) => ({ k: f.label, v: f.value, accent: false })),
    trip.price ? { k: "From (per person)", v: `US$${trip.price.amount.toLocaleString("en-US")}`, accent: true } : { k: "Price", v: "On request", accent: false },
  ];
  const cols = 4;
  const fw = (CW - (cols - 1) * 8) / cols;
  let fy = doc.y;
  facts.forEach((f, i) => {
    const col = i % cols;
    if (i && col === 0) fy += 64;
    const x = M + col * (fw + 8);
    doc.roundedRect(x, fy, fw, 56, 6).fill(f.accent ? C.tealSoft : C.snow).strokeColor(C.line).lineWidth(0.6).roundedRect(x, fy, fw, 56, 6).stroke();
    doc.font("Bold").fontSize(6.6).fillColor(C.muted).text(f.k.toUpperCase(), x + 10, fy + 9, { width: fw - 20, characterSpacing: 0.7, lineBreak: false });
    // Long values wrap onto a second line in a smaller size.
    doc.font("Display").fontSize(10.5).fillColor(f.accent ? C.teal : C.ink).text(f.v, x + 10, fy + 21, { width: fw - 20, height: 29, lineGap: 0.5, ellipsis: true });
  });
  doc.y = fy + 56 + 8;
  if (trip.price?.regular && trip.price.regular > trip.price.amount) {
    doc.font("Medium").fontSize(8.5).fillColor(C.red).text(`Save US$${(trip.price.regular - trip.price.amount).toLocaleString("en-US")} on the regular price of US$${trip.price.regular.toLocaleString("en-US")}.`, M, doc.y, { width: CW, align: "right" });
  }

  // Highlights
  if (trip.highlights.length) {
    heading("Highlights");
    for (const h of trip.highlights.slice(0, 10)) bullet(decode(h.replace(/<[^>]+>/g, "")));
  }

  /* Photo strip */
  if (gallery.length >= 2) {
    room(140);
    doc.moveDown(1.2);
    const gw = (CW - (gallery.length - 1) * 8) / gallery.length;
    const gh = Math.round(gw * 0.66);
    const gy = doc.y;
    gallery.forEach((g, i) => {
      const x = M + i * (gw + 8);
      doc.save().roundedRect(x, gy, gw, gh, 8).clip().image(g, x, gy, { width: gw, height: gh, cover: [gw, gh], align: "center", valign: "center" }).restore();
    });
    doc.y = gy + gh;
  }

  /* Altitude profile */
  const pts = trip.itinerary.filter((d) => d.altitude && d.altitude > 0).map((d) => ({ day: d.day, alt: d.altitude as number }));
  if (pts.length >= 3) {
    room(220);
    heading("Altitude profile");
    const ch = 150;
    const top = doc.y + 4;
    const left = M + 34;
    const width = CW - 40;
    const maxA = Math.ceil(Math.max(...pts.map((p) => p.alt)) / 1000) * 1000;
    const minA = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.alt)) / 1000) * 1000);
    const lastDay = Math.max(...pts.map((p) => p.day));
    const firstDay = Math.min(...pts.map((p) => p.day));
    const X = (day: number) => left + ((day - firstDay) / Math.max(1, lastDay - firstDay)) * width;
    const Y = (a: number) => top + ch - ((a - minA) / Math.max(1, maxA - minA)) * ch;
    // Recessive grid: one line per 1,000 m
    for (let a = minA; a <= maxA; a += 1000) {
      doc.moveTo(left, Y(a)).lineTo(left + width, Y(a)).lineWidth(0.4).strokeColor(C.line).stroke();
      doc.font("Body").fontSize(6.8).fillColor(C.muted).text(`${(a / 1000).toLocaleString("en-US")}k m`, M - 4, Y(a) - 3.5, { width: 34, align: "right", lineBreak: false });
    }
    // Area, then the line on top
    doc.save().moveTo(X(pts[0].day), top + ch);
    pts.forEach((p) => doc.lineTo(X(p.day), Y(p.alt)));
    doc.lineTo(X(pts.at(-1)!.day), top + ch).closePath().fillOpacity(0.14).fill(C.teal).restore();
    doc.save().moveTo(X(pts[0].day), Y(pts[0].alt));
    pts.slice(1).forEach((p) => doc.lineTo(X(p.day), Y(p.alt)));
    doc.lineWidth(1.8).lineJoin("round").strokeColor(C.teal).stroke().restore();
    pts.forEach((p) => doc.circle(X(p.day), Y(p.alt), 2.2).fill(C.teal));
    // Highest point
    const hi = pts.reduce((a, b) => (b.alt > a.alt ? b : a));
    doc.circle(X(hi.day), Y(hi.alt), 4).lineWidth(1.5).fillAndStroke("#ffffff", C.teal);
    const label = `${hi.alt.toLocaleString("en-US")} m · Day ${hi.day}`;
    doc.font("Bold").fontSize(7.5).fillColor(C.ink).text(label, Math.min(X(hi.day) - 50, left + width - 100), Y(hi.alt) - 15, { width: 100, align: "center", lineBreak: false });
    // Day ticks
    const step = Math.max(1, Math.ceil((lastDay - firstDay + 1) / 12));
    for (let d = firstDay; d <= lastDay; d += step) doc.font("Body").fontSize(6.8).fillColor(C.muted).text(`D${d}`, X(d) - 10, top + ch + 5, { width: 20, align: "center", lineBreak: false });
    doc.y = top + ch + 20;
    doc.x = M;
  }

  /* Itinerary */
  if (trip.itinerary.length) {
    room(170); // keep the heading with the first day
    heading("Day-by-day itinerary");
    for (const d of trip.itinerary) {
      room(92);
      const top = doc.y;
      doc.roundedRect(M, top, 46, 18, 9).fill(C.teal);
      doc.font("Bold").fontSize(7.5).fillColor("#ffffff").text(`DAY ${String(d.day).padStart(2, "0")}`, M, top + 5.2, { width: 46, align: "center", characterSpacing: 0.6 });
      doc.font("Semi").fontSize(11.5).fillColor(C.ink).text(decode(d.title), M + 58, top + 2, { width: CW - 58, lineGap: 1 });
      const km = d.distanceKm ?? null;
      const meta = [
        d.altitude ? `${d.altitude.toLocaleString("en-US")} m / ${Math.round(d.altitude * 3.28084).toLocaleString("en-US")} ft` : null,
        durationOf(d),
        km ? `about ${km} km / ${(km * 0.621371).toFixed(1)} mi` : null,
        d.meals.length ? `Meals: ${d.meals.map((m) => m[0].toUpperCase() + m.slice(1)).join(", ")}` : null,
        d.overnight || d.accommodation ? `Stay: ${[d.accommodation, d.overnight?.trim()].filter(Boolean).join(", ")}` : null,
      ].filter(Boolean);
      if (meta.length) {
        doc.moveDown(0.25);
        doc.font("Medium").fontSize(8.2).fillColor(C.teal).text(meta.join("   ·   "), M + 58, doc.y, { width: CW - 58 });
      }
      doc.moveDown(0.35);
      for (const b of blocks(d.html)) {
        if (b.kind === "li") bullet(b.text, M + 58);
        else doc.font("Body").fontSize(9.6).fillColor(C.soft).text(b.text, M + 58, doc.y, { width: CW - 58, lineGap: 2.2, paragraphGap: 5 });
      }
      doc.moveDown(0.6);
      doc.strokeColor(C.line).lineWidth(0.5).moveTo(M + 58, doc.y).lineTo(W - M, doc.y).stroke();
      doc.moveDown(0.7);
    }
  }

  /* Included / not included */
  if (trip.includes.length) {
    heading("What's included");
    for (const i of trip.includes) bullet(decode(i.replace(/<[^>]+>/g, "")), M, "check");
  }
  if (trip.excludes.length) {
    heading("Not included");
    for (const i of trip.excludes) bullet(decode(i.replace(/<[^>]+>/g, "")), M, "cross");
  }

  /* How to book */
  room(150);
  doc.moveDown(1.4);
  const by = doc.y;
  doc.roundedRect(M, by, CW, 128, 10).fill(C.teal);
  doc.font("Display").fontSize(17).fillColor("#ffffff").text("Ready to go, or want it your way?", M + 22, by + 20, { width: CW - 44 });
  doc.font("Body").fontSize(9.8).fillColor("#e6f4f6").text("Book this trip online, or tell us your dates and we'll shape the itinerary around you.", M + 22, doc.y + 4, { width: CW - 44 });
  const line = (label: string, value: string, link?: string) => {
    doc.font("Bold").fontSize(8).fillColor("#bfe6ec").text(label.toUpperCase(), M + 22, doc.y + 6, { continued: true, characterSpacing: 0.8 });
    doc.font("Medium").fontSize(9.5).fillColor("#ffffff").text(`   ${value}`, { link, characterSpacing: 0 });
  };
  line("Book or customise", url.replace("https://", ""), url);
  line("WhatsApp / 24/7", site.mobile, `https://wa.me/${site.whatsapp}`);
  line("Email", site.email, `mailto:${site.email}`);
  doc.y = by + 128 + 14;
  doc.font("Body").fontSize(7.8).fillColor(C.muted).text(`${site.legalName} · ${site.registration.filter((r) => r.value).map((r) => `${r.label} ${r.value}`).join(" · ")}`, M, doc.y, { width: CW, align: "center" });

  /* Header and footer on every page */
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    if (i > range.start) {
      if (logo) doc.image(logo, M, 26, { width: 62 });
      doc.font("Medium").fontSize(8).fillColor(C.muted).text(`${trip.title} · Trip program`, M + 80, 40, { width: CW - 80, align: "right", lineBreak: false });
      doc.strokeColor(C.line).lineWidth(0.5).moveTo(M, 64).lineTo(W - M, 64).stroke();
    }
    doc.strokeColor(C.line).lineWidth(0.5).moveTo(M, H - 46).lineTo(W - M, H - 46).stroke();
    doc.font("Body").fontSize(7.5).fillColor(C.muted).text(`${site.name} · ${site.address.street}, ${site.address.city}, Nepal · ${site.url.replace("https://", "")}`, M, H - 38, { width: CW - 60, lineBreak: false, link: site.url });
    doc.text(`${i - range.start + 1} / ${range.count}`, W - M - 60, H - 38, { width: 60, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
  return done;

  function bullet(text: string, x = M, mark: "dot" | "check" | "cross" = "dot") {
    room(30);
    const y = doc.y;
    if (mark === "dot") doc.circle(x + 3, y + 5.6, 1.9).fill(C.teal);
    if (mark === "check") doc.strokeColor(C.teal).lineWidth(1.4).moveTo(x, y + 5.5).lineTo(x + 2.8, y + 8.3).lineTo(x + 7.5, y + 2.6).stroke();
    if (mark === "cross") doc.strokeColor(C.red).lineWidth(1.3).moveTo(x + 0.5, y + 2).lineTo(x + 6.5, y + 8).moveTo(x + 6.5, y + 2).lineTo(x + 0.5, y + 8).stroke();
    doc.font("Body").fontSize(9.6).fillColor(C.soft).text(text, x + 14, y, { width: W - M - x - 14, lineGap: 2, paragraphGap: 3.5 });
  }
}

export const programFileName = (trip: Pick<Trip, "title">) => `${trip.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}-Base-Camp-Adventure.pdf`;
