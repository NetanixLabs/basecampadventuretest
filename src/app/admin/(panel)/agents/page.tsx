import { Badge, Empty, PageHeader, Table, money } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { site } from "@/lib/site";
import { AgentEditor } from "./editor";

export const metadata = { title: "Agents" };

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser("operations");
  const { edit } = await searchParams;
  const agents = await db.agent.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const stats = await db.booking.groupBy({ by: ["agentId"], where: { agentId: { not: null }, status: { notIn: ["cancelled", "refunded"] } }, _count: true, _sum: { paid: true, total: true } });
  const by = new Map(stats.map((s) => [s.agentId, s]));
  const editing = edit ? agents.find((a) => a.id === edit) ?? null : null;
  return (
    <>
      <PageHeader title="Agents" description="Partner agencies that send you travellers, and what you owe them." info="Each agent gets a code and a link (e.g. basecampadventure.com/?ref=CODE). Bookings made within 30 days of opening that link are credited to the agent automatically; you can also link a booking by hand on the booking page. Commission is worked out on money actually received." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {agents.length ? (
          <Table head={["Agent", "Code & link", "Bookings", "Received", "Commission"]}>
            {agents.map((a) => {
              const s = by.get(a.id);
              const paid = Number(s?._sum.paid ?? 0);
              const commission = Math.round(paid * Number(a.commissionPct)) / 100;
              return (
                <tr key={a.id} className={a.active ? "" : "opacity-50"}>
                  <td><a href={`/agents/?edit=${a.id}`} className="font-semibold text-pine hover:underline">{a.company || a.name}</a><p className="text-xs text-muted">{a.name}{a.country ? ` · ${a.country}` : ""}</p></td>
                  <td><Badge tone="gray">{a.code}</Badge><p className="mt-1 font-mono text-[11px] text-muted">{site.url.replace("https://", "")}/?ref={a.code}</p></td>
                  <td>{s?._count ?? 0}</td>
                  <td>{money(paid)}</td>
                  <td><strong>{money(commission)}</strong><p className="text-xs text-muted">{Number(a.commissionPct)}%</p></td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <Empty title="No agents yet">Add partner agencies with the form.</Empty>
        )}
        <AgentEditor key={editing?.id ?? "new"} id={editing?.id ?? null} initial={editing ? { name: editing.name, company: editing.company ?? "", email: editing.email ?? "", phone: editing.phone ?? "", country: editing.country ?? "", code: editing.code, commissionPct: Number(editing.commissionPct), notes: editing.notes ?? "", active: editing.active } : null} />
      </div>
    </>
  );
}
