import Link from "next/link";
import { Badge, Card, PageHeader, Table, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { TEMPLATES } from "@/lib/admin/email/templates";
import { requireUser } from "@/lib/admin/guards";

export const metadata = { title: "Email templates" };

export default async function Emails() {
  await requireUser("email");
  const [saved, log, smtp] = await Promise.all([db.emailTemplate.findMany(), db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }), Promise.resolve(Boolean(process.env.SMTP_HOST))]);
  return (
    <>
      <PageHeader title="Email templates" description="The emails the website sends by itself. Change the wording any time; the branded design stays the same." />
      {!smtp ? <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Email sending isn't connected yet (SMTP settings on the server). Until then emails are written to the server log instead of being sent.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const s = saved.find((x) => x.key === t.key);
          return (
            <Link key={t.key} href={`/emails/${t.key}`} className="rounded-2xl border border-line bg-card p-5 hover:border-pine">
              <div className="flex items-start justify-between gap-2"><p className="font-bold">{t.name}</p>{s && !s.enabled ? <Badge>Off</Badge> : s ? <Badge tone="pine">Edited</Badge> : null}</div>
              <p className="mt-1 text-xs text-muted">To the {t.to}</p>
              <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{s?.subject ?? t.subject}</p>
            </Link>
          );
        })}
      </div>
      <Card className="mt-8" title="Recently sent">
        {log.length ? (
          <Table head={["To", "Email", "Status", "When"]}>
            {log.map((l) => <tr key={l.id}><td>{l.to}</td><td className="max-w-sm truncate">{l.subject}</td><td><Badge tone={l.status === "sent" ? "green" : l.status === "failed" ? "red" : "gray"}>{l.status}</Badge>{l.error ? <p className="mt-1 text-xs text-red-700">{l.error}</p> : null}</td><td className="whitespace-nowrap text-ink-soft">{when(l.createdAt)}</td></tr>)}
          </Table>
        ) : <p className="text-sm text-muted">Nothing sent yet.</p>}
      </Card>
    </>
  );
}
