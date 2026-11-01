import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, ButtonLink, Empty, PageHeader, Table, day, money } from "@/components/admin/ui";
import { collection } from "@/lib/admin/collections";
import { db } from "@/lib/admin/db";
import { can, requireUser } from "@/lib/admin/guards";
import { Reorder } from "./reorder";
import { RowActions } from "./row-actions";
import { getPath } from "@/lib/admin/paths";
import { site } from "@/lib/site";
import { RESERVED_PAGES } from "@/lib/reserved-pages";
import type { Prisma } from "@/generated/prisma/client";

const PER_PAGE = 40;
/** Lists the website shows in the office's own order. */
const ORDERED = new Set(["team", "videoReviews", "videos", "awards", "offers", "community", "destinations", "activities", "difficulty"]);

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }) {
  return { title: collection((await params).collection)?.label ?? "Content" };
}

export default async function ListPage({ params, searchParams }: { params: Promise<{ collection: string }>; searchParams: Promise<{ q?: string; status?: string; page?: string; order?: string }> }) {
  const { user } = await requireUser("content");
  const canPublish = can(user.role, "publish");
  const def = collection((await params).collection);
  if (!def) notFound();
  const { q = "", status = "", page = "1", order } = await searchParams;
  const ordering = Boolean(order) && ORDERED.has(def.key);
  const current = Math.max(1, Number(page) || 1);

  const where: Prisma.EntryWhereInput = {
    collection: def.key,
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase() } }] } : {}),
    ...(status === "draft" ? { status: "draft" } : status === "published" ? { status: "published" } : status === "changed" ? { dirty: true } : status === "archived" ? { status: "archived" } : { status: { not: "archived" } }),
  };
  const [rows, total, counts] = await Promise.all([
    db.entry.findMany({ where, orderBy: def.key === "posts" ? [{ createdAt: "desc" }] : [{ sort: "asc" }, { title: "asc" }], skip: (current - 1) * PER_PAGE, take: PER_PAGE, select: { id: true, title: true, slug: true, status: true, dirty: true, updatedAt: true, data: true } }),
    db.entry.count({ where }),
    db.entry.groupBy({ by: ["status"], where: { collection: def.key }, _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const pages = Math.ceil(total / PER_PAGE);
  const link = (p: Record<string, string>) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...p }).toString()}`;

  return (
    <>
      <PageHeader
        title={def.label}
        description={def.description}
        actions={
          <>
            {ORDERED.has(def.key) ? <ButtonLink variant="secondary" href={ordering ? `/c/${def.key}` : `/c/${def.key}?order=1`}>{ordering ? "Done" : "Change order"}</ButtonLink> : null}
            <ButtonLink href={`/c/${def.key}/new`}>+ New {def.singular}</ButtonLink>
          </>
        }
      />
      {ordering ? (
        <Reorder collection={def.key} rows={(await db.entry.findMany({ where: { collection: def.key, status: { not: "archived" } }, orderBy: [{ sort: "asc" }, { title: "asc" }], select: { id: true, title: true, status: true } }))} />
      ) : (
      <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex-1 min-w-56">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input name="q" defaultValue={q} placeholder={`Search ${def.label.toLowerCase()}…`} className="w-full rounded-full border border-line bg-card px-4 py-2 text-sm focus:border-pine focus:outline-none" />
        </form>
        <nav className="flex flex-wrap gap-1 text-sm" aria-label="Filter">
          {[
            ["", `All (${count("published") + count("draft")})`],
            ["published", `Live (${count("published")})`],
            ["draft", `Hidden & drafts (${count("draft")})`],
            ["changed", "Unpublished changes"],
            ["archived", `Archived (${count("archived")})`],
          ].map(([s, label]) => (
            <Link key={s} href={link({ status: s, page: "1" }).replace(/status=&?/, "")} className={`rounded-full px-3 py-1.5 font-medium ${status === s ? "bg-pine text-white" : "text-ink-soft hover:bg-pine/8"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {rows.length ? (
        <Table head={[def.titleField === "name" ? "Name" : "Title", ...(def.columns ?? []).map((c) => c.label), "Status", "Updated", "Actions"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="max-w-md">
                <Link href={`/c/${def.key}/${r.id}`} className="font-semibold text-ink hover:text-pine">{r.title}</Link>
                <p className="truncate font-mono text-xs text-muted">{def.url ? def.url.replace("{slug}", r.slug) : r.slug}</p>
                {def.key === "pages" && RESERVED_PAGES.has(r.slug) ? <p className="text-xs text-amber-700">Has its own designed page: only the SEO title and description are used.</p> : null}
              </td>
              {(def.columns ?? []).map((c) => {
                const v = getPath(r.data, c.name);
                return (
                  <td key={c.name} className="text-ink-soft whitespace-nowrap">
                    {v === null || v === undefined || v === "" ? "—" : c.kind === "money" ? money(Number(v)) : c.kind === "date" ? day(String(v)) : c.kind === "list" ? (v as string[]).slice(0, 2).join(", ") || "—" : c.kind === "bool" ? (v ? "Yes" : "No") : String(v)}
                  </td>
                );
              })}
              <td>
                {r.status === "published" ? (r.dirty ? <Badge tone="amber">Live · changes not published</Badge> : <Badge tone="green">Live</Badge>) : r.status === "draft" ? <Badge>Hidden / draft</Badge> : <Badge tone="gray">Archived</Badge>}
              </td>
              <td className="whitespace-nowrap text-ink-soft">{day(r.updatedAt)}</td>
              <td className="whitespace-nowrap sm:text-right">
                <span className="inline-flex flex-wrap items-center gap-1">
                  {def.url && r.status === "published" ? (
                    <a href={`${site.url}${def.url.replace("{slug}", r.slug)}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-2.5 py-1 text-xs font-semibold text-pine hover:bg-pine/8">View ↗</a>
                  ) : null}
                  {canPublish ? <RowActions collection={def.key} id={r.id} title={r.title} status={r.status} singular={def.singular} /> : null}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty title={q ? `Nothing matches "${q}".` : `No ${def.label.toLowerCase()} yet.`}>
          <Link href={`/c/${def.key}/new`} className="font-semibold text-pine">Create the first {def.singular}</Link>
        </Empty>
      )}

      {pages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
          <span className="text-muted">{total} {def.label.toLowerCase()} · page {current} of {pages}</span>
          <span className="flex gap-2">
            {current > 1 ? <Link className="rounded-full border border-line px-3 py-1.5 hover:border-pine" href={link({ page: String(current - 1) })}>← Previous</Link> : null}
            {current < pages ? <Link className="rounded-full border border-line px-3 py-1.5 hover:border-pine" href={link({ page: String(current + 1) })}>Next →</Link> : null}
          </span>
        </nav>
      ) : null}
      </>
      )}
    </>
  );
}
