/**
 * Technical launch check: the things Google, Bing and AI search engines care
 * about beyond each page's own tags (scripts/seo-audit.mjs covers those).
 *
 * Usage: node scripts/launch-check.mjs [base=http://localhost:3000] [--admin-host admin.localhost:3000]
 * Exit code 1 if anything fails.
 */
const args = process.argv.slice(2);
const BASE = (args.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN_HOST = args.includes("--admin-host") ? args[args.indexOf("--admin-host") + 1] : "admin.localhost:3000";
const SITE = "https://basecampadventure.com";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

let failed = 0;
const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push(["PASS", name, detail ?? ""]);
  } catch (e) {
    failed++;
    results.push(["FAIL", name, e.message]);
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const get = (path, init = {}) => fetch(path.startsWith("http") ? path : BASE + path, { redirect: "manual", ...init });
const html = async (path) => (await get(path)).text();
const canonicalOf = (h) => h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const ld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => { const j = JSON.parse(m[1]); return Array.isArray(j) ? j : j["@graph"] ?? [j]; });

const SAMPLE = ["/", "/trip/everest-base-camp-trek/", "/trip/annapurna-base-camp-trek/", "/best-time-to-go-trekking-in-nepal/", "/destinations/everest-region/", "/activities/trekking-in-nepal/", "/blogs/", "/about-us/", "/contact-us/", "/testimonials/"];

