import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { db } from "@/lib/admin/db";
import { site } from "@/lib/site";

/**
 * Backlinks: pages on other websites that link to us.
 *
 * A check opens the other page the way a browser would and looks for a link
 * to our site: is it still there, which of our pages does it point to, with
 * what words, and does it pass ranking value (no rel="nofollow")?
 *
 * Only public websites are opened: addresses that lead to this server or a
 * private network are refused, so the checker can't be used to look inside.
 */

export type Check = { status: "live" | "nofollow" | "missing" | "error"; target: string | null; anchor: string | null; rel: string | null; error: string | null };

const OUR_HOSTS = new Set(["basecampadventure.com", "www.basecampadventure.com", new URL(site.url).hostname.toLowerCase()]);
const MAX_BYTES = 3 * 1024 * 1024;
/** Lets the checker open local test pages. Development only: ignored in production. */
const ALLOW_LOCAL = process.env.BACKLINK_CHECK_ALLOW_LOCAL === "true" && process.env.NODE_ENV !== "production";

function privateAddress(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("::ffff:");
}

async function assertPublic(u: URL) {
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Only http and https pages can be checked.");
  if (u.port && !["80", "443"].includes(u.port) && !ALLOW_LOCAL) throw new Error("Only normal web addresses can be checked.");
  if (ALLOW_LOCAL) return; // local testing only
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (!ips.length || ips.some(privateAddress)) throw new Error("That address isn't a public website.");
}

/** Opens a page (following up to 4 redirects, each checked), returning its final address and HTML. */
async function fetchPage(start: string): Promise<{ url: string; html: string }> {
  let url = new URL(start);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkCheck/1.0)", Accept: "text/html,application/xhtml+xml" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location")!, url);
        continue;
      }
      if (!res.ok) throw new Error(`The page answered ${res.status}${res.status === 404 ? " (not found)" : ""}.`);
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        chunks.push(value);
        if (size > MAX_BYTES) { await reader.cancel(); break; }
      }
      return { url: url.toString(), html: Buffer.concat(chunks).toString("utf8") };
    } catch (e) {
      throw new Error(explain(e));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects.");
}

/** Network errors in words the office understands. */
function explain(e: unknown): string {
  const err = e as Error & { cause?: { code?: string } };
  if (err.name === "AbortError") return "The page took too long to answer.";
  const code = err.cause?.code ?? "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "That website can't be found (the domain may have expired).";
  if (code === "ECONNREFUSED" || code === "ECONNRESET") return "The website refused the connection.";
  if (/CERT|SSL|TLS/i.test(code) || /certificate|ssl|tls/i.test(err.cause ? String(err.cause) : "")) return "The website's security certificate isn't valid.";
  return err.message === "fetch failed" ? "Couldn't connect to the website." : err.message;
}

const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const attr = (tag: string, name: string) => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)?.slice(1).find((x) => x !== undefined) ?? null;

/** Looks for links to our site on another website's page. */
export async function checkBacklink(sourceUrl: string): Promise<Check> {
  try {
    const { url, html } = await fetchPage(sourceUrl);
    const links: { target: string; anchor: string; rel: string | null }[] = [];
    for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = attr(m[1], "href");
      if (!href) continue;
      let to: URL;
      try { to = new URL(href.replace(/&amp;/g, "&"), url); } catch { continue; }
      if (!OUR_HOSTS.has(to.hostname.toLowerCase())) continue;
      const img = /<img\b[^>]*>/i.exec(m[2]);
      links.push({ target: to.pathname || "/", anchor: (strip(m[2]) || (img ? `[image: ${attr(img[0], "alt") ?? ""}]` : "")).slice(0, 200), rel: attr(m[1], "rel")?.toLowerCase() ?? null });
    }
    if (!links.length) return { status: "missing", target: null, anchor: null, rel: null, error: null };
    const passes = (l: (typeof links)[number]) => !/\b(nofollow|sponsored|ugc)\b/.test(l.rel ?? "");
    const best = links.find(passes) ?? links[0];
    return { status: passes(best) ? "live" : "nofollow", target: best.target, anchor: best.anchor || null, rel: best.rel, error: null };
  } catch (e) {
    return { status: "error", target: null, anchor: null, rel: null, error: (e as Error).message.slice(0, 200) };
  }
}

/** Checks one saved backlink and stores the result. */
export async function recheck(id: string) {
  const b = await db.backlink.findUnique({ where: { id } });
  if (!b) return null;
  const r = await checkBacklink(b.sourceUrl);
  return db.backlink.update({ where: { id }, data: { status: r.status, target: r.target ?? b.target, anchor: r.anchor ?? b.anchor, rel: r.rel, lastError: r.error, lastChecked: new Date() } });
}

/** For the scheduled jobs: re-checks the backlinks not checked for a week, a few at a time. */
export async function recheckDue(limit = 5) {
  const due = await db.backlink.findMany({ where: { OR: [{ lastChecked: null }, { lastChecked: { lt: new Date(Date.now() - 7 * 86400_000) } }] }, orderBy: { lastChecked: { sort: "asc", nulls: "first" } }, take: limit, select: { id: true } });
  for (const d of due) await recheck(d.id);
  return due.length;
}

/** Normalises a pasted address: adds https://, drops tracking parameters and #fragments. */
export function cleanUrl(raw: string): string | null {
  const s = raw.trim().replace(/^["'<(]+|[)>"',;]+$/g, "");
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!u.hostname.includes(".") || OUR_HOSTS.has(u.hostname.toLowerCase())) return null;
    u.hash = "";
    [...u.searchParams.keys()].filter((k) => /^(utm_|fbclid|gclid)/i.test(k)).forEach((k) => u.searchParams.delete(k));
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}
