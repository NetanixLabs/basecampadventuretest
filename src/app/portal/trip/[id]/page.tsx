import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, money } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { features } from "@/lib/admin/features";
import { getTrip } from "@/lib/content";
import { DETAIL_FIELDS, FILE_KINDS, getTraveller, ownBooking, readDetails, tripEnd } from "@/lib/server/portal";
import { PortalShell } from "../../shell";
import { DetailsForm, Documents } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your trip" };

/** Whole days from now until a date (server time, per request). */
function daysUntil(x: Date) {
  return Math.ceil((x.getTime() - new Date().getTime()) / 86_400_000);
}

const d = (x: Date) => x.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await features()).portal.enabled) redirect("/login/");
  const t = await getTraveller();
  if (!t) redirect("/login/");
  const { id } = await params;
  const b = await ownBooking(t.id, id);
  if (!b) notFound();
  const trip = getTrip(b.tripSlug);
  const [payments, files, count] = await Promise.all([
    db.payment.findMany({ where: { bookingId: b.id, status: "succeeded" }, orderBy: { createdAt: "asc" } }),
    db.travellerFile.findMany({ where: { bookingId: b.id }, orderBy: { createdAt: "desc" } }),
    db.booking.count({ where: { travellerId: t.id } }),
  ]);
  const total = Number(b.total);
  const paid = Number(b.paid);
  const balance = Math.max(0, total - paid);
  const details = readDetails(b.detailsEnc);
  const filled = DETAIL_FIELDS.filter((f) => details[f.key]).length;
  const daysTo = daysUntil(b.startDate);

  return (
    <PortalShell name={t.name}>
      {count > 1 ? <Link href="/" className="text-sm font-semibold text-pine hover:underline">← All my trips</Link> : null}
      <section className="relative mt-2 overflow-hidden rounded-3xl bg-pine-night text-white shadow-lg">
        {trip?.cover?.src ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={trip.cover.src} alt="" className="absolute inset-0 size-full object-cover opacity-55" />) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-pine-night via-pine-night/50 to-transparent" />
        <div className="relative px-6 pt-24 pb-7 sm:px-10 sm:pt-32 sm:pb-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/75 uppercase">Booking {b.reference}</p>
          <h1 className="font-display mt-2 text-3xl leading-tight font-bold sm:text-4xl">{b.tripTitle}</h1>
          <p className="mt-2 text-white/85">{d(b.startDate)} to {d(tripEnd(b))} · {b.pax} {b.pax === 1 ? "traveller" : "travellers"}</p>
          {daysTo > 0 ? <p className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">{daysTo} {daysTo === 1 ? "day" : "days"} to go</p> : null}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-card p-6 shadow-sm lg:col-span-1">
          <h2 className="font-display text-lg font-bold">Payments</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Trip total</dt><dd className="font-semibold">{money(total)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd className="font-semibold text-pine">{money(paid)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">Balance</dt><dd className="font-bold">{money(balance)}</dd></div>
          </dl>
          <div className="mt-4">{balance <= 0.5 ? <Badge tone="green">Paid in full</Badge> : <Badge tone="amber">Balance due before the trip</Badge>}</div>
          {payments.length ? (
            <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              {payments.map((p) => <li key={p.id} className="flex justify-between"><span className="text-muted">{p.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span><span className="font-semibold">{money(Number(p.amount))}</span></li>)}
            </ul>
          ) : null}
          {balance > 0.5 && b.paymentUrl ? <a href={b.paymentUrl} rel="noopener noreferrer" target="_blank" className="mt-5 block rounded-full bg-pine px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-pine-deep">Pay the balance on WeTravel</a> : null}
          <p className="mt-4 text-xs text-muted">Receipts come from WeTravel by email.</p>
        </section>

        <section className="rounded-2xl border border-line bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Documents</h2><span className="text-xs text-muted">PDF or photo, up to 10 MB</span></div>
          <Documents bookingId={b.id} files={files.map((f) => ({ id: f.id, name: f.name, kind: FILE_KINDS[f.kind as keyof typeof FILE_KINDS] ?? "Other", bytes: f.bytes, fromOffice: f.uploadedBy !== "traveller", date: f.createdAt.toISOString() }))} />
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold">Your details</h2><p className="mt-1 text-sm text-muted">For permits, airport pickup and your safety on the trail. Encrypted, only our office can see them.</p></div>
          <Badge tone={filled >= 10 ? "green" : "amber"}>{filled} of {DETAIL_FIELDS.length} filled</Badge>
        </div>
        <DetailsForm bookingId={b.id} initial={details as Record<string, string>} fields={DETAIL_FIELDS} />
      </section>

      {trip ? (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Before you go</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <li><a className="font-semibold text-pine hover:underline" href={`https://basecampadventure.com/trip/${trip.slug}/`}>Day-by-day itinerary →</a></li>
            <li><a className="font-semibold text-pine hover:underline" href={`https://basecampadventure.com/trip/${trip.slug}/#equipment`}>Packing list →</a></li>
            <li><a className="font-semibold text-pine hover:underline" href="https://basecampadventure.com/visa-info/nepal/">Nepal visa →</a></li>
            <li><a className="font-semibold text-pine hover:underline" href="https://basecampadventure.com/nepal-visa-information/">Visa and arrival tips →</a></li>
          </ul>
        </section>
      ) : null}
    </PortalShell>
  );
}
