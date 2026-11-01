import Link from "next/link";
import { Badge, Empty, PageHeader, Table, day, money, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import type { BookingStatus, Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Bookings" };
const STATUSES: BookingStatus[] = ["requested", "awaiting_payment", "deposit_paid", "paid", "confirmed", "cancelled", "refunded"];
const tone = (s: string) => (s === "paid" || s === "confirmed" ? "green" : s === "deposit_paid" ? "blue" : s === "cancelled" || s === "refunded" ? "gray" : "amber") as "green" | "blue" | "gray" | "amber";
const label = (s: string) => s.replace("_", " ");

export default async function Bookings({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; when?: string }> }) {
  await requireUser("sales");
  const { status = "", q = "", when: period = "" } = await searchParams;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const where: Prisma.BookingWhereInput = {
    ...(STATUSES.includes(status as BookingStatus) ? { status: status as BookingStatus } : {}),
    ...(period === "upcoming" ? { startDate: { gte: today }, status: { notIn: ["cancelled", "refunded"] } } : {}),
    ...(q ? { OR: [{ leadName: { contains: q, mode: "insensitive" } }, { leadEmail: { contains: q, mode: "insensitive" } }, { reference: { contains: q.toUpperCase() } }, { tripTitle: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [rows, totals] = await Promise.all([
    db.booking.findMany({ where, orderBy: period === "upcoming" ? { startDate: "asc" } : { createdAt: "desc" }, take: 200 }),
    db.booking.aggregate({ where: { status: { notIn: ["cancelled", "refunded", "requested"] } }, _sum: { total: true, paid: true } }),
  ]);
  return (
    <>
      <PageHeader title="Bookings" description={`Booked value ${money(Number(totals._sum.total ?? 0))} · received ${money(Number(totals._sum.paid ?? 0))}`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="min-w-56 flex-1"><input name="q" defaultValue={q} placeholder="Search traveller, email, trip or reference…" className="w-full rounded-full border border-line bg-card px-4 py-2 text-sm focus:border-pine focus:outline-none" /></form>
        <nav className="flex flex-wrap gap-1 text-sm">
          <Link href="?when=upcoming" className={`rounded-full px-3 py-1.5 font-medium ${period === "upcoming" ? "bg-pine text-white" : "text-ink-soft hover:bg-pine/8"}`}>Upcoming departures</Link>
          {["", ...STATUSES].map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={`rounded-full px-3 py-1.5 font-medium capitalize ${status === s && !period ? "bg-pine text-white" : "text-ink-soft hover:bg-pine/8"}`}>{s ? label(s) : "All"}</Link>)}
        </nav>
      </div>
      {rows.length ? (
        <Table head={["Traveller", "Trip", "Starts", "Total", "Paid", "Status", "Booked"]}>
          {rows.map((b) => (
            <tr key={b.id}>
              <td><Link href={`/bookings/${b.id}`} className="font-semibold hover:text-pine">{b.leadName}</Link><p className="font-mono text-xs text-muted">{b.reference}</p></td>
              <td className="max-w-xs"><p className="truncate">{b.tripTitle}</p><p className="text-xs text-muted">{b.pax} {b.pax === 1 ? "traveller" : "travellers"}{b.discountCode ? ` · ${b.discountCode}` : ""}</p></td>
              <td className="whitespace-nowrap">{day(b.startDate)}</td>
              <td className="whitespace-nowrap tabular-nums">{money(Number(b.total))}</td>
              <td className="whitespace-nowrap tabular-nums">{money(Number(b.paid))}</td>
              <td><Badge tone={tone(b.status)}>{label(b.status)}</Badge></td>
              <td className="whitespace-nowrap text-ink-soft">{when(b.createdAt)}</td>
            </tr>
          ))}
        </Table>
      ) : <Empty title="No bookings here.">Bookings made on the website appear here with their WeTravel payments.</Empty>}
    </>
  );
}
