import "server-only";
import sanitizeHtml from "sanitize-html";
import type { TocItem } from "@/lib/types";

/**
 * Cleans text that comes out of the editor before it is saved: only the
 * markup a page needs, no scripts, no inline styles, YouTube embeds only.
 * Headings get stable ids so the table of contents can link to them.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "sup", "sub", "a", "ul", "ol", "li", "blockquote",
    "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td", "span", "div", "iframe", "code", "pre", "mark",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading", "decoding", "title"],
    iframe: ["src", "title", "allow", "allowfullscreen", "width", "height", "frameborder"],
    span: ["class", "data-meters"],
    div: ["class", "data-youtube-video"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    figure: ["class"],
    "*": [],
  },
  allowedClasses: { span: ["measurement"], div: ["table-wrap", "video"], figure: ["wp-block-image", "wide"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  allowedIframeHostnames: ["www.youtube-nocookie.com", "www.youtube.com", "player.vimeo.com"],
  transformTags: {
    a: (tag, attribs) => {
      const external = /^https?:\/\//.test(attribs.href ?? "") && !/^https?:\/\/(www\.)?basecampadventure\.com/.test(attribs.href ?? "");
      return { tagName: "a", attribs: external ? { ...attribs, target: "_blank", rel: "noopener noreferrer" } : { ...attribs, target: "", rel: "" } };
    },
    img: (tag, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
  },
  exclusiveFilter: (frame) => (frame.tag === "p" || frame.tag === "span") && !frame.text.trim() && !frame.mediaChildren?.length,
};

export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** Clean HTML plus a table of contents built from its h2/h3 headings. */
export function cleanHtml(raw: string): { html: string; toc: TocItem[] } {
  let html = sanitizeHtml(raw ?? "", OPTIONS);
  const toc: TocItem[] = [];
  const used = new Set<string>();
  html = html.replace(/<h([234])(?:\s+id="([^"]*)")?>([\s\S]*?)<\/h\1>/g, (_m, level: string, id: string | undefined, inner: string) => {
    const label = text(inner);
    let base = id || slugify(label) || "section";
    let unique = base;
    for (let i = 2; used.has(unique); i++) unique = `${base}-${i}`;
    used.add(unique);
    base = unique;
    if (level !== "4" && label) toc.push({ id: base, text: label, level: Number(level) });
    return `<h${level} id="${base}">${inner}</h${level}>`;
  });
  return { html, toc };
}

export const readingMinutes = (html: string) => Math.max(1, Math.round(text(html).split(" ").length / 220));

export const plain = text;
