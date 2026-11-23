import { readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Redirects made in the admin, read straight from the published file so they
 * work for any address, including ones no page route matches
 * (e.g. /2019/05/old-post/ that another website still links to).
 * Re-read only when the file changes.
 */
type Rule = { to: string; permanent: boolean };
let cache: { file: string; mtime: number; map: Map<string, Rule> } | null = null;

function rules(): Map<string, Rule> {
  const file = path.join(/*turbopackIgnore: true*/ process.env.CONTENT_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".storage", "content"), "redirects.json");
  let mtime = 0;
  try {
    mtime = statSync(/*turbopackIgnore: true*/ file).mtimeMs;
  } catch {
    return new Map();
  }
  if (cache && cache.file === file && cache.mtime === mtime) return cache.map;
  const map = new Map<string, Rule>();
  try {
    for (const r of JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as { from: string; to: string; permanent: boolean }[]) {
      if (r.from && r.to) map.set(r.from.toLowerCase(), { to: r.to, permanent: r.permanent !== false });
    }
  } catch {
    /* a half-written file is never seen (writes are atomic); anything else: no redirects */
  }
  cache = { file, mtime, map };
  return map;
}

export function adminRedirect(pathname: string): Rule | null {
  const m = rules();
  if (!m.size) return null;
  const p = pathname.toLowerCase();
  return m.get(p) ?? m.get(p.endsWith("/") ? p.slice(0, -1) : `${p}/`) ?? null;
}
