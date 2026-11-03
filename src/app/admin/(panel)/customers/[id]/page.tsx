import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, day, money, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { can, requireUser } from "@/lib/admin/guards";
import { CUSTOMER_FIELDS, readCustomerDetails } from "@/lib/server/customers";
import { CustomerForm } from "./form";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser("customers");
  const { id } = await params;
  const isNew = id === "new";
  const c = isNew ? null : await db.customer.findUnique({ where: { id } });
  if (!isNew && !c) notFound();
  const [bookings, enquiries, receipts] = c
    ? await Promise.all([
        db.booking.findMany({ where: { leadEmail: c.email }, orderBy: { startDate: "desc" } }),
        db.enquiry.findMany({ where: { email: c.email }, orderBy: { createdAt: "desc" }, take: 30 }),
        db.receipt.findMany({ where: { customerEmail: c.email }, orderBy: { issuedAt: "desc" }, take: 50 }),
      ])
    : [[], [], []];
  const paid = bookings.reduce((s, b) => s + Number(b.paid), 0);
  return (
    <>
      <PageHeader title={c?.name ?? "New customer"} description={c ? `${c.email} · customer since ${day(c.createdAt)}` : undefined} back={{ href: "/customers", label: "Customers" }} actions={c && can(user, "receipts") ? <Link href={`/receipts/new?customer=${c.id}&kind=bill`} className="rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold hover:border-pine">New bill</Link> : null} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        <CustomerForm id={c?.id ?? null} fields={CUSTOMER_FIELDS} initial={{ name: c?.name ?? "", email: c?.email ?? "", phone: c?.phone ?? "", country: c?.country ?? "", notes: c?.notes ?? "", tags: c?.tags ?? [], details: readCustomerDetails(c?.detailsEnc ?? null) as Record<string, string> }} />
        {c ? (
          <div className="space-y-6">
            <Card title="At a glance">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted">Bookings</dt><dd className="text-lg font-bold">{bookings.length}</dd></div>
                <div><dt className="text-muted">Paid in total</dt><dd className="text-lg font-bold">{money(paid)}</dd></div>
                <div><dt className="text-muted">Enquiries</dt><dd className="text-lg font-bold">{enquiries.length}</dd></div>
                <div><dt className="text-muted">Came from</dt><dd className="font-semibold capitalize">{c.source ?? "–"}</dd></div>
              </dl>
            </Card>
            <Card title="Bookings">
              {bookings.length ? <ul className="divide-y divide-line text-sm">{bookings.map((b) => <li key={b.id} className="py-2"><Link href={`/bookings/${b.id}`} className="font-semibold text-pine">{b.tripTitle}</Link><p className="text-xs text-muted">{day(b.startDate)} · {b.reference} · {money(Number(b.paid))} of {money(Number(b.total))}</p></li>)}</ul> : <p className="text-sm text-muted">No bookings.</p>}
            </Card>
            <Card title="Enquiries">
              {enquiries.length ? <ul className="divide-y divide-line text-sm">{enquiries.map((e) => <li key={e.id} className="py-2"><Link href={`/enquiries/${e.id}`} className="font-semibold text-pine">{e.trip || e.kind}</Link><p className="text-xs text-muted">{when(e.createdAt)} · {e.reference}</p></li>)}</ul> : <p className="text-sm text-muted">No enquiries.</p>}
            </Card>
            {can(user, "receipts") ? (
              <Card title="Receipts & bills">
                {receipts.length ? <ul className="divide-y divide-line text-sm">{receipts.map((r) => <li key={r.id} className="flex items-center justify-between py-2"><Link href={`/receipts/${r.id}`} className="font-mono text-pine">{r.number}</Link>{r.voidedAt ? <Badge tone="red">Cancelled</Badge> : <span>{money(Number(r.total), r.currency)}</span>}</li>)}</ul> : <p className="text-sm text-muted">None yet.</p>}
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
