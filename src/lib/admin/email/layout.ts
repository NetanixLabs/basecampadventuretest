import { ensureCompany } from "@/lib/company";
import { site } from "@/lib/site";

/**
 * The one look every email shares: logo, a white card, the office's details
 * at the bottom. Table-based and inline-styled so it renders the same in
 * Gmail, Outlook and Apple Mail, in light and dark mode.
 */
export type EmailBlock =
  | { kind: "text"; text: string }
  | { kind: "button"; label: string; href: string }
  | { kind: "details"; rows: [string, string][] }
  | { kind: "note"; text: string }
  | { kind: "code"; text: string };

export type EmailContent = { preview: string; heading: string; blocks: EmailBlock[]; unsubscribeUrl?: string };

const PINE = "#00788a";
const INK = "#242a2c";
const MUTED = "#626b70";
const LINE = "#d8e3e6";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Office-written text: blank lines make paragraphs, "- " makes a list, **bold** works. */
function richText(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const lines = para.split("\n");
      const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        return `<ul style="margin:0 0 16px;padding-left:20px;color:${INK}">${lines.map((l) => `<li style="margin:0 0 6px">${inline(l.replace(/^\s*[-•]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p style="margin:0 0 16px;color:${INK}">${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

function block(b: EmailBlock): string {
  switch (b.kind) {
    case "text":
      return richText(b.text);
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:${PINE}"><a href="${esc(b.href)}" style="display:inline-block;padding:14px 28px;font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;border-radius:999px">${esc(b.label)}</a></td></tr></table>`;
    case "details":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${LINE};border-radius:12px;border-collapse:separate;overflow:hidden">${b.rows
        .map(
          ([k, v], i) =>
            `<tr><td style="padding:10px 14px;font-size:13px;color:${MUTED};width:40%;${i ? `border-top:1px solid ${LINE};` : ""}">${esc(k)}</td><td style="padding:10px 14px;font-size:14px;font-weight:600;color:${INK};${i ? `border-top:1px solid ${LINE};` : ""}">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`;
    case "note":
      return `<p style="margin:0 0 16px;padding:12px 14px;background:#eef6f7;border-radius:10px;font-size:13px;color:${MUTED}">${esc(b.text)}</p>`;
    case "code":
      return `<p style="margin:0 0 20px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;letter-spacing:3px;font-weight:700;color:${INK}">${esc(b.text)}</p>`;
  }
}

export function renderHtml(c: EmailContent, { base = site.url }: { base?: string } = {}): string {
  ensureCompany();
  const logo = `${base}/brand/logo-512.png`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f7f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7f8"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td align="center" style="padding:0 0 20px"><a href="${site.url}/"><img src="${logo}" width="120" alt="${esc(site.name)}" style="display:block;border:0;width:120px;height:auto"></a></td></tr>
<tr><td style="background:#ffffff;border-radius:18px;padding:36px 32px;border:1px solid ${LINE}">
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;color:${INK}">${esc(c.heading)}</h1>
${c.blocks.map(block).join("\n")}
<p style="margin:24px 0 0;color:${INK}">Warm regards,<br><strong>The ${esc(site.name)} team</strong></p>
</td></tr>
<tr><td align="center" style="padding:24px 8px;font-size:12px;line-height:1.6;color:${MUTED}">
${esc(site.legalName)} · ${esc(site.address.street)}, ${esc(site.address.city)}, Nepal<br>
<a href="tel:${esc(site.phone)}" style="color:${MUTED}">${esc(site.phone)}</a> · <a href="https://wa.me/${site.whatsapp}" style="color:${MUTED}">WhatsApp ${esc(site.mobile)}</a> · <a href="mailto:${site.email}" style="color:${MUTED}">${site.email}</a><br>
Licensed by Nepal Tourism Board · TAAN ${esc(site.registration.find((r) => r.label === "TAAN")?.value ?? "")}
${c.unsubscribeUrl ? `<br><br><a href="${esc(c.unsubscribeUrl)}" style="color:${MUTED}">Unsubscribe</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

export function renderText(c: EmailContent): string {
  const lines = [c.heading, ""];
  for (const b of c.blocks) {
    if (b.kind === "text" || b.kind === "note" || b.kind === "code") lines.push(b.text.replace(/\*\*/g, ""), "");
    if (b.kind === "button") lines.push(`${b.label}: ${b.href}`, "");
    if (b.kind === "details") lines.push(...b.rows.map(([k, v]) => `${k}: ${v}`), "");
  }
  lines.push(`Warm regards,`, `The ${site.name} team`, `${site.phone} · ${site.email}`);
  if (c.unsubscribeUrl) lines.push("", `Unsubscribe: ${c.unsubscribeUrl}`);
  return lines.join("\n");
}
