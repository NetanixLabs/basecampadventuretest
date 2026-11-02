import Link from "next/link";
import { ButtonLink, Empty, PageHeader, Table, day, money } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { ImportButton } from "./import-button";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  await requireUser("customers");
  const { q = "", tag = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const rows = await db.customer.findMany({
    where: { ...(term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }, { country: { contains: term, mode: "insensitive" } }] } : {}), ...(tag ? { tags: { has: tag } } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  const stats = rows.length
    ? await db.booking.groupBy({ by: ["leadEmail"], where: { leadEmail: { in: rows.map((r) => r.email) } }, _count: true, _sum: { paid: true }, _max: { startDate: true } })
    : [];
  const by = new Map(stats.map((s) => [s.leadEmail, s]));
  const total = await db.customer.count();
  return (
    <>
      <PageHeader title="Customers" description={`${total} travellers and contacts.`} actions={<div className="flex flex-wrap gap-2"><ImportButton /><ButtonLink href="/customers/new">Add customer</ButtonLink></div>} info="Everyone who books or sends an enquiry is added automatically, matched by email. Open a customer to see all their bookings, enquiries and receipts, and to keep notes, tags and private details (passport, date of birth, address), which are stored encrypted." />
      <form className="mb-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email, phone or country" className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm" aria-label="Search" />
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        <button className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white">Search</button>
        {tag ? <Link href="/customers" className="rounded-full border border-line px-4 py-2 text-sm">Tag: {tag} ✕</Link> : null}
      </form>
      {rows.length ? (
        <Table head={["Customer", "Country", "Bookings", "Paid", "Next / last trip"]}>
          {rows.map((c) => {
            const s = by.get(c.email);
            return (
              <tr key={c.id}>
                <td><Link href={`/customers/${c.id}`} className="font-semibold text-pine hover:underline">{c.name}</Link><p className="text-xs text-muted">{c.email}{c.tags.length ? ` · ${c.tags.join(", ")}` : ""}</p></td>
                <td>{c.country ?? "–"}</td>
                <td>{s?._count ?? 0}</td>
                <td>{s?._sum.paid ? money(Number(s._sum.paid)) : "–"}</td>
                <td>{s?._max.startDate ? day(s._max.startDate) : "–"}</td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty title={term ? "Nobody found" : "No customers yet"}>Use "Fill from bookings" once to add everyone who already booked or wrote to you.</Empty>
      )}
    </>
  );
}
