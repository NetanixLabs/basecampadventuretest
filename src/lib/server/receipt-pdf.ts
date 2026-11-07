import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import sharp from "sharp";
import type { Receipt } from "@/generated/prisma/client";
import { ensureCompany } from "@/lib/company";
import { regNo, site } from "@/lib/site";
import { getBrand } from "@/lib/server/receipt-brand";
import { readFileData } from "@/lib/server/portal";
import type { ReceiptItem, ReceiptSummary } from "@/lib/server/receipts";
import { amountInWords as words_, asDocLang, fmtDate, fmtMoney, t } from "@/lib/receipt-i18n";

/** A professional A4 receipt or bill: letterhead, registration numbers, lines, VAT, signature, stamp, QR check. */
const C = { teal: "#00788a", tealSoft: "#e3f2f4", ink: "#1f2527", soft: "#4a5357", muted: "#6b7478", line: "#d8e3e6", green: "#0f7a4a", red: "#b42318" };
const font = (pkg: string, file: string) => path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules", "@fontsource", pkg, "files", file);
const W = 595.28;
const H = 841.89;
const M = 46;
const CW = W - M * 2;


let logoCache: Buffer | null = null;
async function logo() {
  if (logoCache) return logoCache;
  const svg = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "brand", "logo.svg"));
  logoCache = await sharp(svg, { density: 600 }).resize(600).png().toBuffer();
  return logoCache;
}

