import { BarList, ColumnChart } from "@/components/admin/charts";
import { Card, PageHeader, Stat, money } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";

export const metadata = { title: "Sales dashboard" };
export const dynamic = "force-dynamic";

const USD0 = (n: number) => (n >= 10000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n).toLocaleString("en-US")}`);
const COUNT = (n: number) => String(Math.round(n));

export default async function Reports({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  await requireUser("reports");
  const months = Math.min(24, Math.max(3, Number((await searchParams).months) || 12));
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
  const [bookings, payments, enquiries] = await Promise.all([
    db.booking.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true, status: true, total: true, paid: true, tripTitle: true, tripSlug: true, leadCountry: true, pax: true, agentId: true, discountCode: true, gateway: true } }),
    db.payment.findMany({ where: { status: "succeeded", createdAt: { gte: from } }, select: { amount: true, createdAt: true, provider: true } }),
    db.enquiry.count({ where: { createdAt: { gte: from } } }),
  ]);
  const live = bookings.filter((b) => !["cancelled", "refunded"].includes(b.status));
  const key = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthList = Array.from({ length: months }, (_, i) => new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1)));
  const label = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
  const byMonth = (rows: { createdAt: Date }[], val: (r: never) => number) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(key(r.createdAt), (m.get(key(r.createdAt)) ?? 0) + val(r as never));
    return monthList.map((d) => ({ label: label(d), value: m.get(key(d)) ?? 0 }));
  };
  const received = payments.reduce((s, p) => s + Math.round(Number(p.amount) * 100), 0) / 100;
  const bookedValue = live.reduce((s, b) => s + Math.round(Number(b.total) * 100), 0) / 100;
  const paidBookings = live.filter((b) => Number(b.paid) > 0);
  const conversion = enquiries + live.length ? Math.round((live.length / (enquiries + live.length)) * 100) : 0;
  const group = <T,>(rows: T[], k: (r: T) => string, v: (r: T) => number) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(k(r), (m.get(k(r)) ?? 0) + v(r));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const trips = group(live, (b) => b.tripTitle, (b) => Number(b.total)).slice(0, 8).map(([label, value]) => ({ label, value, hint: `${live.filter((b) => b.tripTitle === label).length} bookings` }));
  const countries = group(live, (b) => b.leadCountry || "Unknown", (b) => b.pax).slice(0, 8).map(([label, value]) => ({ label, value }));
  const sources = [
    { label: "Direct on the website", value: live.filter((b) => !b.agentId && !b.discountCode).length },
    { label: "With a discount code", value: live.filter((b) => b.discountCode).length },
    { label: "Through an agent", value: live.filter((b) => b.agentId).length },
  ];
  const gateways = group(payments, (p) => (p.provider === "hbl" ? "Himalayan Bank" : p.provider === "manual" ? "Recorded by the office" : "WeTravel"), (p) => Number(p.amount)).map(([label, value]) => ({ label, value }));
  return (
    <>
      <PageHeader title="Sales dashboard" description={`The last ${months} months, from bookings and payments in the admin.`} actions={<div className="flex gap-1 rounded-full border border-line bg-card p-1 text-sm">{[6, 12, 24].map((m) => <a key={m} href={`/reports/?months=${m}`} className={`rounded-full px-3 py-1.5 font-semibold ${m === months ? "bg-pine text-white" : "text-ink-soft hover:text-pine"}`}>{m} months</a>)}</div>} info="Money received counts successful payments (WeTravel, Himalayan Bank and payments recorded by the office). Booked value is the total of bookings that aren't cancelled. Conversion is bookings compared with bookings plus enquiries. Hover a bar for its exact value, or open 'Show as table'." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Money received" value={money(received)} hint={`${payments.length} payments`} />
        <Stat label="Booked value" value={money(bookedValue)} hint={`${live.length} bookings, ${live.reduce((s, b) => s + b.pax, 0)} travellers`} />
        <Stat label="Average booking" value={money(live.length ? bookedValue / live.length : 0)} hint={`${paidBookings.length} with a payment`} />
        <Stat label="Enquiry to booking" value={`${conversion}%`} hint={`${enquiries} enquiries`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Money received per month"><ColumnChart label="Money received per month, US dollars" data={byMonth(payments, (p: { amount: unknown }) => Number(p.amount))} format={USD0} /></Card>
        <Card title="New bookings per month"><ColumnChart label="New bookings per month" data={byMonth(live, () => 1)} format={COUNT} /></Card>
        <Card title="Best-selling trips" info="By booked value."><BarList data={trips} format={USD0} /></Card>
        <Card title="Where travellers come from" info="Number of travellers by the lead traveller's nationality."><BarList data={countries} format={COUNT} /></Card>
        <Card title="How bookings arrived"><BarList data={sources} format={COUNT} /></Card>
        <Card title="Payments by method"><BarList data={gateways} format={USD0} /></Card>
      </div>
    </>
  );
}