await check("robots.txt allows crawling and lists the sitemap", async () => {
  const r = await get("/robots.txt");
  const t = await r.text();
  assert(r.status === 200, `status ${r.status}`);
  assert(/Sitemap:\s*https:\/\/basecampadventure\.com\/sitemap\.xml/i.test(t), "no absolute Sitemap line");
  assert(!/Disallow:\s*\/\s*$/m.test(t), "disallows the whole site");
  assert(/Disallow:\s*\/api\//.test(t), "API not disallowed");
  assert(!/crawl-delay/i.test(t), "has a crawl-delay");
  return "AI crawlers (GPTBot, ClaudeBot, PerplexityBot…) allowed";
});

let sitemapUrls = [];
await check("sitemap.xml is valid, absolute https, with lastmod", async () => {
  const r = await get("/sitemap.xml");
  const t = await r.text();
  assert(r.status === 200 && /xml/.test(r.headers.get("content-type") ?? ""), `status ${r.status}`);
  sitemapUrls = [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(sitemapUrls.length > 300, `only ${sitemapUrls.length} URLs`);
  assert(sitemapUrls.every((u) => u.startsWith(`${SITE}/`)), "non-https or other-host URL in sitemap");
  assert(!sitemapUrls.some((u) => /admin|\/api\/|\/booking\/|thank-you/.test(u)), "private URL in sitemap");
  assert((t.match(/<lastmod>/g) ?? []).length > 300, "lastmod missing");
  const pages = sitemapUrls.filter((u) => !u.endsWith(".pdf"));
  assert(pages.every((u) => u.endsWith("/")), "URL without trailing slash");
  return `${sitemapUrls.length} URLs`;
});

await check("every sitemap page answers 200 (Googlebot)", async () => {
  const pages = sitemapUrls.filter((u) => !u.endsWith(".pdf")).map((u) => u.replace(SITE, ""));
  const bad = [];
  for (let i = 0; i < pages.length; i += 12) {
    await Promise.all(pages.slice(i, i + 12).map(async (p) => { const r = await get(p, { headers: { "User-Agent": GOOGLEBOT } }); if (r.status !== 200) bad.push(`${p} ${r.status}`); }));
  }
  assert(!bad.length, bad.slice(0, 5).join(", "));
  return `${pages.length} pages`;
});

await check("canonical on every sample page is its own absolute https URL", async () => {
  for (const p of SAMPLE) {
    const c = canonicalOf(await html(p));
    assert(c === `${SITE}${p}`, `${p} → ${c}`);
  }
  return `${SAMPLE.length} pages`;
});

await check("tracking parameters don't create duplicates (canonical drops ?utm…)", async () => {
  const c = canonicalOf(await html("/trip/everest-base-camp-trek/?utm_source=newsletter&utm_medium=email"));
  assert(c === `${SITE}/trip/everest-base-camp-trek/`, `canonical ${c}`);
});

await check("addresses without the trailing slash redirect permanently", async () => {
  const r = await get("/trip/everest-base-camp-trek");
  assert([301, 308].includes(r.status) && r.headers.get("location")?.endsWith("/trip/everest-base-camp-trek/"), `${r.status} ${r.headers.get("location")}`);
});

await check("missing pages return a real 404 (also to Googlebot)", async () => {
  for (const p of ["/trip/no-such-trip/", "/no-such-page/", "/destinations/nowhere/", "/category/nothing/"]) {
    const r = await get(p, { headers: { "User-Agent": GOOGLEBOT } });
    assert(r.status === 404, `${p} → ${r.status}`);
  }
  const h = await html("/no-such-page/");
  assert(/<meta name="robots" content="noindex/.test(h), "404 page not marked noindex");
});

await check("old WordPress addresses forward permanently", async () => {
  for (const [from, want] of [["/feed/", "/blogs/"], ["/wp-content/uploads/2018/07/abc.jpg", "/media/"]]) {
    const r = await get(from);
    assert([301, 308].includes(r.status), `${from} → ${r.status}`);
    assert((r.headers.get("location") ?? "").includes(want), `${from} → ${r.headers.get("location")}`);
  }
});

await check("the admin is invisible on the public site", async () => {
  const r = await get("/admin/");
  assert(r.status === 404, `/admin/ → ${r.status}`);
});

await check("the admin host tells search engines not to index it", async () => {
  // fetch() ignores a custom Host header, so this uses a plain HTTP request.
  const { request } = await import(BASE.startsWith("https") ? "node:https" : "node:http");
  const u = new URL(`${BASE}/login/`);
  const tag = await new Promise((resolve, reject) => {
    const r = request({ hostname: u.hostname, port: u.port, path: u.pathname, headers: { Host: ADMIN_HOST } }, (res) => { res.resume(); resolve(res.headers["x-robots-tag"] ?? ""); });
    r.on("error", reject);
    r.end();
  });
  assert(/noindex/.test(String(tag)), `X-Robots-Tag: ${tag}`);
});

await check("llms.txt and llms-full.txt for AI search", async () => {
  for (const p of ["/llms.txt", "/llms-full.txt"]) {
    const r = await get(p);
    const t = await r.text();
    assert(r.status === 200 && /text\/plain/.test(r.headers.get("content-type") ?? ""), `${p} ${r.status}`);
    assert(t.startsWith("# Base Camp Adventure"), `${p} heading`);
    assert(t.includes(`${SITE}/trip/everest-base-camp-trek/`), `${p} missing trip links`);
  }
  const t = await (await get("/llms.txt")).text();
  assert(/Tripadvisor/.test(t) && /Licensed/.test(t), "key facts missing");
  return `${(t.match(/\]\(https/g) ?? []).length} links`;
});

await check("IndexNow key file is published", async () => {
  const r = await get("/indexnow-key.txt");
  assert(r.status === 200 && /^[a-f0-9]{32}$/.test((await r.text()).trim()), `status ${r.status}`);
});

await check("security headers", async () => {
  const r = await get("/");
  for (const h of ["content-security-policy", "strict-transport-security", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"]) assert(r.headers.get(h), `missing ${h}`);
  assert(!r.headers.get("x-powered-by"), "X-Powered-By reveals the framework");
});

await check("pages are compressed", async () => {
  const r = await fetch(`${BASE}/`, { headers: { "Accept-Encoding": "gzip, br" } });
  assert(/gzip|br|zstd/.test(r.headers.get("content-encoding") ?? ""), `content-encoding: ${r.headers.get("content-encoding")}`);
});

await check("pages are pre-built and cached", async () => {
  for (const p of ["/", "/trip/everest-base-camp-trek/", "/best-time-to-go-trekking-in-nepal/"]) {
    await get(p);
    const r = await get(p);
    const cache = `${r.headers.get("x-nextjs-cache") ?? ""} ${r.headers.get("cache-control") ?? ""}`;
    assert(/HIT|s-maxage/.test(cache), `${p}: ${cache}`);
  }
});

await check("fast server response (static pages)", async () => {
  const times = [];
  for (const p of SAMPLE) {
    const t = performance.now();
    await (await get(p)).arrayBuffer();
    times.push(performance.now() - t);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  assert(avg < 250, `average ${avg.toFixed(0)} ms`);
  return `average ${avg.toFixed(0)} ms per page`;
});

await check("images served as modern formats with long caching", async () => {
  const r = await get("/_next/image/?url=%2Fphotos%2Fhero-ama-dablam.webp&w=1200&q=75", { headers: { Accept: "image/avif,image/webp,*/*" } });
  assert(r.status === 200 && /webp|avif/.test(r.headers.get("content-type") ?? ""), `${r.status} ${r.headers.get("content-type")}`);
  const m = await get("/media/2018/07/abc.webp");
  assert(/max-age=31536000/.test(m.headers.get("cache-control") ?? ""), `media cache: ${m.headers.get("cache-control")}`);
});

await check("html lang, viewport and a single H1 on sample pages", async () => {
  for (const p of SAMPLE) {
    const h = await html(p);
    assert(/<html lang="en"/.test(h), `${p} lang`);
    assert(/<meta name="viewport" content="[^"]*width=device-width/.test(h), `${p} viewport`);
    assert((h.match(/<h1[\s>]/g) ?? []).length === 1, `${p} has ${(h.match(/<h1[\s>]/g) ?? []).length} H1`);
  }
});

await check("no insecure (http://) resources", async () => {
  for (const p of SAMPLE) {
    const h = await html(p);
    const bad = h.match(/(?:src|href)="http:\/\/(?!localhost)[^"]+"/);
    assert(!bad, `${p}: ${bad?.[0]}`);
  }
});

await check("Open Graph image is an absolute https URL", async () => {
  for (const p of SAMPLE) {
    const og = (await html(p)).match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    assert(og?.startsWith("https://"), `${p}: ${og}`);
  }
});

await check("organisation details for Google (logo, phone, address, social profiles)", async () => {
  const org = ld(await html("/")).find((x) => [].concat(x["@type"]).some((t) => /TravelAgency|Organization|LocalBusiness/.test(t)));
  assert(org, "no organisation");
  for (const k of ["name", "url", "logo", "telephone", "address", "sameAs"]) assert(org[k], `missing ${k}`);
  return `${[].concat(org.sameAs).length} social profiles`;
});

await check("trip pages: TouristTrip, Product offer with price, breadcrumbs", async () => {
  const items = ld(await html("/trip/everest-base-camp-trek/"));
  const types = items.flatMap((x) => [].concat(x["@type"]));
  for (const t of ["TouristTrip", "BreadcrumbList"]) assert(types.includes(t), `missing ${t}`);
  const offer = items.find((x) => x.offers)?.offers;
  assert(offer && ([].concat(offer)[0].price || [].concat(offer)[0].lowPrice), "no priced offer");
});

await check("blog posts: BlogPosting with dates and author", async () => {
  const post = ld(await html("/best-time-to-go-trekking-in-nepal/")).find((x) => x["@type"] === "BlogPosting");
  assert(post?.datePublished && post?.author && post?.headline, "incomplete BlogPosting");
});

await check("favicon and app icons", async () => {
  for (const p of ["/icon.png", "/apple-icon.png"]) assert((await get(p)).status === 200, `${p} missing`);
});

await check("unique titles and descriptions across sample pages", async () => {
  const titles = new Set();
  const descs = new Set();
  for (const p of SAMPLE) {
    const h = await html(p);
    const t = h.match(/<title>([^<]+)<\/title>/)?.[1];
    const d = h.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert(t && !titles.has(t), `${p} title duplicate/missing`);
    assert(d && !descs.has(d), `${p} description duplicate/missing`);
    titles.add(t);
    descs.add(d);
  }
});

await check("no WordPress leftovers in titles", async () => {
  for (const p of ["/activities/trekking-in-nepal/", "/destinations/everest-region/", "/category/nepal-trekking/everest-trekking-guide/"]) {
    const t = (await html(p)).match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    assert(!/Archives/.test(t), `${p}: ${t}`);
  }
});

for (const [s, n, d] of results) console.log(`${s === "PASS" ? "✓" : "✗"} ${n}${d ? `  (${d})` : ""}`);
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
