import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { getTrip } from "@/lib/content";
import { ACTIVE, depKey, endOf } from "@/lib/server/departures";
import { LeaveForm, LeaveList } from "./leave";

export const metadata = { title: "Calendar" };
const DAY = 86_400_000;

type Bar = { key: string; from: number; to: number; label: string; sub?: string; href?: string; tone: "pine" | "red" | "amber" | "leave" | "clash" };

/**
 * One month at a glance: every departure as a bar across its days, and every
 * guide and porter with their trips and days off, so gaps and double
 * bookings stand out.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireUser("operations");
  const { m = "" } = await searchParams;
  const now = new Date();
  const [y, mo] = /^20\d\d-(0[1-9]|1[0-2])$/.test(m) ? m.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const start = new Date(Date.UTC(y, mo - 1, 1));
  const end = new Date(Date.UTC(y, mo, 1));
  const days = Math.round((end.getTime() - start.getTime()) / DAY);
  const fetchFrom = new Date(start.getTime() - 60 * DAY);
  const [bookings, deps, guides, leave] = await Promise.all([
    db.booking.findMany({ where: { status: { in: [...ACTIVE] }, startDate: { gte: fetchFrom, lt: end } }, select: { tripSlug: true, tripTitle: true, startDate: true, pax: true, paid: true } }),
    db.departure.findMany({ where: { startDate: { gte: fetchFrom, lt: end } }, include: { staff: { include: { guide: { select: { id: true, name: true } } } } } }),
    db.guide.findMany({ where: { active: true }, orderBy: [{ role: "asc" }, { name: "asc" }], select: { id: true, name: true, role: true } }),
    db.guideLeave.findMany({ where: { to: { gte: start }, from: { lt: end } }, orderBy: { from: "asc" }, include: { guide: { select: { name: true } } } }),
  ]);

  // Departures (bookings grouped by trip and date, plus fixed departures on the website).
  const groups = new Map<string, { slug: string; title: string; start: Date; pax: number; unpaid: number }>();
  for (const b of bookings) {
    const k = depKey(b.tripSlug, b.startDate);
    const g = groups.get(k) ?? { slug: b.tripSlug, title: b.tripTitle, start: b.startDate, pax: 0, unpaid: 0 };
    g.pax += b.pax;
    if (Number(b.paid) <= 0) g.unpaid++;
    groups.set(k, g);
  }
  for (const d of deps) if (d.published && !groups.has(depKey(d.tripSlug, d.startDate))) groups.set(depKey(d.tripSlug, d.startDate), { slug: d.tripSlug, title: getTrip(d.tripSlug)?.title ?? d.tripSlug, start: d.startDate, pax: 0, unpaid: 0 });
  const staffOf = new Map(deps.map((d) => [depKey(d.tripSlug, d.startDate), d.staff]));
  const col = (d: Date) => Math.floor((d.getTime() - start.getTime()) / DAY);
  const clip = (a: number, b: number) => (b < 0 || a >= days ? null : { from: Math.max(0, a), to: Math.min(days - 1, b) });

  const depBars: Bar[] = [];
  const guideBars = new Map<string, Bar[]>(guides.map((g) => [g.id, []]));
  for (const [k, g] of [...groups.entries()].sort((a, b) => a[1].start.getTime() - b[1].start.getTime())) {
    const span = clip(col(g.start), col(endOf(g.slug, g.start)));
    if (!span) continue;
    const staff = staffOf.get(k) ?? [];
    depBars.push({ key: k, ...span, label: g.title, sub: `${g.pax} pax${staff.length ? ` · ${staff.map((s) => s.guide.name.split(" ")[0]).join(", ")}` : " · no guide"}`, href: `/departures/${k}`, tone: !staff.length && g.pax ? "red" : g.unpaid ? "amber" : "pine" });
    for (const s of staff) guideBars.get(s.guide.id)?.push({ key: `${k}-${s.guide.id}`, ...span, label: getTrip(g.slug)?.title ?? g.title, sub: s.role, href: `/departures/${k}`, tone: "pine" });
  }
  for (const l of leave) {
    const span = clip(col(l.from), col(l.to));
    if (span) guideBars.get(l.guideId)?.push({ key: l.id, ...span, label: l.note || "Day off", sub: "off", tone: "leave" });
  }
  // Overlapping bars on one person are double bookings.
  for (const list of guideBars.values()) for (const a of list) if (list.some((b) => b !== a && a.from <= b.to && b.from <= a.to)) a.tone = "clash";

  const label = start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const shift = (n: number) => { const d = new Date(Date.UTC(y, mo - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
  const today = col(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  const grid = { gridTemplateColumns: `11rem repeat(${days}, minmax(1.9rem, 1fr))` };
  const tone = { pine: "bg-pine text-white", red: "bg-red-600 text-white", amber: "bg-amber-500 text-white", leave: "bg-[repeating-linear-gradient(135deg,var(--color-line)_0_6px,transparent_6px_12px)] text-ink border border-line", clash: "bg-red-600 text-white ring-2 ring-red-300" } as const;
  const Row = ({ name, sub, bars }: { name: React.ReactNode; sub?: string; bars: Bar[] }) => {
    // Bars that overlap go on separate lines within the row.
    const lanes: Bar[][] = [];
    for (const b of [...bars].sort((a, c) => a.from - c.from)) {
      const lane = lanes.find((l) => l.every((x) => x.to < b.from || x.from > b.to));
      if (lane) lane.push(b);
      else lanes.push([b]);
    }
    return (
      <div className="grid border-b border-line/70" style={grid}>
        <div className="sticky left-0 z-10 flex min-h-11 flex-col justify-center border-r border-line bg-card px-3 py-1.5"><span className="truncate text-sm font-semibold">{name}</span>{sub ? <span className="text-[11px] text-muted">{sub}</span> : null}</div>
        <div className="relative py-1" style={{ gridColumn: `2 / span ${days}` }}>
          <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>{Array.from({ length: days }, (_, i) => <span key={i} className={`border-r border-line/40 ${i === today ? "bg-pine/8" : new Date(start.getTime() + i * DAY).getUTCDay() % 6 === 0 ? "bg-snow-2/60" : ""}`} />)}</div>
          {lanes.length ? lanes.map((lane, li) => (
            <div key={li} className="relative grid h-8" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
              {lane.map((b) => {
                const inner = <><span className="truncate font-semibold">{b.label}</span>{b.sub ? <span className="truncate opacity-80">· {b.sub}</span> : null}</>;
                const cls = `z-[1] mx-px my-0.5 flex min-w-0 items-center gap-1 overflow-hidden rounded-md px-1.5 text-[11px] leading-none ${tone[b.tone]}`;
                const style = { gridColumn: `${b.from + 1} / ${b.to + 2}` };
                return b.href ? <Link key={b.key} href={b.href} style={style} className={`${cls} hover:opacity-90`} title={`${b.label} ${b.sub ?? ""}`}>{inner}</Link> : <span key={b.key} style={style} className={cls} title={`${b.label}`}>{inner}</span>;
              })}
            </div>
          )) : <div className="h-8" />}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Calendar" description="Departures, guides and days off for the month." info="Each bar runs from a trip's first to last day. Red: a departure with travellers but no guide yet, or someone booked twice (or on a trip during their days off). Amber: a departure with an unpaid booking. Striped: days off. Click a bar to open the departure and assign the team." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/calendar?m=${shift(-1)}`} className="grid size-9 place-items-center rounded-full border border-line hover:border-pine hover:text-pine" aria-label="Previous month"><ChevronLeft className="size-4" /></Link>
        <h2 className="min-w-40 text-center font-display text-xl font-bold">{label}</h2>
        <Link href={`/calendar?m=${shift(1)}`} className="grid size-9 place-items-center rounded-full border border-line hover:border-pine hover:text-pine" aria-label="Next month"><ChevronRight className="size-4" /></Link>
        <Link href="/calendar" className="ml-1 rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-pine hover:text-pine">Today</Link>
        <span className="ml-auto flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-pine" />Departure / assigned</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-amber-500" />Unpaid booking</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-red-600" />No guide / double booked</span>
          <span className="flex items-center gap-1.5"><i className={`size-3 rounded ${tone.leave}`} />Day off</span>
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
        <div style={{ minWidth: `${11 + days * 1.9}rem` }}>
          <div className="sticky top-0 z-20 grid border-b border-line bg-card" style={grid}>
            <div className="sticky left-0 z-10 border-r border-line bg-card px-3 py-2 text-xs font-semibold text-muted">{label}</div>
            {Array.from({ length: days }, (_, i) => { const d = new Date(start.getTime() + i * DAY); return <div key={i} className={`py-1.5 text-center text-[11px] leading-tight ${i === today ? "bg-pine font-bold text-white" : d.getUTCDay() % 6 === 0 ? "bg-snow-2/60 text-muted" : "text-muted"}`}><span className="block">{"SMTWTFS"[d.getUTCDay()]}</span><span className="block font-semibold">{i + 1}</span></div>; })}
          </div>
          <p className="border-b border-line bg-snow-2/50 px-3 py-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Departures ({depBars.length})</p>
          {depBars.length ? depBars.map((b) => <Row key={b.key} name={<Link href={b.href!} className="hover:text-pine">{b.label}</Link>} sub={b.sub} bars={[{ ...b, label: b.sub ?? "", sub: undefined }]} />) : <p className="px-3 py-4 text-sm text-muted">No departures this month.</p>}
          <p className="border-b border-line bg-snow-2/50 px-3 py-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Field team ({guides.length})</p>
          {guides.map((g) => <Row key={g.id} name={g.name} sub={g.role.charAt(0).toUpperCase() + g.role.slice(1)} bars={guideBars.get(g.id) ?? []} />)}
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="Add days off" info="Holidays, another job, sick days. The person shows as unavailable here, and assigning them to a trip during these days asks you to confirm."><LeaveForm guides={guides.map((g) => ({ id: g.id, name: g.name }))} /></Card>
        <Card title={`Days off in ${label}`}><LeaveList items={leave.map((l) => ({ id: l.id, name: l.guide.name, from: l.from.toISOString().slice(0, 10), to: l.to.toISOString().slice(0, 10), note: l.note }))} /></Card>
      </div>
    </>
  );
}
