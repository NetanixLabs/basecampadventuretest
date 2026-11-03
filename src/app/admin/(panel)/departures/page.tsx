import Link from "next/link";
import { Badge, Empty, PageHeader, Table, day } from "@/components/admin/ui";
import { requireUser } from "@/lib/admin/guards";
import { upcomingDepartures } from "@/lib/server/departures";
import { getTrips } from "@/lib/content";
import { AddFixedDeparture } from "./fixed";

export const metadata = { title: "Departures" };

export default async function DeparturesPage() {
  await requireUser("operations");
  const deps = await upcomingDepartures();
  return (
    <>
      <PageHeader title="Departures" description="Every group leaving in the coming months, with who is going and who leads them." info="Bookings for the same trip on the same start date form one departure. Open one to assign guides and porters (with a warning if someone is already booked), keep notes, and download the departure list PDF for the field team." />
      <div className="mb-6"><AddFixedDeparture trips={getTrips().filter((t) => t.price).map((t) => ({ slug: t.slug, title: t.title })).sort((a, b) => a.title.localeCompare(b.title))} /></div>
      {deps.length ? (
        <Table head={["Dates", "Trip", "Travellers", "Payments", "Field team"]}>
          {deps.map((d) => {
            const staff = d.departure?.staff ?? [];
            const unpaid = d.bookings.filter((b) => Number(b.paid) <= 0).length;
            return (
              <tr key={d.key}>
                <td className="whitespace-nowrap"><Link href={`/departures/${d.key}`} className="font-semibold text-pine hover:underline">{day(d.start)}</Link><p className="text-xs text-muted">to {day(d.end)}</p></td>
                <td>{d.title}{d.departure?.published ? <span className="mt-1 flex flex-wrap gap-1"><Badge tone="blue">On website</Badge>{d.departure.guaranteed ? <Badge tone="green">Guaranteed</Badge> : null}{d.departure.seats != null ? <Badge tone={d.departure.seats - d.pax <= 0 ? "red" : d.departure.seats - d.pax <= 3 ? "amber" : "gray"}>{Math.max(0, d.departure.seats - d.pax)} of {d.departure.seats} seats left</Badge> : null}</span> : null}</td>
                <td>{d.pax} <span className="text-xs text-muted">({d.bookings.length} booking{d.bookings.length === 1 ? "" : "s"})</span></td>
                <td>{unpaid ? <Badge tone="amber">{unpaid} unpaid</Badge> : <Badge tone="green">All paid</Badge>}</td>
                <td>{staff.length ? <span className="text-sm">{staff.map((s) => s.guide.name).join(", ")}</span> : <Badge tone="red">No guide yet</Badge>}</td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty title="No upcoming departures">Departures appear as soon as bookings come in, or add a fixed departure above.</Empty>
      )}
    </>
  );
}
