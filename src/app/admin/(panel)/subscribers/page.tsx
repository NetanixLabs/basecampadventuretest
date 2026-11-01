import { Badge, Card, PageHeader, Table, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { Composer } from "./composer";

export const metadata = { title: "Newsletter" };

export default async function Subscribers() {
  await requireUser("sales");
  const [subs, counts, campaigns] = await Promise.all([
    db.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    db.subscriber.groupBy({ by: ["status"], _count: true }),
    db.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <>
      <PageHeader title="Newsletter" description={`${n("subscribed")} subscribed · ${n("unsubscribed")} unsubscribed. People join from the website's newsletter boxes.`} actions={<a href="/api/subscribers.csv" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine">Download CSV</a>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <Table head={["Email", "Joined from", "Since", "Status"]}>
            {subs.map((s) => (
              <tr key={s.id}><td className="font-medium">{s.email}</td><td className="text-ink-soft">{s.source ?? "—"}</td><td className="text-ink-soft">{when(s.createdAt)}</td><td><Badge tone={s.status === "subscribed" ? "green" : "gray"}>{s.status}</Badge></td></tr>
            ))}
          </Table>
          {campaigns.length ? (
            <Card title="Sent campaigns">
              <ul className="divide-y divide-line text-sm">{campaigns.map((c) => <li key={c.id} className="flex justify-between gap-3 py-2"><span className="font-semibold">{c.subject}</span><span className="text-muted">{c.recipients} · {when(c.sentAt ?? c.createdAt)}</span></li>)}</ul>
            </Card>
          ) : null}
        </div>
        <Composer />
      </div>
    </>
  );
}
