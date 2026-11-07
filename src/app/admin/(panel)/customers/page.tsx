import Link from "next/link";
import { Download } from "lucide-react";
import { Badge, ButtonLink, Empty, PageHeader, Table, day, money } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { SEGMENTS, customerStats, emailsIn, isSegment } from "@/lib/server/segments";
import { ImportButton } from "./import-button";

export const metadata = { title: "Customers" };
const TONE = { travelled: "gray", repeat: "blue", vip: "amber", upcoming: "green" } as const;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; seg?: string }> }) {
  await requireUser("customers");
  const { q = "", tag = "", seg = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const segment = isSegment(seg) ? seg : null;
  const [all, tagRows, total, emails] = await Promise.all([customerStats(), db.customer.findMany({ where: { NOT: { tags: { isEmpty: true } } }, select: { tags: true } }), db.customer.count(), db.customer.findMany({ select: { email: true } })]);
  const known = new Set(emails.map((e) => e.email.toLowerCase()));
  const inSeg = segment ? await emailsIn(segment) : null;
  const rows = await db.customer.findMany({
    where: {
      ...(term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }, { country: { contains: term, mode: "insensitive" } }] } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(inSeg ? { email: { in: inSeg } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  const counts = Object.fromEntries(Object.keys(SEGMENTS).map((k) => [k, [...all.entries()].filter(([e, s]) => known.has(e) && s.segments.includes(k as keyof typeof SEGMENTS)).length]));
  const tags = [...tagRows.flatMap((r) => r.tags).reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 16);
  const link = (p: { seg?: string; tag?: string }) => `/customers?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(p.seg ? { seg: p.seg } : {}), ...(p.tag ? { tag: p.tag } : {}) })}`;
  const exportHref = `/api/customers.csv?${new URLSearchParams({ ...(segment ? { seg: segment } : {}), ...(tag ? { tag } : {}), ...(term ? { q: term } : {}) })}`;
  return (
    <>
      <PageHeader title="Customers" description={`${total} travellers and contacts.`} actions={<div className="flex flex-wrap gap-2"><a href={exportHref} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold hover:border-pine hover:text-pine"><Download className="size-4" aria-hidden />Download list</a><ImportButton /><ButtonLink href="/customers/new">Add customer</ButtonLink></div>} info="Everyone who books or sends an enquiry is added automatically, matched by email. The groups at the top are worked out from bookings with a payment: past travellers, repeat travellers (2+ trips), VIP (3+ trips or US$5,000+ paid) and those with a trip coming up. Add your own tags on a customer (e.g. Photographer, Family, German agent). 'Download list' gives the current selection as a spreadsheet, with whether each person subscribed to the newsletter, for sending offers to past travellers." />
      <nav aria-label="Groups" className="mb-3 flex flex-wrap gap-2">
        <Link href={link({ tag })} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${!segment ? "border-pine bg-pine text-white" : "border-line bg-card hover:border-pine hover:text-pine"}`}>Everyone</Link>
        {Object.entries(SEGMENTS).map(([k, label]) => <Link key={k} href={link({ seg: k, tag })} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${segment === k ? "border-pine bg-pine text-white" : "border-line bg-card hover:border-pine hover:text-pine"}`}>{label} <span className={segment === k ? "text-white/75" : "text-muted"}>{counts[k]}</span></Link>)}
      </nav>
      {tags.length ? (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-muted">Tags:</span>
          {tags.map(([t, n]) => <Link key={t} href={link({ seg: segment ?? undefined, tag: tag === t ? undefined : t })} className={`rounded-full px-2.5 py-1 font-semibold ${tag === t ? "bg-ink text-white" : "bg-snow-2 text-ink-soft hover:text-pine"}`}>{t} {n}{tag === t ? " ✕" : ""}</Link>)}
        </div>
      ) : null}
      <form className="mb-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email, phone or country" className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm" aria-label="Search" />
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        {segment ? <input type="hidden" name="seg" value={segment} /> : null}
        <button className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      {rows.length ? (
        <Table head={["Customer", "Country", "Trips", "Paid", "Last / next trip"]}>
          {rows.map((c) => {
            const s = all.get(c.email.toLowerCase());
            return (
              <tr key={c.id}>
                <td>
                  <Link href={`/customers/${c.id}`} className="font-semibold text-pine hover:underline">{c.name}</Link>
                  <p className="text-xs text-muted">{c.email}</p>
                  {s?.segments.length || c.tags.length ? <p className="mt-1 flex flex-wrap gap-1">{s?.segments.filter((x) => x !== "travelled").map((x) => <Badge key={x} tone={TONE[x]}>{SEGMENTS[x]}</Badge>)}{c.tags.map((t) => <span key={t} className="rounded-full bg-snow-2 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{t}</span>)}</p> : null}
                </td>
                <td>{c.country ?? "–"}</td>
                <td>{s?.trips ?? 0}</td>
                <td>{s?.paid ? money(s.paid) : "–"}</td>
                <td className="whitespace-nowrap">{s?.last ? day(s.last) : "–"}{s?.next ? <span className="block text-xs text-pine">next {day(s.next)}</span> : null}</td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty title={term || segment || tag ? "Nobody found" : "No customers yet"}>{segment || tag ? "No one in this group yet." : 'Use "Fill from bookings" once to add everyone who already booked or wrote to you.'}</Empty>
      )}
    </>
  );
}
