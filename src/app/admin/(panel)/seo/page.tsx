import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { RESERVED_PAGES } from "@/lib/reserved-pages";
import { fullTitle } from "@/lib/seo";

export const metadata = { title: "SEO health" };

type Issue = { id: string; collection: string; title: string; problems: { text: string; level: "high" | "medium" | "low" }[] };
const words = (html: string) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

export default async function SeoHealth() {
  await requireUser("content");
  const entries = await db.entry.findMany({ where: { status: "published", collection: { in: ["trips", "posts", "pages", "destinations", "activities", "categories"] } }, select: { id: true, collection: true, title: true, live: true } });
  const titleCount = new Map<string, number>();
  // Exactly what the website puts in <title> (src/lib/seo.ts).
  const effTitle = (d: Record<string, unknown>) => fullTitle(((d.seo ?? {}) as { title?: string | null }).title, String(d.title ?? d.name ?? ""));
  entries.forEach((e) => { const t = effTitle(e.live as Record<string, unknown>).toLowerCase(); titleCount.set(t, (titleCount.get(t) ?? 0) + 1); });
  const year = new Date().getFullYear();

  const issues: Issue[] = [];
  for (const e of entries) {
    if (e.collection === "pages" && RESERVED_PAGES.has(String((e.live as { slug?: string }).slug))) continue;
    const d = e.live as Record<string, unknown>;
    const seo = (d.seo ?? {}) as { title?: string | null; description?: string | null; noindex?: boolean };
    const p: Issue["problems"] = [];
    const t = effTitle(d);
    if (t.length > 65) p.push({ text: `Title is ${t.length} characters; Google shows about 60`, level: "medium" });
    if (/Archives/i.test(t)) p.push({ text: "Title still says \"Archives\" (left over from WordPress)", level: "high" });
    if (titleCount.get(t.toLowerCase())! > 1) p.push({ text: "Same title as another page", level: "high" });
    if (!seo.description && !d.summary && !d.excerpt) p.push({ text: "No description for Google", level: "high" });
    else if (seo.description && (seo.description.length > 170 || seo.description.length < 70)) p.push({ text: `Description is ${seo.description.length} characters (aim for 120–160)`, level: "low" });
    const old = String(seo.title ?? d.title ?? "").match(/\b(20[12]\d)\b/);
    if (old && Number(old[1]) < year - 1) p.push({ text: `Mentions ${old[1]}: looks out of date`, level: "medium" });
    if (seo.noindex) p.push({ text: "Hidden from Google (noindex)", level: "low" });
    const cover = d.cover as { alt?: string } | null;
    if (["trips", "posts"].includes(e.collection) && !cover) p.push({ text: "No main photo", level: "medium" });
    else if (cover && !cover.alt) p.push({ text: "Main photo has no description (alt text)", level: "low" });
    const body = String(d.html ?? d.overview ?? d.description ?? "");
    if (["posts", "pages"].includes(e.collection) && words(body) < 300) p.push({ text: `Only ${words(body)} words: thin content`, level: "medium" });
    if (e.collection === "trips") {
      if (!d.price) p.push({ text: "No price (Google can't show it, and online booking is off)", level: "medium" });
      if (!d.difficulty) p.push({ text: "No difficulty level", level: "low" });
      if (!(d.faqs as unknown[])?.length) p.push({ text: "No FAQs (they can appear in Google results)", level: "low" });
    }
    if (p.length) issues.push({ id: e.id, collection: e.collection, title: e.title, problems: p });
  }
  const score = (lvl: string) => issues.reduce((n, i) => n + i.problems.filter((x) => x.level === lvl).length, 0);
  const health = Math.max(0, Math.round(100 - (score("high") * 3 + score("medium") * 1 + score("low") * 0.25) / Math.max(1, entries.length) * 20));
  issues.sort((a, b) => b.problems.filter((x) => x.level === "high").length - a.problems.filter((x) => x.level === "high").length || b.problems.length - a.problems.length);

  return (
    <>
      <PageHeader title="SEO health" description="Checks every live page the way Google reads it. Fix the red ones first." />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Health" value={`${health}%`} hint={`${entries.length} live pages checked`} />
        <Stat label="Important" value={score("high")} hint="duplicate titles, missing descriptions" />
        <Stat label="Worth fixing" value={score("medium")} hint="long titles, thin pages, old years" />
        <Stat label="Nice to have" value={score("low")} hint="alt text, FAQs, difficulty" />
      </div>
      <Card className="mt-6" title={`${issues.length} pages to improve`}>
        <ul className="divide-y divide-line">
          {issues.slice(0, 150).map((i) => (
            <li key={i.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/c/${i.collection}/${i.id}`} className="font-semibold hover:text-pine">{i.title}</Link>
                <span className="text-xs text-muted">{i.collection}</span>
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">{i.problems.map((p) => <li key={p.text}><Badge tone={p.level === "high" ? "red" : p.level === "medium" ? "amber" : "gray"}>{p.text}</Badge></li>)}</ul>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
