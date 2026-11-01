import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, PageHeader } from "@/components/admin/ui";
import { COLLECTIONS, SINGLETONS } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";

export const metadata = { title: "More content" };

const MAIN = new Set(["trips", "posts", "pages", "destinations", "activities", "offers", "team", "videoReviews", "videos", "awards"]);

export default async function MorePage() {
  await requireUser("content");
  const counts = await db.entry.groupBy({ by: ["collection"], _count: true });
  const count = (k: string) => counts.find((c) => c.collection === k)?._count ?? 0;
  const rest = COLLECTIONS.filter((c) => !MAIN.has(c.key));
  return (
    <>
      <PageHeader title="More content" description="Everything else on the website: menus, homepage rows, categories, the About page and more." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Pages & site parts" description="One-off content. Saving publishes straight away.">
          <ul className="divide-y divide-line">
            {SINGLETONS.map((s) => (
              <li key={s.key}>
                <Link href={`/singles/${s.key}`} className="flex items-center justify-between gap-3 py-3 hover:text-pine">
                  <span><span className="block text-sm font-semibold">{s.label}</span><span className="block text-xs text-muted">{s.description}</span></span>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Lists & labels" description="Blog categories and tags, difficulty levels, community work…">
          <ul className="divide-y divide-line">
            {rest.map((c) => (
              <li key={c.key}>
                <Link href={`/c/${c.key}`} className="flex items-center justify-between gap-3 py-3 hover:text-pine">
                  <span className="text-sm font-semibold">{c.label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">{count(c.key)} <ArrowRight className="size-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
