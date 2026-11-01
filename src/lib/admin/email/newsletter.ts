import { couponBlock, type Coupon } from "@/lib/admin/email/coupon";
import { site } from "@/lib/site";

/**
 * The newsletter design: big Himalayan photo, a warm note, an optional offer
 * code, a row of featured trips and a clear button. Table-based and inline
 * styled for Gmail, Outlook and Apple Mail; photos are served as JPEG.
 */
export type NewsletterTrip = { slug: string; title: string; days: number; region: string | null; price: number | null; regular: number | null; image: string | null };

export type Newsletter = {
  preheader: string;
  heading: string;
  body: string;
  hero: string | null;
  heroAlt?: string;
  offer: Coupon | null;
  trips: NewsletterTrip[];
  button: string | null;
  buttonUrl: string | null;
  unsubscribeUrl: string;
};

const PINE = "#00788a";
const NIGHT = "#1f2527";
const INK = "#242a2c";
const MUTED = "#626b70";
const LINE = "#d8e3e6";
const MARIGOLD = "#f4b63f";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
/** Photo address for emails. `base` is empty for previews inside the admin, so they load from the admin itself. */
export const emailImage = (src: string, w: number, h?: number, base: string = site.url) => `${base}/email-image/?src=${encodeURIComponent(src)}&w=${w}${h ? `&h=${h}` : ""}`;
const track = (url: string) => {
  try {
    const u = new URL(url, site.url);
    if (u.hostname.endsWith("basecampadventure.com")) {
      u.searchParams.set("utm_source", "newsletter");
      u.searchParams.set("utm_medium", "email");
    }
    return u.toString();
  } catch {
    return url;
  }
};

function paragraphs(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const lines = para.split("\n");
      const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${INK}">$1</strong>`);
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px">${lines.map((l) => `<tr><td valign="top" style="padding:0 10px 8px 0;color:${PINE};font-size:16px;line-height:24px">&#9679;</td><td style="padding:0 0 8px;font-size:16px;line-height:24px;color:${INK}">${inline(l.replace(/^\s*[-•]\s+/, ""))}</td></tr>`).join("")}</table>`;
      }
      return `<p style="margin:0 0 18px;font-size:16px;line-height:26px;color:${INK}">${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

function button(label: string, href: string, tone: "pine" | "marigold" = "pine") {
  const bg = tone === "pine" ? PINE : MARIGOLD;
  const fg = tone === "pine" ? "#ffffff" : NIGHT;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 0"><tr><td align="center" bgcolor="${bg}" style="border-radius:999px"><a href="${esc(track(href))}" style="display:inline-block;padding:15px 34px;font-size:16px;font-weight:700;color:${fg};text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`;
}

function tripCard(t: NewsletterTrip, base: string) {
  const url = `${site.url}/trip/${t.slug}/`;
  const price = t.price ? `<span style="font-size:12px;color:${MUTED}">From</span> <strong style="font-size:18px;color:${INK}">${usd(t.price)}</strong>${t.regular && t.regular > t.price ? ` <span style="font-size:13px;color:${MUTED};text-decoration:line-through">${usd(t.regular)}</span>` : ""}` : `<span style="font-size:14px;color:${PINE};font-weight:700">Price on request</span>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:16px;border-collapse:separate;overflow:hidden;background:#ffffff">
${t.image ? `<tr><td><a href="${esc(track(url))}"><img src="${esc(emailImage(t.image, 800, 450, base))}" width="100%" alt="${esc(t.title)}" style="display:block;width:100%;height:auto;border:0;border-radius:16px 16px 0 0"></a></td></tr>` : ""}
<tr><td style="padding:16px 18px 18px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${PINE};font-weight:700">${t.days} days${t.region ? ` · ${esc(t.region)}` : ""}</p>
<p style="margin:0 0 10px;font-size:18px;line-height:24px;font-weight:700"><a href="${esc(track(url))}" style="color:${INK};text-decoration:none">${esc(t.title)}</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px">${price}</td><td align="right"><a href="${esc(track(url))}" style="font-size:14px;font-weight:700;color:${PINE};text-decoration:none">View trip &rarr;</a></td></tr></table>
</td></tr></table>`;
}

