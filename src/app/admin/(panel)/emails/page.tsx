import Link from "next/link";
import { Badge, Card, PageHeader, Table, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { TEMPLATES } from "@/lib/admin/email/templates";
import { cfg } from "@/lib/admin/config";
import { requireUser } from "@/lib/admin/guards";

export const metadata = { title: "Email templates" };

export default async function Emails() {
  await requireUser("email");
  const [saved, log, smtp] = await Promise.all([db.emailTemplate.findMany(), db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }), cfg("SMTP_HOST").then(Boolean)]);
  return (
    <>
      <PageHeader title="Email templates" description="Automatic emails to travellers, the office and the team." info="Open a template to change its subject, heading, text and button. The branded design, booking details and links are added automatically, so every email looks the same. Use Send me a test to check it in your inbox. Restore original brings back the starting wording." />
      {!smtp ? <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Email sending is not connected on this server. Add the SMTP settings in the server's .env file (see DEPLOY.md) to start sending.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const s = saved.find((x) => x.key === t.key);
          return (
            <Link key={t.key} href={`/emails/${t.key}`} className="rounded-2xl border border-line bg-card p-5 hover:border-pine">
              <div className="flex items-start justify-between gap-2"><p className="font-bold">{t.name}</p>{(s ? !s.enabled : t.off) ? <Badge>Off</Badge> : s ? <Badge tone="pine">Edited</Badge> : null}</div>
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
