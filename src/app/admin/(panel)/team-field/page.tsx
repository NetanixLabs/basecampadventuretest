import { Badge, Empty, PageHeader, Table, day } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { endOf } from "@/lib/server/departures";
import { GuideEditor } from "./editor";

export const metadata = { title: "Guides & porters" };
const ROLE = { guide: "Guide", leader: "Trip leader", porter: "Porter", driver: "Driver", cook: "Cook", other: "Other" } as const;

export default async function FieldTeam({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser("operations");
  const { edit } = await searchParams;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const team = await db.guide.findMany({ orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }], include: { assignments: { include: { departure: true } } } });
  const editing = edit ? team.find((g) => g.id === edit) ?? null : null;
  return (
    <>
      <PageHeader title="Guides & porters" description="Your field team, their contacts and who is out on which trip." info="Add every guide, porter, driver and cook once. Assign them to departures under Departures; the planner warns you if someone is already booked on those dates. Their phone numbers go on the departure list PDF for the office and the group." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        {team.length ? (
          <Table head={["Name", "Role", "Contact", "Next trip", ""]}>
            {team.map((g) => {
              const next = g.assignments.map((a) => a.departure).filter((d) => endOf(d.tripSlug, d.startDate) >= today).sort((a, b) => +a.startDate - +b.startDate)[0];
              const out = next && next.startDate <= today;
              return (
                <tr key={g.id} className={g.active ? "" : "opacity-50"}>
                  <td><p className="font-semibold">{g.name}</p><p className="text-xs text-muted">{g.languages.join(", ")}{g.licenceNo ? ` · Licence ${g.licenceNo}` : ""}</p></td>
                  <td>{ROLE[g.role]}</td>
                  <td className="text-sm">{g.phone ? <a href={`https://wa.me/${g.phone.replace(/[^0-9]/g, "")}`} className="text-pine" target="_blank" rel="noopener noreferrer">{g.phone}</a> : "–"}</td>
                  <td>{out ? <Badge tone="amber">On trip now</Badge> : next ? <span className="text-sm">{next.tripSlug.replace(/-/g, " ")} · {day(next.startDate)}</span> : <Badge tone="green">Free</Badge>}</td>
                  <td className="text-right"><a href={`/team-field/?edit=${g.id}`} className="text-sm font-semibold text-pine hover:underline">Edit</a></td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <Empty title="No field team yet">Add your guides and porters with the form.</Empty>
        )}
        <GuideEditor key={editing?.id ?? "new"} id={editing?.id ?? null} initial={editing ? { name: editing.name, role: editing.role, phone: editing.phone ?? "", email: editing.email ?? "", languages: editing.languages.join(", "), licenceNo: editing.licenceNo ?? "", notes: editing.notes ?? "", active: editing.active } : null} />
      </div>
    </>
  );
}