export function renderNewsletter(n: Newsletter, { base = site.url }: { base?: string } = {}): string {
  const logo = `${base}/brand/logo-512.png`;
  const trips = n.trips.slice(0, 4);
  const tripRows = trips.length
    ? `<tr><td style="padding:8px 32px 8px"><p style="margin:0 0 14px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${MUTED};font-weight:700">Handpicked for you</p></td></tr>
${trips.map((t) => `<tr><td style="padding:0 32px 16px">${tripCard(t, base)}</td></tr>`).join("\n")}`
    : "";
  const social = [
    ["Facebook", site.social.facebook],
    ["Instagram", site.social.instagram],
    ["Tripadvisor", site.social.tripadvisor],
    ["WhatsApp", `https://wa.me/${site.whatsapp}`],
  ]
    .map(([l, h]) => `<a href="${esc(h)}" style="color:#ffffff;text-decoration:none;font-weight:600">${l}</a>`)
    .join(`<span style="color:#5b6a6e">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(n.heading)}</title>
<style>@media (max-width:620px){.px{padding-left:20px!important;padding-right:20px!important}.h1{font-size:28px!important;line-height:34px!important}}</style></head>
<body style="margin:0;padding:0;background:#eef3f4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(n.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f4"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;border:1px solid ${LINE}"><tr>
<td style="padding:10px 18px"><a href="${esc(track(site.url + "/"))}"><img src="${logo}" width="96" alt="${esc(site.name)}" style="display:block;border:0;width:104px;height:auto"></a></td>
<td align="right" style="padding:10px 18px;font-size:13px"><a href="${esc(track(site.url + "/trip/"))}" style="color:${PINE};font-weight:700;text-decoration:none">All trips</a>&nbsp;&nbsp;<a href="${esc(track(site.url + "/contact-us/"))}" style="color:${PINE};font-weight:700;text-decoration:none">Contact</a></td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid ${LINE}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${n.hero ? `<tr><td><img src="${esc(emailImage(n.hero, 1200, 640, base))}" width="600" alt="${esc(n.heroAlt ?? "")}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:22px 22px 0 0"></td></tr>` : ""}
<tr><td class="px" style="padding:34px 40px 8px">
<h1 class="h1" style="margin:0 0 18px;font-size:32px;line-height:38px;font-weight:800;color:${INK};letter-spacing:-0.5px">${esc(n.heading)}</h1>
${paragraphs(n.body)}
</td></tr>
${n.offer ? `<tr><td class="px" style="padding:6px 40px 26px">${couponBlock(n.offer, { base, bg: "#ffffff" })}</td></tr>` : ""}
${n.button && n.buttonUrl ? `<tr><td align="center" style="padding:0 32px 30px">${button(n.button, n.buttonUrl, n.offer ? "marigold" : "pine")}</td></tr>` : ""}
${tripRows}
<tr><td class="px" style="padding:14px 40px 34px">
<p style="margin:0;font-size:16px;line-height:26px;color:${INK}">Namaste,<br><strong>${esc(site.contactPerson)}</strong> and the ${esc(site.name)} team</p>
<p style="margin:6px 0 0;font-size:13px;color:${MUTED}">Reply to this email or WhatsApp us on ${esc(site.mobile)}. A real person answers.</p>
</td></tr>
</table></td></tr>
<tr><td style="padding:20px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NIGHT};border-radius:22px"><tr><td align="center" style="padding:26px 24px;font-size:12px;line-height:20px;color:#93a2a7">
<p style="margin:0 0 12px;font-size:14px">${social}</p>
<p style="margin:0">${esc(site.legalName)} · ${esc(site.address.street)}, ${esc(site.address.city)}, Nepal<br>Licensed by Nepal Tourism Board · Member of TAAN and NMA · Since ${site.founded}</p>
<p style="margin:12px 0 0">You're receiving this because you subscribed on basecampadventure.com.<br><a href="${esc(n.unsubscribeUrl)}" style="color:#c5d1d4">Unsubscribe</a></p>
</td></tr></table></td></tr>
</table></td></tr></table></body></html>`;
}

export function newsletterText(n: Newsletter): string {
  const lines = [n.heading, "", n.body.replace(/\*\*/g, ""), ""];
  if (n.offer) lines.push(`${n.offer.amount} · ${n.offer.label}: code ${n.offer.code}`, `Book with this code: ${n.offer.bookUrl}`, "");
  if (n.button && n.buttonUrl) lines.push(`${n.button}: ${n.buttonUrl}`, "");
  for (const t of n.trips) lines.push(`${t.title} (${t.days} days)${t.price ? ` from ${usd(t.price)}` : ""}: ${site.url}/trip/${t.slug}/`);
  lines.push("", `Namaste, ${site.contactPerson} and the ${site.name} team`, "", `Unsubscribe: ${n.unsubscribeUrl}`);
  return lines.join("\n");
}
