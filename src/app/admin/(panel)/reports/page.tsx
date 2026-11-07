import { BarList, ColumnChart } from "@/components/admin/charts";
import Link from "next/link";
import { Card, PageHeader, Stat, money } from "@/components/admin/ui";
import { features } from "@/lib/admin/features";
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
  const [bookings, payments, enquiries, visits, enquiryRows, finder, open, f] = await Promise.all([
    db.booking.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true, status: true, total: true, paid: true, tripTitle: true, tripSlug: true, leadCountry: true, pax: true, agentId: true, discountCode: true, gateway: true, source: true } }),
    db.payment.findMany({ where: { status: "succeeded", createdAt: { gte: from } }, select: { amount: true, createdAt: true, provider: true } }),
    db.enquiry.count({ where: { createdAt: { gte: from } } }),
    db.visitDay.groupBy({ by: ["source"], where: { day: { gte: from } }, _sum: { visits: true } }),
    db.enquiry.groupBy({ by: ["source"], where: { createdAt: { gte: from } }, _count: { _all: true } }),
    db.finderAnswer.findMany({ where: { createdAt: { gte: from } }, select: { answers: true, results: true } }),
    // Money still to come: bookings with a deposit and a balance open.
    db.booking.findMany({ where: { status: { in: ["deposit_paid", "confirmed", "awaiting_payment"] }, startDate: { gte: new Date(now.getTime() - 30 * 86_400_000) } }, select: { id: true, reference: true, leadName: true, tripTitle: true, startDate: true, total: true, paid: true, status: true }, orderBy: { startDate: "asc" } }),
    features(),
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
  // Funnel: visits → enquiries → bookings → paid, and by channel.
  const visitTotal = visits.reduce((t, v) => t + (v._sum.visits ?? 0), 0);
  const funnel = [
    { label: "Website visits", value: visitTotal },
    { label: "Enquiries and bookings", value: enquiries + live.length },
    { label: "Bookings started", value: live.length },
    { label: "Bookings with a payment", value: paidBookings.length },
  ];
  const channels = [...new Set([...visits.map((v) => v.source), ...enquiryRows.map((e) => e.source ?? "Not known"), ...live.map((b) => b.source ?? (b.agentId ? "Agent" : "Not known"))])]
    .map((src) => {
      const bk = live.filter((b) => (b.source ?? (b.agentId ? "Agent" : "Not known")) === src);
      return { src, visits: visits.find((v) => v.source === src)?._sum.visits ?? 0, enquiries: enquiryRows.find((e) => (e.source ?? "Not known") === src)?._count._all ?? 0, bookings: bk.length, paid: bk.filter((b) => Number(b.paid) > 0).length, value: bk.reduce((t, b) => t + Number(b.total), 0) };
    })
    .filter((c) => c.visits || c.enquiries || c.bookings)
    .sort((a, b) => Number(a.src === "Not known") - Number(b.src === "Not known") || b.value - a.value || b.visits - a.visits);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "–");

  // Upcoming money: the balance of each booking, due a set number of days before the start.
  const dueOf = (d: Date) => new Date(d.getTime() - f.balance.dueDays * 86_400_000);
  const owed = open.map((b) => ({ ...b, balance: Math.max(0, Number(b.total) - Number(b.paid)), due: b.status === "awaiting_payment" ? b.startDate : dueOf(b.startDate) })).filter((b) => b.balance > 0.5 && b.status !== "awaiting_payment");
  const inDays = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  const bucket = (lo: number, hi: number) => owed.filter((b) => inDays(b.due) > lo && inDays(b.due) <= hi);
  const sumBal = (rows: typeof owed) => rows.reduce((t, b) => t + b.balance, 0);
  const overdue = owed.filter((b) => inDays(b.due) <= 0);
  const soon = owed.filter((b) => inDays(b.due) <= 90).slice(0, 12);

  // Trip finder: the most common answers.
  const LABELS: Record<string, Record<string, string>> = {
    style: { trek: "Trekking", climb: "Peak climbing", culture: "Culture & tours", rafting: "Rafting", bhutan: "Bhutan", tibet: "Tibet" },
    days: { short: "Up to a week", mid: "8–12 days", long: "13–17 days", epic: "18 days or more" },
    altitude: { low: "Below 4,000 m", mid: "4,000–5,200 m", high: "Above 5,200 m" },
    budget: { b1: "Under US$800", b2: "US$800–1,500", b3: "US$1,500–2,500", b4: "US$2,500 or more" },
    region: { "everest-region": "Everest", "annapurna-region": "Annapurna", "langtang-region": "Langtang", "manaslu-region": "Manaslu", "remote-area-trekking": "Off the beaten track", any: "Surprise me" },
  };
  const answersFor = (q: string) => group(finder, (r) => LABELS[q][String((r.answers as Record<string, string>)[q] ?? "")] ?? "", () => 1).filter(([l]) => l).map(([label, value]) => ({ label, value, hint: `${Math.round((value / Math.max(1, finder.length)) * 100)}%` }));
  const noMatch = finder.filter((r) => r.results === 0).length;

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
      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="Sales funnel" info="Website visits are counted once per browser session, without cookies or personal data (bots are left out). The second step counts everyone who wrote to you or started a booking (many book without writing first); 'with a payment' means a deposit or more arrived.">
          <ol className="space-y-3">
            {funnel.map((st, i) => (
              <li key={st.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-semibold">{st.label}</span><span className="tabular-nums"><strong>{st.value.toLocaleString("en-US")}</strong>{i ? <span className="ml-2 text-xs text-muted">{pct(st.value, funnel[i - 1].value)} of previous</span> : null}</span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-snow-2"><div className="h-full rounded-full bg-pine" style={{ width: `${Math.max(st.value ? 2 : 0, (st.value / Math.max(1, funnel[0].value || funnel[1].value || 1)) * 100)}%`, opacity: 1 - i * 0.15 }} /></div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">From visit to paid booking: <strong>{pct(paidBookings.length, visitTotal)}</strong></p>
        </Card>
        <Card title="Where they came from" info="The channel is worked out from the site a visitor arrived from (Google, Instagram, an AI assistant…) or a campaign tag, and remembered for that visit only. Bookings through an agent's link count as Agent. 'Not known' are bookings from before this was switched on.">
          {channels.length ? (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="px-1 py-2">Channel</th><th className="px-1 py-2 text-right">Visits</th><th className="px-1 py-2 text-right">Enquiries</th><th className="px-1 py-2 text-right">Bookings</th><th className="px-1 py-2 text-right">Paid</th><th className="px-1 py-2 text-right">Value</th></tr></thead>
                <tbody>{channels.map((c) => <tr key={c.src} className="border-b border-line/60"><td className="px-1 py-2 font-semibold">{c.src}</td><td className="px-1 py-2 text-right tabular-nums">{c.visits.toLocaleString("en-US")}</td><td className="px-1 py-2 text-right tabular-nums">{c.enquiries}</td><td className="px-1 py-2 text-right tabular-nums">{c.bookings}</td><td className="px-1 py-2 text-right tabular-nums">{c.paid}<span className="block text-[11px] text-muted">{pct(c.paid, c.visits)}</span></td><td className="px-1 py-2 text-right tabular-nums">{USD0(c.value)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted">Visits are counted from now on; channels appear here within a day.</p>}
        </Card>
      </div>

      <h2 className="font-display mt-10 text-xl font-bold">Upcoming money</h2>
      <p className="mt-1 text-sm text-muted">Balances still to pay on bookings with a deposit, by due date ({f.balance.dueDays} days before the start, set in Settings → Features).</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Overdue" value={money(sumBal(overdue))} hint={`${overdue.length} bookings`} />
        <Stat label="Next 30 days" value={money(sumBal(bucket(0, 30)))} hint={`${bucket(0, 30).length} bookings`} />
        <Stat label="31 to 60 days" value={money(sumBal(bucket(30, 60)))} hint={`${bucket(30, 60).length} bookings`} />
        <Stat label="61 to 90 days" value={money(sumBal(bucket(60, 90)))} hint={`${bucket(60, 90).length} bookings`} />
      </div>
      {soon.length ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="px-4 py-2.5">Due</th><th className="px-4 py-2.5">Traveller</th><th className="px-4 py-2.5">Trip</th><th className="px-4 py-2.5 text-right">Balance</th></tr></thead>
            <tbody>{soon.map((b) => { const n = inDays(b.due); return <tr key={b.id} className="border-b border-line/60 last:border-0"><td className={`px-4 py-2.5 whitespace-nowrap ${n <= 0 ? "font-semibold text-red-700" : n <= 14 ? "font-semibold text-amber-700" : ""}`}>{b.due.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}<span className="block text-[11px] font-normal text-muted">{n <= 0 ? `${-n} days late` : `in ${n} days`}</span></td><td className="px-4 py-2.5"><Link href={`/bookings/${b.id}`} className="font-semibold text-pine hover:underline">{b.leadName}</Link><span className="block text-[11px] text-muted">{b.reference}</span></td><td className="px-4 py-2.5">{b.tripTitle}<span className="block text-[11px] text-muted">starts {b.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span></td><td className="px-4 py-2.5 text-right font-semibold tabular-nums">{money(b.balance)}</td></tr>; })}</tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="Money received per month"><ColumnChart label="Money received per month, US dollars" data={byMonth(payments, (p: { amount: unknown }) => Number(p.amount))} format={USD0} /></Card>
        <Card title="New bookings per month"><ColumnChart label="New bookings per month" data={byMonth(live, () => 1)} format={COUNT} /></Card>
        <Card title="Best-selling trips" info="By booked value."><BarList data={trips} format={USD0} /></Card>
        <Card title="Where travellers come from" info="Number of travellers by the lead traveller's nationality."><BarList data={countries} format={COUNT} /></Card>
        <Card title="How bookings arrived"><BarList data={sources} format={COUNT} /></Card>
        <Card title="Payments by method"><BarList data={gateways} format={USD0} /></Card>
      </div>

      <h2 className="font-display mt-10 text-xl font-bold">What people look for (trip finder)</h2>
      <p className="mt-1 text-sm text-muted">{finder.length ? `${finder.length} visitors finished the trip finder${noMatch ? `; ${noMatch} (${Math.round((noMatch / finder.length) * 100)}%) found no matching trip, a sign of a gap in the trips on offer` : ""}.` : "Nobody has finished the trip finder in this period yet."}</p>
      {finder.length ? (
        <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          <Card title="Kind of trip"><BarList data={answersFor("style")} format={COUNT} /></Card>
          <Card title="Days available"><BarList data={answersFor("days")} format={COUNT} /></Card>
          <Card title="Budget per person"><BarList data={answersFor("budget")} format={COUNT} /></Card>
          <Card title="Region"><BarList data={answersFor("region")} format={COUNT} /></Card>
          <Card title="How high"><BarList data={answersFor("altitude")} format={COUNT} /></Card>
        </div>
      ) : null}
    </>
  );
}
