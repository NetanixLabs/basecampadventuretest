import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, day, money } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { ACTIVE, endOf, parseKey } from "@/lib/server/departures";
import { readDetails } from "@/lib/server/portal";
import { getTrip } from "@/lib/content";
import { StaffPlanner } from "./planner";
import { DeparturePhotos } from "./photos";
import { DepartureSettings } from "../fixed";

export const metadata = { title: "Departure" };

export default async function DeparturePage({ params }: { params: Promise<{ key: string }> }) {
  await requireUser("operations");
  const { key } = await params;
  const k = parseKey(key);
  if (!k) notFound();
  const [bookings, dep, team] = await Promise.all([
    db.booking.findMany({ where: { tripSlug: k.slug, startDate: k.date, status: { in: [...ACTIVE] } }, orderBy: { createdAt: "asc" } }),
    db.departure.findUnique({ where: { tripSlug_startDate: { tripSlug: k.slug, startDate: k.date } }, include: { staff: { include: { guide: true } }, photos: { orderBy: { createdAt: "desc" }, select: { id: true } } } }),
    db.guide.findMany({ where: { active: true }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
  ]);
  if (!bookings.length && !dep) notFound();
  const title = bookings[0]?.tripTitle ?? getTrip(k.slug)?.title ?? k.slug.replace(/-/g, " ");
  const pax = bookings.reduce((s, b) => s + b.pax, 0);
  return (
    <>
      <PageHeader title={title} description={`${day(k.date)} to ${day(endOf(k.slug, k.date))} · ${pax} travellers`} back={{ href: "/departures", label: "Departures" }} actions={<a href={`/api/departure-pdf/?key=${encodeURIComponent(key)}`} target="_blank" rel="noopener" className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white">Departure list (PDF)</a>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        <Card title="Travellers">
          <ul className="divide-y divide-line text-sm">
            {bookings.map((b) => {
              const d = readDetails(b.detailsEnc);
              return (
                <li key={b.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/bookings/${b.id}`} className="font-semibold text-pine">{b.leadName} · {b.pax} pax</Link>{Number(b.paid) >= Number(b.total) - 0.005 ? <Badge tone="green">Paid</Badge> : Number(b.paid) > 0 ? <Badge tone="amber">Balance {money(Number(b.total) - Number(b.paid))}</Badge> : <Badge tone="red">Unpaid</Badge>}</div>
                  <p className="text-xs text-muted">{b.leadCountry} · {b.leadPhone} · {b.reference}</p>
                  {d.arrivalFlight || d.diet || d.medical ? <p className="mt-1 text-xs">{[d.arrivalFlight && `Arrives: ${d.arrivalFlight}${d.arrivalTime ? ` ${d.arrivalTime.replace("T", " ")}` : ""}`, d.diet && `Food: ${d.diet}`, d.medical && `Medical: ${d.medical}`].filter(Boolean).join(" · ")}</p> : null}
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="space-y-6">
        <DepartureSettings depKey={key} booked={pax} value={{ published: dep?.published ?? false, seats: dep?.seats ?? null, guaranteed: dep?.guaranteed ?? false, pickupTime: dep?.pickupTime ?? "", pickupPlace: dep?.pickupPlace ?? "" }} />
        <StaffPlanner depKey={key} staff={(dep?.staff ?? []).map((s) => ({ id: s.guide.id, name: s.guide.name, role: s.role, phone: s.guide.phone, notifiedAt: s.notifiedAt?.toISOString() ?? null, hasEmail: Boolean(s.guide.email) }))} team={team.map((g) => ({ id: g.id, name: g.name, role: g.role }))} notes={dep?.notes ?? ""} />
        <DeparturePhotos depKey={key} photos={(dep?.photos ?? []).map((p) => p.id)} />
        </div>
      </div>
    </>
  );
}
