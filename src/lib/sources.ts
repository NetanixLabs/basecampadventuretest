/**
 * Where visitors come from, in a few plain groups for the sales dashboard.
 * Worked out in the browser from the referring site and campaign tags, kept
 * in a session cookie only (gone when the browser closes, no personal data).
 */
export const SOURCES = ["Google", "Bing", "AI assistants", "Instagram", "Facebook", "YouTube", "Tripadvisor", "X / Twitter", "Email", "Agent", "Other websites", "Direct"] as const;
export type Source = (typeof SOURCES)[number];
export const isSource = (s: unknown): s is Source => typeof s === "string" && (SOURCES as readonly string[]).includes(s);

export function classify(referrer: string, params: URLSearchParams, ownHost: string): Source {
  const utm = (params.get("utm_source") ?? "").toLowerCase();
  const medium = (params.get("utm_medium") ?? "").toLowerCase();
  if (params.get("ref")) return "Agent";
  if (medium === "email" || /newsletter|mail/.test(utm)) return "Email";
  const host = (() => {
    try {
      return referrer ? new URL(referrer).hostname.toLowerCase() : "";
    } catch {
      return "";
    }
  })();
  const s = `${utm} ${host}`;
  if (/(^|\.| )google\./.test(s) || utm === "google") return "Google";
  if (/bing\.|duckduckgo|yahoo\.|ecosia/.test(s)) return "Bing";
  if (/chatgpt|openai|perplexity|claude\.ai|gemini|copilot/.test(s)) return "AI assistants";
  if (/instagram|ig\b/.test(s)) return "Instagram";
  if (/facebook|fb\.|messenger/.test(s)) return "Facebook";
  if (/youtube|youtu\.be/.test(s)) return "YouTube";
  if (/tripadvisor/.test(s)) return "Tripadvisor";
  if (/(^|\.| )(t\.co|x\.com|twitter)/.test(s)) return "X / Twitter";
  if (host && host !== ownHost && !host.endsWith(`.${ownHost.replace(/^www\./, "")}`)) return "Other websites";
  return utm ? "Other websites" : "Direct";
}

/** The source cookie as sent with a request (booking, enquiry). */
export function sourceFromCookie(cookie: string | null): Source | null {
  const v = /(?:^|;\s*)bca_src=([^;]+)/.exec(cookie ?? "")?.[1];
  const s = v ? decodeURIComponent(v) : null;
  return isSource(s) ? s : null;
}
