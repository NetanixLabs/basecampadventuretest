import { PageHeader, Table, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";

export const metadata = { title: "Activity log" };

export default async function Activity({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser("settings");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const rows = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * 100, take: 100, include: { user: { select: { name: true } } } });
  return (
    <>
      <PageHeader title="Activity log" description="Every sign-in, change and email sent from the admin, with who and from where. Kept for security." />
      <Table head={["When", "Who", "What", "Details", "From"]}>
        {rows.map((a) => (
          <tr key={a.id} className={a.action.includes("failed") || a.action.includes("locked") ? "bg-red-50/60 dark:bg-red-950/20" : ""}>
            <td className="whitespace-nowrap text-ink-soft">{when(a.createdAt)}</td>
            <td>{a.user?.name ?? "—"}</td>
            <td className="font-mono text-xs">{a.action}</td>
            <td className="max-w-xs truncate text-ink-soft">{a.summary ?? a.entity}</td>
            <td className="font-mono text-xs text-muted">{a.ipAddress ?? ""}</td>
          </tr>
        ))}
      </Table>
      <div className="mt-4 flex justify-between text-sm">
        {page > 1 ? <a href={`?page=${page - 1}`} className="font-semibold text-pine">← Newer</a> : <span />}
        {rows.length === 100 ? <a href={`?page=${page + 1}`} className="font-semibold text-pine">Older →</a> : null}
      </div>
    </>
  );
}