export async function receiptPdf(r: Receipt, verifyUrl: string, genuine: boolean, against?: string | null): Promise<Buffer> {
  const L = asDocLang(r.lang);
  const fmt = (n: number, cur: string) => fmtMoney(n, cur, L);
  const day = (d: Date) => fmtDate(d, L);
  ensureCompany();
  const brand = await getBrand();
  const [logoPng, qr, signature, stamp] = await Promise.all([
    logo(),
    QRCode.toBuffer(verifyUrl, { margin: 1, width: 300, color: { dark: "#1f2527", light: "#ffffff" } }),
    brand.signatureKey ? readFileData(brand.signatureKey).catch(() => null) : null,
    brand.stampKey ? readFileData(brand.stampKey).catch(() => null) : null,
  ]);
  const isBill = r.kind === "bill";
  const isCredit = r.kind === "credit";
  const kindKey = isBill ? "bill" : isCredit ? "credit" : "receipt";
  const title = t(L, `${kindKey}Title`);
  const doc = new PDFDocument({ size: "A4", margins: { top: M, bottom: 40, left: M, right: M }, info: { Title: `${title} ${r.number} | ${site.legalName}`, Author: site.legalName, Subject: `${title} · ${r.customerName}` } });
  doc.registerFont("Display", font("manrope", "manrope-latin-700-normal.woff"));
  doc.registerFont("Semi", font("manrope", "manrope-latin-600-normal.woff"));
  doc.registerFont("Body", font("dm-sans", "dm-sans-latin-400-normal.woff"));
  doc.registerFont("Medium", font("dm-sans", "dm-sans-latin-500-normal.woff"));
  doc.registerFont("Bold", font("dm-sans", "dm-sans-latin-700-normal.woff"));
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  // Letterhead
  doc.rect(0, 0, W, 6).fill(C.teal);
  doc.image(logoPng, M, 30, { width: 108 });
  // Right-hand letterhead, each line placed under the previous one (long lines wrap safely).
  let ly = 30;
  const right = (t: string, f = "Body", size = 8.6, c = C.soft, gap = 2) => {
    if (!t) return;
    doc.font(f).fontSize(size).fillColor(c).text(t, W - M - 300, ly, { width: 300, align: "right" });
    ly = doc.y + gap;
  };
  right(site.legalName, "Display", 11.5, C.ink, 4);
  right(`${site.address.street}, ${site.address.city}, Nepal${site.address.poBox ? ` · P.O. Box ${site.address.poBox.replace(/\D/g, "")}` : ""}`);
  right(`${site.phone} · ${site.mobile}`);
  right(site.email);
  const regs = [regNo("VAT") && `VAT/PAN ${regNo("VAT")}`, regNo("Govt. Reg.") && `Reg. ${regNo("Govt. Reg.")}`, regNo("NTB Licence") && `Tourism Licence ${regNo("NTB Licence")}`].filter(Boolean).join(" · ");
  const regs2 = [regNo("NMA") && `NMA ${regNo("NMA")}`, regNo("TAAN") && `TAAN ${regNo("TAAN")}`].filter(Boolean).join(" · ");
  right(regs, "Medium", 8.2, C.ink);
  right(regs2, "Medium", 8.2, C.ink);

  // Title band
  const ty = Math.max(122, ly + 12);
  doc.rect(M, ty, CW, 54).fill(C.tealSoft);
  doc.font("Display").fontSize(title.length > 16 ? 16 : 19).fillColor(isCredit ? C.red : C.teal).text(title, M + 16, ty + 10, { characterSpacing: 1.2, width: 260, lineBreak: false });
  doc.font("Medium").fontSize(8.6).fillColor(C.soft).text(isCredit && against ? `${t(L, "creditSub")} · ${t(L, "against", { n: against })}` : t(L, `${kindKey}Sub`), M + 16, ty + 36, { width: 280, lineBreak: false, ellipsis: true });
  const meta = (k: string, v: string, y: number) => {
    doc.font("Bold").fontSize(7).fillColor(C.muted).text(k.toUpperCase(), W - M - 230, y, { width: 100, characterSpacing: 0.8 });
    doc.font("Semi").fontSize(9.5).fillColor(C.ink).text(v, W - M - 130, y - 1.5, { width: 114, align: "right" });
  };
  meta(t(L, `${kindKey}No`), r.number, ty + 10);
  meta(t(L, "date"), day(r.issuedAt), ty + 24);
  meta(isBill ? t(L, "status") : isCredit ? t(L, "refundedOn") : t(L, "paidOn"), isBill ? t(L, "awaiting") : day(r.paidAt ?? r.issuedAt), ty + 38);

  // Billed to
  let y = ty + 74;
  doc.font("Bold").fontSize(7).fillColor(C.muted).text(isBill ? t(L, "billedTo") : isCredit ? t(L, "refundedTo") : t(L, "receivedFrom"), M, y, { characterSpacing: 0.8 });
  doc.font("Semi").fontSize(11.5).fillColor(C.ink).text(r.customerName, M, y + 12, { width: 300 });
  const contact = [r.customerEmail, r.customerAddress].filter(Boolean).join("\n");
  if (contact) doc.font("Body").fontSize(8.8).fillColor(C.soft).text(contact, M, doc.y + 2, { width: 300 });
  if (!isBill && r.paidVia) {
    doc.font("Bold").fontSize(7).fillColor(C.muted).text(isCredit ? t(L, "refundMethod") : t(L, "method"), W - M - 200, y, { width: 200, align: "right", characterSpacing: 0.8 });
    doc.font("Medium").fontSize(9.5).fillColor(C.ink).text(r.paidVia, W - M - 200, y + 12, { width: 200, align: "right" });
  }

  // Lines
  y = Math.max(doc.y, y + 40) + 18;
  const col = { d: M + 10, q: M + CW - 200, u: M + CW - 150, t: M + CW - 80 };
  doc.rect(M, y, CW, 22).fill(C.ink);
  doc.font("Bold").fontSize(7.5).fillColor("#ffffff");
  doc.text(t(L, "description"), col.d, y + 7.5, { characterSpacing: 0.8 });
  doc.text(t(L, "qty"), col.q - 10, y + 7.5, { width: 50, align: "right" });
  doc.text(t(L, "unit"), col.u - 20, y + 7.5, { width: 80, align: "right" });
  doc.text(t(L, "amount"), col.t, y + 7.5, { width: 70, align: "right" });
  y += 22;
  const items = (r.items as ReceiptItem[]) ?? [];
  items.forEach((i, idx) => {
    const h = Math.max(24, doc.font("Body").fontSize(9.2).heightOfString(i.description, { width: col.q - col.d - 16 }) + 12);
    if (idx % 2) doc.rect(M, y, CW, h).fill("#f7fafb");
    doc.font("Body").fontSize(9.2).fillColor(C.ink).text(i.description, col.d, y + 6, { width: col.q - col.d - 16 });
    doc.font("Medium").fontSize(9.2).fillColor(C.soft).text(String(i.qty), col.q, y + 6, { width: 40, align: "right" });
    doc.text(fmt(i.unitPrice, r.currency), col.u - 20, y + 6, { width: 80, align: "right" });
    doc.font("Semi").fillColor(C.ink).text(fmt(i.qty * i.unitPrice, r.currency), col.t - 10, y + 6, { width: 80, align: "right" });
    y += h;
  });
  doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(0.8).strokeColor(C.line).stroke();

  // Totals
  y += 10;
  const totalsTop = y;
  const tot = (k: string, v: string, strong = false) => {
    doc.font(strong ? "Bold" : "Medium").fontSize(strong ? 11 : 9.2).fillColor(strong ? C.ink : C.soft).text(k, M + CW - 270, y, { width: 170, align: "right" });
    doc.font(strong ? "Display" : "Semi").fontSize(strong ? 12.5 : 9.6).fillColor(strong ? C.teal : C.ink).text(v, M + CW - 100, y - (strong ? 1 : 0), { width: 90, align: "right" });
    y += strong ? 22 : 16;
  };
  const vatRate = Number(r.vatRate);
  if (r.vatMode !== "none") tot(t(L, "subtotal"), fmt(Number(r.subtotal), r.currency));
  if (r.vatMode === "added") tot(`${t(L, "vat")} ${vatRate}%`, fmt(Number(r.vat), r.currency));
  if (r.vatMode === "included") tot(`${t(L, "includesVat")} ${vatRate}%`, fmt(Number(r.vat), r.currency));
  doc.rect(M + CW - 280, y - 3, 280, 28).fill(isCredit ? "#fdf1f0" : C.tealSoft);
  y += 3;
  tot(isBill ? t(L, "amountDue") : isCredit ? t(L, "amountRefunded") : t(L, "amountReceived"), `${isCredit ? "− " : ""}${fmt(Number(r.total), r.currency)}`, true);

  // Amount in words, as on a formal receipt.
  doc.font("Bold").fontSize(7).fillColor(C.muted).text(t(L, "inWords"), M + CW - 280, y + 2, { width: 270, align: "right", characterSpacing: 0.8 });
  doc.font("Medium").fontSize(8.6).fillColor(C.ink).text(words_(Number(r.total), r.currency, L), M + CW - 280, y + 13, { width: 270, align: "right" });
  y = doc.y + 4;

  // Where the booking stands: trip total, advance paid before, this payment, balance due.
  const sum = r.summary as ReceiptSummary | null;
  if (sum) {
    y += 6;
    const c = (n: number) => fmt(n / 100, r.currency);
    const discounted = (sum.discount ?? 0) > 0;
    const rows: [string, string, boolean][] = [
      ...(discounted
        ? ([
            [t(L, "tripPrice"), c(sum.tripPrice ?? sum.tripTotal), false],
            [`${t(L, "discount")}${sum.discountCode ? ` (${t(L, "code")} ${sum.discountCode})` : ""}`, `− ${c(sum.discount ?? 0)}`, false],
          ] as [string, string, boolean][])
        : []),
      [discounted ? t(L, "totalAfterDiscount") : t(L, "tripTotal"), c(sum.tripTotal), false],
      [t(L, "paidBefore"), c(sum.paidBefore), false],
      ...(isBill ? [] : ([[t(L, "thisPayment"), c(sum.thisPayment), false]] as [string, string, boolean][])),
      [t(L, "paidSoFar"), c(sum.paidBefore + (isBill ? 0 : sum.thisPayment)), false],
      [t(L, "balanceDue"), c(sum.balance), true],
    ];
    doc.font("Bold").fontSize(7).fillColor(C.muted).text(t(L, "bookingBalance"), M + CW - 280, y, { width: 270, align: "right", characterSpacing: 0.8 });
    y += 12;
    for (const [k, v, strong] of rows) {
      doc.font(strong ? "Bold" : "Body").fontSize(8.8).fillColor(strong ? (sum.balance > 0 ? C.red : C.ink) : C.soft).text(k, M + CW - 270, y, { width: 170, align: "right" });
      doc.font(strong ? "Bold" : "Medium").fontSize(8.8).fillColor(strong ? (sum.balance > 0 ? C.red : C.ink) : C.ink).text(v, M + CW - 100, y, { width: 90, align: "right" });
      y += 13;
    }
  }

  // Status box: straight and quiet, beside the totals.
  {
    const sum = r.summary as ReceiptSummary | null;
    const box = r.voidedAt
      ? { t: t(L, "cancelled"), sub: r.voidReason ? `${t(L, "reason")}: ${r.voidReason}`.slice(0, 60) : t(L, "notValid"), c: C.red, bg: "#fdf1f0" }
      : isBill
        ? { t: t(L, "paymentDue"), sub: `${t(L, "amountDue")} ${fmt(Number(r.total), r.currency)}`, c: "#9a5b00", bg: "#fff8ec" }
        : isCredit
          ? { t: t(L, "refunded"), sub: `${t(L, "refundedOn")} ${day(r.paidAt ?? r.issuedAt)}`.slice(0, 60), c: C.red, bg: "#fdf1f0" }
          : { t: t(L, "paid"), sub: `${sum && sum.balance > 0 ? t(L, "advanceReceived") : t(L, "received")} ${day(r.paidAt ?? r.issuedAt)}`.slice(0, 60), c: C.green, bg: "#f1f8f4" };
    const bx = M;
    const byy = totalsTop + 2;
    doc.rect(bx, byy, 200, 52).fillAndStroke(box.bg, box.c);
    doc.rect(bx, byy, 4, 52).fill(box.c);
    doc.font("Display").fontSize(15).fillColor(box.c).text(box.t, bx + 16, byy + 10, { width: 176, characterSpacing: 1.6 });
    doc.font("Medium").fontSize(8).fillColor(C.soft).text(box.sub, bx + 16, byy + 31, { width: 176, ellipsis: true, lineBreak: false });
  }

  // Notes and bank details
  y += 14;
  if (r.notes) {
    doc.font("Bold").fontSize(7).fillColor(C.muted).text(t(L, "notes"), M, y, { characterSpacing: 0.8 });
    doc.font("Body").fontSize(9).fillColor(C.soft).text(r.notes, M, y + 11, { width: CW * 0.6 });
    y = doc.y + 10;
  }
  if (isBill && brand.bankDetails) {
    doc.font("Bold").fontSize(7).fillColor(C.muted).text(t(L, "bank"), M, y, { characterSpacing: 0.8 });
    doc.font("Body").fontSize(9).fillColor(C.soft).text(brand.bankDetails, M, y + 11, { width: CW * 0.6 });
    y = doc.y + 10;
  }

  // Signature, stamp and QR at the bottom of the page
  const by = Math.max(y + 10, H - 250);
  // Verification panel
  const fingerprint = r.signature.slice(0, 20).toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");
  doc.roundedRect(M, by, 290, 112, 8).lineWidth(0.8).strokeColor(C.line).stroke();
  doc.image(qr, M + 10, by + 10, { width: 92 });
  doc.font("Bold").fontSize(7).fillColor(C.teal).text(t(L, "verify"), M + 112, by + 12, { characterSpacing: 0.9 });
  doc.font("Body").fontSize(8).fillColor(C.soft).text(t(L, "verifyText", { site: site.url.replace(/^https?:\/\//, "") }), M + 112, by + 24, { width: 170, lineGap: 1.2 });
  doc.font("Bold").fontSize(6.6).fillColor(C.muted).text(t(L, "verifyCode"), M + 112, doc.y + 6, { characterSpacing: 0.8 });
  doc.font("Semi").fontSize(9).fillColor(C.ink).text(r.code, M + 112, doc.y + 1.5, { characterSpacing: 1.2 });
  doc.font("Bold").fontSize(6.6).fillColor(C.muted).text(t(L, "fingerprint"), M + 112, doc.y + 5, { characterSpacing: 0.8 });
  doc.font("Medium").fontSize(8.4).fillColor(genuine ? C.ink : C.red).text(genuine ? fingerprint : t(L, "mismatch"), M + 112, doc.y + 1.5, { characterSpacing: 0.6 });
  // Signature over the line, the company stamp overlapping its right end (as stamped by hand).
  const sx = W - M - 200;
  if (signature) doc.image(signature, sx - 6, by + 16, { fit: [134, 66], valign: "bottom" });
  if (stamp) doc.image(stamp, W - M - 96, by + 4, { fit: [96, 72], align: "right", valign: "center" });
  doc.moveTo(sx, by + 84).lineTo(W - M, by + 84).lineWidth(0.8).strokeColor(C.ink).stroke();
  doc.font("Semi").fontSize(9.5).fillColor(C.ink).text(brand.signatory || t(L, "signatory"), sx, by + 89, { width: 200, align: "right" });
  doc.font("Body").fontSize(8.2).fillColor(C.muted).text(`${brand.signatoryTitle ? `${brand.signatoryTitle}, ` : ""}${site.legalName}`, sx - 40, doc.y + 1, { width: 240, align: "right" });

  // Footer
  doc.moveTo(M, H - 92).lineTo(W - M, H - 92).lineWidth(0.6).strokeColor(C.line).stroke();
  doc.font("Body").fontSize(7.8).fillColor(C.muted).text(brand.footerNote, M, H - 84, { width: CW, align: "center", lineGap: 1.5 });
  doc.font("Medium").fontSize(7.8).fillColor(C.teal).text(`${site.url.replace("https://", "")} · ${t(L, "issuedBy")} ${r.issuedByName ?? site.name}`, M, doc.y + 4, { width: CW, align: "center" });
  doc.rect(0, H - 6, W, 6).fill(C.teal);
  doc.end();
  return done;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function words(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`;
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${words(n % 100)}` : ""}`;
  for (const [size, name] of [[1_000_000_000, "Billion"], [1_000_000, "Million"], [1_000, "Thousand"]] as const) {
    if (n >= size) return `${words(Math.floor(n / size))} ${name}${n % size ? ` ${words(n % size)}` : ""}`;
  }
  return String(n);
}
const CURRENCY_WORDS: Record<string, [string, string]> = { USD: ["US Dollars", "Cents"], EUR: ["Euros", "Cents"], GBP: ["Pounds Sterling", "Pence"], AUD: ["Australian Dollars", "Cents"], NPR: ["Nepalese Rupees", "Paisa"], INR: ["Indian Rupees", "Paise"], CNY: ["Chinese Yuan", "Fen"] };
/** "US Dollars Two Thousand Three Hundred Twenty and Fifty Cents Only". */
export function amountInWords(amount: number, currency: string) {
  const c = Math.round(amount * 100);
  const major = Math.floor(c / 100);
  const minor = c % 100;
  const [big, small] = CURRENCY_WORDS[currency] ?? [currency, "Cents"];
  return `${big} ${major ? words(major) : "Zero"}${minor ? ` and ${words(minor)} ${small}` : ""} Only`;
}

export const receiptFileName = (r: Pick<Receipt, "number" | "kind">) => `${r.kind === "bill" ? "Bill" : r.kind === "credit" ? "Credit-note" : "Receipt"}-${r.number}.pdf`;
