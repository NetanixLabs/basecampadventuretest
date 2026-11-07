import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, money } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { features } from "@/lib/admin/features";
import { getTrip } from "@/lib/content";
import { DETAIL_FIELDS, FILE_KINDS, detailsFor, getTraveller, isLead, ownBooking, readDetails, tripEnd, visibleBookings } from "@/lib/server/portal";
import { docChecklist, packingItems } from "@/lib/server/checklist";
import { payLink } from "@/lib/server/gateway";
import { vapid } from "@/lib/server/push";
import { CalendarClock, CheckCircle2, CircleDollarSign } from "lucide-react";
import { Packing } from "./packing";
import { Group, PushToggle } from "./group";
import { PortalShell } from "../../shell";
import { DetailsForm, Documents } from "./client";
import { BottomNav, PortalReview } from "./extra";
import { Chat } from "@/components/chat";
import { reviewLinks } from "@/components/trip/review-us";
import { markRead, thread, unreadFor } from "@/lib/server/messages";

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
  const lead = isLead(t.id, b);
  const [payments, files, count, unread, photos, receipts, reviewed, access, packing] = await Promise.all([
    db.payment.findMany({ where: { bookingId: b.id, status: "succeeded" }, orderBy: { createdAt: "asc" } }),
    db.travellerFile.findMany({ where: { bookingId: b.id }, orderBy: { createdAt: "desc" } }),
    db.booking.count({ where: visibleBookings(t.id) }),
    unreadFor(b.id, "traveller"),
    db.tripPhoto.findMany({ where: { departure: { tripSlug: b.tripSlug, startDate: b.startDate } }, orderBy: { createdAt: "desc" }, select: { id: true } }),
    lead ? db.receipt.findMany({ where: { bookingId: b.id, voidedAt: null }, orderBy: { issuedAt: "desc" } }) : [],
    db.tripReview.count({ where: { bookingId: b.id } }),
    db.bookingAccess.findMany({ where: { bookingId: b.id }, orderBy: { createdAt: "asc" }, include: { traveller: { select: { id: true, name: true, email: true, passwordHash: true } } } }),
    db.packingList.findUnique({ where: { bookingId_travellerId: { bookingId: b.id, travellerId: t.id } } }),
  ]);
  const f = await features();
  const messages = await thread(b.id);
  // Opening the trip page shows the conversation, so the office sees "Seen".
  if (unread) await markRead(b.id, "traveller");
  const tripOver = daysUntil(tripEnd(b)) < 0;
  const total = Number(b.total);
  const paid = Number(b.paid);
  const balance = Math.max(0, total - paid);
  const details = await detailsFor(t.id, b);
  const checklist = docChecklist(b, files, [readDetails(b.detailsEnc), ...access.map((a) => readDetails(a.detailsEnc))]);
  const items = packingItems(b.tripSlug);
  const pushKey = f.push.enabled ? (await vapid()).publicKey : null;
  // Payment plan: the deposit (paid at booking), then the balance by its due date.
  const dueDate = new Date(b.startDate.getTime() - f.balance.dueDays * 86_400_000);
  const dueIn = daysUntil(dueDate);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const filled = DETAIL_FIELDS.filter((f) => details[f.key]).length;
  const daysTo = daysUntil(b.startDate);

  return (
    <PortalShell name={t.name}>
      {count > 1 ? <Link href="/" className="text-sm font-semibold text-pine hover:underline">← All my trips</Link> : null}
      <section id="trip" className="relative mt-2 scroll-mt-20 overflow-hidden rounded-3xl bg-pine-night text-white shadow-lg">
        {trip?.cover?.src ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={trip.cover.src} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 size-full object-cover opacity-55" />) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-pine-night via-pine-night/50 to-transparent" />
        <div className="relative px-6 pt-24 pb-7 sm:px-10 sm:pt-32 sm:pb-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/75 uppercase">Booking {b.reference}</p>
          <h1 className="font-display mt-2 text-3xl leading-tight font-bold sm:text-4xl">{b.tripTitle}</h1>
          <p className="mt-2 text-white/85">{d(b.startDate)} to {d(tripEnd(b))} · {b.pax} {b.pax === 1 ? "traveller" : "travellers"}</p>
          {daysTo > 0 ? <p className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">{daysTo} {daysTo === 1 ? "day" : "days"} to go</p> : null}
        </div>
      </section>

      {pushKey && !tripOver ? <div className="mt-6"><PushToggle publicKey={pushKey} /></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {lead ? (
          <section id="payments" className="scroll-mt-20 self-start rounded-2xl border border-line bg-card p-6 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Payment plan</h2>{balance <= 0.5 ? <Badge tone="green">Paid in full</Badge> : null}</div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-sm"><span className="font-semibold text-pine">{money(paid)} paid</span><span className="text-muted">of {money(total)}</span></div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Paid so far"><div className="h-full rounded-full bg-pine" style={{ width: `${pct}%` }} /></div>
            </div>
            <ol className="relative mt-5 space-y-4 border-l-2 border-line pl-5">
              {payments.map((p, i) => (
                <li key={p.id} className="relative">
                  <CheckCircle2 className="absolute top-0.5 -left-[1.95rem] size-5 rounded-full bg-card text-pine" aria-hidden />
                  <p className="text-sm font-semibold">{Number(p.amount) < 0 ? "Refund" : i === 0 && b.plan === "deposit" ? "Deposit" : "Payment"} · {money(Math.abs(Number(p.amount)))}</p>
                  <p className="text-xs text-muted">{Number(p.amount) < 0 ? "Refunded" : "Paid"} {p.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                </li>
              ))}
              {balance > 0.5 ? (
                <li className="relative">
                  {dueIn < 0 ? <CircleDollarSign className="absolute top-0.5 -left-[1.95rem] size-5 rounded-full bg-card text-crimson" aria-hidden /> : <CalendarClock className="absolute top-0.5 -left-[1.95rem] size-5 rounded-full bg-card text-amber-600" aria-hidden />}
                  <p className="text-sm font-semibold">Balance · {money(balance)}</p>
                  <p className={`text-xs ${dueIn < 0 ? "font-semibold text-crimson" : "text-muted"}`}>{f.balance.dueDays === 0 ? "Due on arrival in Kathmandu" : dueIn < 0 ? `Was due ${d(dueDate)}` : `Due by ${d(dueDate)}${dueIn <= 60 ? ` · in ${dueIn} ${dueIn === 1 ? "day" : "days"}` : ""}`}</p>
                </li>
              ) : null}
            </ol>
            {balance > 0.5 ? <a href={payLink(b.reference)} rel="noopener noreferrer" target="_blank" className="mt-5 block rounded-full bg-pine px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-pine-deep">Pay {money(balance)} now</a> : null}
            <p className="mt-4 text-xs text-muted">{receipts.length ? <a href="#receipts" className="font-semibold text-pine hover:underline">Download your receipts ↓</a> : "Your receipt is emailed to you after each payment."} {balance > 0.5 ? "Card or bank transfer, secure." : ""}</p>
          </section>
        ) : (
          <section className="rounded-2xl border border-line bg-card p-6 shadow-sm lg:col-span-1">
            <h2 className="font-display text-lg font-bold">Your group</h2>
            <p className="mt-2 text-sm text-muted">{b.leadName} booked this trip for {b.pax} {b.pax === 1 ? "traveller" : "travellers"} and handles the payments.</p>
            <a href="#group" className="mt-3 inline-block text-sm font-semibold text-pine hover:underline">See who&apos;s going ↓</a>
          </section>
        )}

        <section id="documents" className="scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Documents</h2><span className="text-xs text-muted">PDF or photo, up to 10 MB</span></div>
          <Documents bookingId={b.id} checklist={checklist} files={files.map((f) => ({ id: f.id, name: f.name, kind: FILE_KINDS[f.kind as keyof typeof FILE_KINDS] ?? "Other", bytes: f.bytes, fromOffice: f.uploadedBy !== "traveller", date: f.createdAt.toISOString() }))} />
        </section>
      </div>

      <section id="details" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold">Your details</h2><p className="mt-1 text-sm text-muted">For permits, airport pickup and your safety on the trail. Encrypted, only our office can see them.</p></div>
          <Badge tone={filled >= 10 ? "green" : "amber"}>{filled} of {DETAIL_FIELDS.length} filled</Badge>
        </div>
        <DetailsForm bookingId={b.id} initial={details as Record<string, string>} fields={DETAIL_FIELDS} />
      </section>

      <section id="packing" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold">Packing checklist</h2>
        <p className="mt-1 text-sm text-muted">Everything on our list for {b.tripTitle}. Tick what is already in your bag; add your own items too.</p>
        <Packing bookingId={b.id} items={items} initialPacked={packing?.packed ?? []} initialExtra={(packing?.extra as { name: string; packed: boolean }[] | null) ?? []} group={access.length > 0} />
      </section>

      <section id="messages" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">Messages{unread ? <span className="rounded-full bg-crimson px-2 py-0.5 text-xs text-white">{unread} new</span> : null}</h2>
        <p className="mt-1 text-sm text-muted">Questions about your trip or documents? Write to our office here.</p>
        <Chat sheet bookingId={b.id} side="traveller" initial={messages} empty="Ask us anything about your trip: flights, permits, gear, documents." />
      </section>

      {b.pax > 1 || access.length ? (
        <section id="group" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Who&apos;s going</h2>
          <p className="mt-1 text-sm text-muted">{lead ? "Give everyone in your group their own access to this page." : "Everyone on this booking."}</p>
          <Group bookingId={b.id} lead={b.leadName} pax={b.pax} canEdit={lead} members={access.map((a) => ({ id: a.traveller.id, name: a.traveller.name, email: lead ? a.traveller.email : "", joined: Boolean(a.traveller.passwordHash), you: a.traveller.id === t.id }))} />
        </section>
      ) : null}

      {photos.length ? (
        <section id="photos" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Trip photos</h2>
          <p className="mt-1 text-sm text-muted">From our team, for everyone on your departure. Tap a photo to download it.</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id}>
                <a href={`/api/photo/${p.id}/?download=1`} className="block overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photo/${p.id}/?w=600`} alt="Trip photo" loading="lazy" className="aspect-square w-full object-cover transition-transform hover:scale-105" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {receipts.length ? (
        <section id="receipts" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Receipts & bills</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {receipts.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <span><strong className="font-mono">{r.number}</strong><span className="block text-xs text-muted">{r.kind === "bill" ? "Bill" : r.kind === "credit" ? "Credit note (refund)" : "Receipt"} · {r.issuedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {money(Number(r.total), r.currency)}</span></span>
                <a href={`/api/receipt/${r.id}/`} className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-pine hover:text-pine">Download PDF</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tripOver && f.reviews.enabled && !reviewed ? (
        <section id="review" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">How was your trip?</h2>
          <p className="mt-1 text-sm text-muted">A short review helps other travellers and means a lot to our guides and porters.</p>
          <PortalReview bookingId={b.id} country={b.leadCountry} links={reviewLinks()} />
        </section>
      ) : null}

      {trip ? (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold">Before you go</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <li><a className="font-semibold text-pine hover:underline" href={`https://basecampadventure.com/trip/${trip.slug}/`}>Day-by-day itinerary →</a></li>
            <li><a className="font-semibold text-pine hover:underline" href="#packing">Packing checklist ↑</a></li>
            <li><a className="font-semibold text-pine hover:underline" href="https://basecampadventure.com/visa-info/nepal/">Nepal visa →</a></li>
            <li><a className="font-semibold text-pine hover:underline" href="https://basecampadventure.com/nepal-visa-information/">Visa and arrival tips →</a></li>
          </ul>
        </section>
      ) : null}
      <BottomNav photos={photos.length > 0} unread={unread} />
    </PortalShell>
  );
}
