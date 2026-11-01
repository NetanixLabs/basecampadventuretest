import { ensureCompany } from "@/lib/company";
import { site } from "@/lib/site";

/**
 * The Base Camp coupon: a ticket-style voucher in the company's colours,
 * built from email-safe tables so it looks the same in Gmail, Outlook and
 * Apple Mail. Used on its own (a code sent to one traveller) and inside the
 * newsletter's offer section.
 */
export type Coupon = {
  code: string;
  /** e.g. "10% OFF" or "$200 OFF" */
  amount: string;
  /** e.g. "Dashain festival offer" */
  label: string;
  validUntil: string | null;
  /** e.g. "Everest Base Camp Trek" or "every trip" */
  validFor: string;
  minPax: number;
  bookUrl: string;
};

const PINE = "#00788a";
const INK = "#242a2c";
const MUTED = "#626b70";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Address of the voucher image (rendered by src/app/coupon/[code]/route.tsx). */
export const couponImage = (code: string, base: string = site.url, photo?: string | null, bg?: string) => {
  const q = new URLSearchParams({ ...(photo ? { photo } : {}), ...(bg ? { bg: bg.replace("#", "") } : {}) }).toString();
  return `${base}/coupon/${encodeURIComponent(code)}/${q ? `?${q}` : ""}`;
};

/**
 * The voucher in an email: the designed voucher image (linked to booking),
 * then the code as real text and a button, so it can be copied and still
 * works when an email app hides images.
 */
export function couponBlock(c: Coupon, { base = site.url, photo, bg }: { bg?: string; base?: string; photo?: string | null } = {}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate">
<tr><td><a href="${esc(c.bookUrl)}"><img src="${esc(couponImage(c.code, base, photo, bg))}" width="100%" alt="${esc(`${c.amount} ${c.label}. Your code: ${c.code}`)}" style="display:block;width:100%;height:auto;border:0;border-radius:18px;box-shadow:0 12px 30px rgba(0,40,50,0.18)"></a></td></tr>
<tr><td style="padding:16px 4px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:13px;color:${MUTED};line-height:20px">Your code<br><span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;letter-spacing:3px;font-weight:800;color:${INK}">${esc(c.code)}</span></td>
    <td align="right"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${PINE}" style="border-radius:999px"><a href="${esc(c.bookUrl)}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">Book with this code &rarr;</a></td></tr></table></td>
  </tr></table>
  <p style="margin:12px 0 0;font-size:12px;line-height:18px;color:${MUTED}">Valid for ${esc(c.validFor.toLowerCase() === "every trip" ? "every trip" : c.validFor)}${c.validUntil ? `, book by ${esc(c.validUntil)}` : ""}${c.minPax > 1 ? `, for ${c.minPax}+ travellers` : ""}. Enter the code when you book on basecampadventure.com or quote it to our team. One code per booking; not exchangeable for cash.</p>
</td></tr>
</table>`;
}

/** A coupon sent to one person, with a personal note. */
export function renderCouponEmail(c: Coupon & { name: string; message: string; photo?: string | null }, { base = site.url }: { base?: string } = {}): string {
  ensureCompany();
  const BG = "#eef3f4";
  const para = c.message
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${INK}">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(c.amount)} ${esc(c.label)}</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(`${c.amount} your next trip with Base Camp Adventure. Code ${c.code}`)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 20px"><a href="${site.url}/"><img src="${base}/brand/logo-512.png" width="112" alt="${esc(site.name)}" style="display:block;border:0;width:112px;height:auto;border-radius:12px"></a></td></tr>
<tr><td style="padding:0 6px 22px">
<h1 style="margin:0 0 14px;font-size:28px;line-height:34px;font-weight:800;color:${INK};letter-spacing:-0.4px">${c.name ? `${esc(c.name)}, a` : "A"} gift for your next adventure</h1>
${para}
</td></tr>
<tr><td>${couponBlock(c, { base, photo: c.photo, bg: BG })}</td></tr>
<tr><td style="padding:24px 6px 0">
<p style="margin:0;font-size:16px;line-height:26px;color:${INK}">Namaste,<br><strong>${esc(site.contactPerson)}</strong> and the ${esc(site.name)} team</p>
<p style="margin:6px 0 0;font-size:13px;color:${MUTED}">Questions? Reply to this email or WhatsApp us on ${esc(site.mobile)}.</p>
</td></tr>
<tr><td align="center" style="padding:28px 6px 0;font-size:12px;line-height:19px;color:${MUTED}">
${esc(site.legalName)} · ${esc(site.address.street)}, ${esc(site.address.city)}, Nepal<br>Licensed by Nepal Tourism Board · TAAN ${esc(site.registration.find((r) => r.label === "TAAN")?.value ?? "")} · Since ${site.founded}
</td></tr>
</table></td></tr></table></body></html>`;
}

export function couponText(c: Coupon & { name: string; message: string }) {
  return [`${c.name ? `${c.name}, a` : "A"} gift for your next adventure`, "", c.message, "", `${c.amount} · ${c.label}`, `Your code: ${c.code}`, `Valid for: ${c.validFor}`, c.validUntil ? `Book by: ${c.validUntil}` : "", "", `Book with this code: ${c.bookUrl}`, "", `Namaste, ${site.contactPerson} and the ${site.name} team`].filter((l, i, a) => l || a[i - 1]).join("\n");
}
