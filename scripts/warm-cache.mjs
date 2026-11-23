/**
 * Prepares the resized photos for every page, so the first visitors after a
 * deploy don't wait for them. Only sizes not made yet cost any work.
 * Gentle: one page at a time. deploy.sh runs it in the background with low priority.
 *
 * Usage: node scripts/warm-cache.mjs [base=http://127.0.0.1:3000]
 */
const BASE = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const t0 = Date.now();
const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
const pages = [...sm.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]).filter((p) => !p.endsWith(".pdf"));
const seen = new Set();
for (const p of pages) {
  try {
    const html = await (await fetch(BASE + p)).text();
    for (const u of html.matchAll(/\/_next\/image\/?\?url=[^"'\s]+/g)) {
      const url = u[0].replace(/&amp;/g, "&");
      if (seen.has(url)) continue;
      seen.add(url);
      await (await fetch(BASE + url, { headers: { accept: "image/webp" } })).arrayBuffer();
    }
  } catch {
    /* skip a page that fails; the next deploy tries again */
  }
}
console.log(`warm-cache: ${pages.length} pages, ${seen.size} photo sizes, ${Math.round((Date.now() - t0) / 1000)} s`);
