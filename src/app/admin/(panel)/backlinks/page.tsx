import Link from "next/link";
import { headers } from "next/headers";
import { Badge, Card, PageHeader, Stat } from "@/components/admin/ui";
import { COLLECTIONS } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { site } from "@/lib/site";
import { suggester } from "@/lib/admin/suggest";
import { BacklinkList, AddBacklinks, CheckAll, MissingList } from "./ui";

export const metadata = { title: "Backlinks & broken links" };

export default async function BacklinksPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireUser("content");
  const tab = (await searchParams).tab ?? "missing";
  const [missing, backlinks, referrals, statusCounts, entries] = await Promise.all([
    db.missingPage.findMany({ where: { ignored: false }, orderBy: [{ hits: "desc" }, { lastSeen: "desc" }], take: 200 }),
    db.backlink.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 500 }),
    db.referral.findMany({ orderBy: { visits: "desc" }, take: 300 }),
    db.backlink.groupBy({ by: ["status"], _count: true }),
    db.entry.findMany({ where: { status: "published" }, select: { collection: true, slug: true, title: true } }),
  ]);
  const pages = entries.flatMap((e) => { const def = COLLECTIONS.find((c) => c.key === e.collection); return def?.url ? [{ path: def.url.replace("{slug}", e.slug), title: e.title }] : []; });
  const suggest = suggester(pages);
  const count = (s: string) => statusCounts.find((c) => c.status === s)?._count ?? 0;
  const domains = new Map<string, { visits: number; pages: { path: string; visits: number }[]; lastSeen: Date }>();
  for (const r of referrals) {
    const d = domains.get(r.domain) ?? { visits: 0, pages: [], lastSeen: r.lastSeen };
    d.visits += r.visits; d.pages.push({ path: r.path, visits: r.visits }); if (r.lastSeen > d.lastSeen) d.lastSeen = r.lastSeen;
    domains.set(r.domain, d);
  }
  const sites = [...domains.entries()].sort((a, b) => b[1].visits - a[1].visits);
  // Our own addresses: the live domain, plus the public site this admin belongs to (admin.X → X).
  const ownHosts = [...new Set(["basecampadventure.com", new URL(site.url).host, ((await headers()).get("host") ?? "").replace(/^admin\./, "")].filter(Boolean))];
  const isOwn = (u: string) => { try { const h = new URL(u).host.replace(/^www\./, ""); return ownHosts.some((o) => o.replace(/^www\./, "") === h); } catch { return false; } };
  const lost = missing.reduce((n, m) => n + Object.keys((m.referrers as Record<string, number>) ?? {}).filter((u) => !isOwn(u)).length, 0);

  const tabs = [
    ["missing", `Broken addresses (${missing.length})`],
    ["backlinks", `Backlinks (${backlinks.length})`],
    ["referrals", `Sites sending visitors (${sites.length})`],
  ] as const;

  return (
    <>
      <PageHeader
        title="Backlinks & broken links"
        description="Links from other websites are one of the strongest signals Google uses. Keep them working, and keep track of who links to you."
        info="Broken addresses: someone opened an address on the site that doesn't exist, often from an old link on another website. Fix each with a redirect to the right page, and the link keeps its value for Google. Backlinks: pages on other websites that link to you; each is checked every week. Sites sending visitors: websites people came from, counted automatically without storing anything personal."
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Broken addresses" value={missing.length} hint={lost ? `${lost} linked from other websites` : "visitors who hit a dead end"} href="/backlinks?tab=missing" />
        <Stat label="Backlinks passing value" value={count("live")} hint={`${count("nofollow")} more marked nofollow`} href="/backlinks?tab=backlinks" />
        <Stat label="Backlinks lost" value={count("missing") + count("error")} hint="the page no longer links, or is gone" href="/backlinks?tab=backlinks" />
        <Stat label="Sites sending visitors" value={sites.length} hint={`${sites.reduce((n, [, d]) => n + d.visits, 0).toLocaleString()} visits`} href="/backlinks?tab=referrals" />
      </div>

      <nav className="mt-6 mb-4 flex flex-wrap gap-1 text-sm" aria-label="Sections">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/backlinks?tab=${k}`} className={`rounded-full px-4 py-2 font-semibold ${tab === k ? "bg-pine text-white" : "border border-line bg-card text-ink-soft hover:border-pine"}`}>{label}</Link>
        ))}
      </nav>

      {tab === "missing" ? (
        <Card title="Addresses that showed “not found”" description="Most visited first. Fix the ones linked from other websites first: each is a backlink that's currently wasted." info="Pick the page each address should go to (a suggestion is filled in when one looks right) and press Fix. It becomes a permanent redirect, which passes the link's value to the new page. Ignore the ones that don't matter, like typing mistakes.">
          <MissingList rows={missing.map((m) => ({ path: m.path, hits: m.hits, lastSeen: m.lastSeen.toISOString(), referrers: Object.entries((m.referrers as Record<string, number>) ?? {}).sort((a, b) => b[1] - a[1]).map(([url, n]) => ({ url, n, own: isOwn(url) })), suggestion: suggest(m.path) }))} />
        </Card>
      ) : tab === "backlinks" ? (
        <div className="space-y-6">
          <Card title="Add backlinks" description="Paste the addresses of pages on other websites that link to you, one per line. Good places to find them: Google Search Console → Links → Top linking sites, partner and association pages, travel blogs, directories.">
            <AddBacklinks />
          </Card>
          <Card title="Your backlinks" description="Each one is checked every week: is the link still there, which page it points to, with what words, and whether it passes value." actions={backlinks.length ? <CheckAll /> : null}>
            <BacklinkList rows={backlinks.map((b) => ({ id: b.id, sourceUrl: b.sourceUrl, target: b.target, anchor: b.anchor, status: b.status, rel: b.rel, note: b.note, lastChecked: b.lastChecked?.toISOString() ?? null, lastError: b.lastError }))} siteUrl={site.url} />
          </Card>
        </div>
      ) : (
        <Card title="Websites that sent visitors" description="Counted from each visit's first page. Only the website's name and the page they landed on are kept.">
          {sites.length ? (
            <ul className="divide-y divide-line">
              {sites.map(([domain, d]) => (
                <li key={domain} className="flex flex-wrap items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <a href={`https://${domain}/`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-pine">{domain} ↗</a>
                    <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted">
                      Landed on {d.pages.sort((a, b) => b.visits - a.visits).slice(0, 4).map((p) => <Badge key={p.path}><span className="font-mono">{p.path}</span> · {p.visits}</Badge>)}
                    </p>
                  </div>
                  <span className="text-right text-sm"><span className="font-bold tabular-nums">{d.visits.toLocaleString()}</span> <span className="text-muted">visits</span></span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nothing yet. Websites appear here as soon as someone arrives from them.</p>}
        </Card>
      )}
    </>
  );
}
