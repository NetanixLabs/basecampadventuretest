import { Badge, Card, PageHeader, Table, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { Composer } from "./composer";

export const metadata = { title: "Newsletter" };

export default async function Subscribers() {
  await requireUser("sales");
  const [subs, counts, campaigns, trips, codes] = await Promise.all([
    db.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    db.subscriber.groupBy({ by: ["status"], _count: true }),
    db.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.entry.findMany({ where: { collection: "trips", status: "published" }, orderBy: { title: "asc" }, select: { slug: true, title: true } }),
    db.discountCode.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, select: { code: true, label: true } }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <>
      <PageHeader title="Newsletter" description={`${n("subscribed")} subscribed · ${n("unsubscribed")} unsubscribed`} info="People join from the newsletter boxes on the website and receive a welcome email. Every newsletter includes a one-click unsubscribe link, and unsubscribed addresses are never emailed again. Download CSV exports the list for a spreadsheet." actions={<a href="/api/subscribers.csv" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine">Download CSV</a>} />
      <Composer trips={trips.map((t) => ({ value: t.slug, label: t.title }))} codes={codes} />
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        <Table head={["Email", "Joined from", "Since", "Status"]}>
          {subs.map((s) => (
            <tr key={s.id}><td className="font-medium">{s.email}</td><td className="text-ink-soft">{s.source ?? "—"}</td><td className="text-ink-soft">{when(s.createdAt)}</td><td><Badge tone={s.status === "subscribed" ? "green" : "gray"}>{s.status}</Badge></td></tr>
          ))}
        </Table>
        <Card title="Sent newsletters">
          {campaigns.length ? (
            <ul className="divide-y divide-line text-sm">{campaigns.map((c) => <li key={c.id} className="py-2"><p className="font-semibold">{c.subject}</p><p className="text-xs text-muted">{c.recipients} subscribers · {when(c.sentAt ?? c.createdAt)}</p></li>)}</ul>
          ) : <p className="text-sm text-muted">None sent yet.</p>}
        </Card>
      </div>
    </>
  );
}
