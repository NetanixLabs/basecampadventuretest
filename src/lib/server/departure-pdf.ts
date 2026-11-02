import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import type { Booking, Guide } from "@/generated/prisma/client";
import { site } from "@/lib/site";
import { readDetails } from "@/lib/server/portal";

/** One sheet for the field team: dates, team with phones, every traveller's essentials. A4 landscape. */
const C = { teal: "#00788a", tealSoft: "#e3f2f4", ink: "#1f2527", soft: "#4a5357", muted: "#6b7478", line: "#d8e3e6", red: "#b42318" };
const font = (pkg: string, file: string) => path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules", "@fontsource", pkg, "files", file);
const W = 841.89;
const H = 595.28;
const M = 32;

export async function departurePdf(o: { title: string; start: Date; end: Date; bookings: Booking[]; staff: { guide: Guide; role: string }[]; notes: string | null }) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margins: { top: M, bottom: M, left: M, right: M }, info: { Title: `Departure list ${o.title} ${o.start.toISOString().slice(0, 10)}`, Author: site.legalName } });
  doc.registerFont("Display", font("manrope", "manrope-latin-700-normal.woff"));
  doc.registerFont("Body", font("dm-sans", "dm-sans-latin-400-normal.woff"));
  doc.registerFont("Medium", font("dm-sans", "dm-sans-latin-500-normal.woff"));
  doc.registerFont("Bold", font("dm-sans", "dm-sans-latin-700-normal.woff"));
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));
  const d = (x: Date) => x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const logo = await sharp(await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "brand", "logo.svg")), { density: 400 }).resize(360).png().toBuffer();

  doc.rect(0, 0, W, 5).fill(C.teal);
  doc.image(logo, M, 18, { width: 70 });
  doc.font("Display").fontSize(16).fillColor(C.ink).text(`Departure list · ${o.title}`, M + 86, 22, { width: W - M * 2 - 300 });
  doc.font("Medium").fontSize(9.5).fillColor(C.soft).text(`${d(o.start)} to ${d(o.end)} · ${o.bookings.reduce((s, b) => s + b.pax, 0)} travellers in ${o.bookings.length} booking${o.bookings.length === 1 ? "" : "s"}`, M + 86, doc.y + 2);
  doc.font("Body").fontSize(8).fillColor(C.muted).text(`Printed ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" })} (Nepal) · Confidential: travellers' personal details`, W - M - 300, 24, { width: 300, align: "right" });

  // Team
  let y = 70;
  doc.rect(M, y, W - M * 2, 22 + Math.ceil(Math.max(1, o.staff.length) / 3) * 14).fill(C.tealSoft);
  doc.font("Bold").fontSize(7.5).fillColor(C.teal).text("FIELD TEAM", M + 10, y + 7, { characterSpacing: 1 });
  o.staff.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    doc.font("Medium").fontSize(8.6).fillColor(C.ink).text(`${s.guide.name} · ${s.role}${s.guide.phone ? ` · ${s.guide.phone}` : ""}`, M + 90 + col * 240, y + 7 + row * 14, { width: 236, lineBreak: false, ellipsis: true });
  });
  if (!o.staff.length) doc.font("Body").fontSize(8.6).fillColor(C.red).text("No guide assigned yet", M + 90, y + 7);
  y += 30 + Math.ceil(Math.max(1, o.staff.length) / 3) * 14 - 6;

  // Travellers table
  const cols = [
    { k: "Lead traveller", w: 120 }, { k: "Pax", w: 26 }, { k: "Nationality", w: 64 }, { k: "Phone", w: 82 }, { k: "Passport", w: 74 },
    { k: "Arrival", w: 96 }, { k: "Hotel", w: 70 }, { k: "Food / medical", w: 110 }, { k: "Emergency contact", w: 92 }, { k: "Payment", w: 48 },
  ];
  const tw = cols.reduce((s, c) => s + c.w, 0);
  const scale = (W - M * 2) / tw;
  cols.forEach((c) => (c.w *= scale));
  const header = () => {
    doc.rect(M, y, W - M * 2, 18).fill(C.ink);
    let x = M + 4;
    for (const c of cols) {
      doc.font("Bold").fontSize(6.8).fillColor("#ffffff").text(c.k.toUpperCase(), x, y + 6, { width: c.w - 6, characterSpacing: 0.5, lineBreak: false });
      x += c.w;
    }
    y += 18;
  };
  header();
  o.bookings.forEach((b, i) => {
    const det = readDetails(b.detailsEnc);
    const paid = Number(b.paid) >= Number(b.total) - 0.005 ? "Paid" : Number(b.paid) > 0 ? "Part" : "Unpaid";
    const cells = [
      `${b.leadName}\n${b.reference}`,
      String(b.pax),
      det.nationality || b.leadCountry,
      b.leadPhone,
      [det.passportNumber, det.passportExpiry && `exp ${det.passportExpiry}`].filter(Boolean).join("\n") || "–",
      [det.arrivalFlight, det.arrivalTime?.replace("T", " ")].filter(Boolean).join("\n") || "–",
      det.hotel || "–",
      [det.diet && `Food: ${det.diet}`, det.medical && `Medical: ${det.medical}`].filter(Boolean).join("\n") || "–",
      [det.emergencyName, det.emergencyRelation, det.emergencyPhone].filter(Boolean).join(", ") || "–",
      paid,
    ];
    doc.font("Body").fontSize(8);
    const h = Math.max(24, ...cells.map((t, j) => doc.heightOfString(t, { width: cols[j].w - 8 }) + 10));
    if (y + h > H - M - 40) {
      doc.addPage();
      y = M;
      header();
    }
    if (i % 2) doc.rect(M, y, W - M * 2, h).fill("#f7fafb");
    let x = M + 4;
    cells.forEach((t, j) => {
      doc.font(j === 0 ? "Medium" : "Body").fontSize(8).fillColor(j === 9 && t !== "Paid" ? C.red : C.ink).text(t, x, y + 5, { width: cols[j].w - 8 });
      x += cols[j].w;
    });
    y += h;
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor(C.line).stroke();
  });

  if (o.notes) {
    y += 12;
    if (y > H - M - 60) {
      doc.addPage();
      y = M;
    }
    doc.font("Bold").fontSize(7.5).fillColor(C.teal).text("NOTES", M, y, { characterSpacing: 1 });
    doc.font("Body").fontSize(9).fillColor(C.ink).text(o.notes, M, y + 12, { width: W - M * 2 });
  }
  doc.font("Body").fontSize(7.5).fillColor(C.muted).text(`${site.legalName} · ${site.phone} · ${site.mobile} · ${site.email}`, M, H - M - 8, { width: W - M * 2, align: "center", lineBreak: false });
  doc.end();
  return done;
}
