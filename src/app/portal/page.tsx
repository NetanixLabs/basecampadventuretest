import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/admin/db";
import { features } from "@/lib/admin/features";
import { getTrip } from "@/lib/content";
import { eligible, getTraveller, PAID_STATUSES, visibleBookings } from "@/lib/server/portal";
import { PortalShell } from "./shell";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  if (!(await features()).portal.enabled) redirect("/login/");
  const t = await getTraveller();
  if (!t) redirect("/login/");
  const bookings = (await db.booking.findMany({ where: { ...visibleBookings(t.id), status: { in: [...PAID_STATUSES] } }, orderBy: { startDate: "asc" } })).filter(eligible);
  if (bookings.length === 1) redirect(`/trip/${bookings[0].id}/`);
  return (
    <PortalShell name={t.name}>
      <h1 className="font-display text-3xl font-bold tracking-tight">Namaste, {t.name.split(" ")[0]}</h1>
      <p className="mt-2 text-muted">Your trips with us.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {bookings.map((b) => {
          const trip = getTrip(b.tripSlug);
          return (
            <li key={b.id}>
              <Link href={`/trip/${b.id}/`} className="block overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition hover:border-pine">
                {trip?.cover?.src ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={trip.cover.src} alt="" className="aspect-[16/7] w-full object-cover" />) : null}
                <div className="p-5"><p className="font-display text-lg font-bold">{b.tripTitle}</p><p className="mt-1 text-sm text-muted">{b.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })} · {b.reference}</p></div>
              </Link>
            </li>
          );
        })}
      </ul>
      {!bookings.length ? <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-sm text-muted">No trips are linked to this account yet.</p> : null}
    </PortalShell>
  );
}
