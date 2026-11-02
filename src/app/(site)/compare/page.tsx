import Image from "@/components/image";
import Link from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ApproxPrice } from "@/components/currency";
import { CompareSync, RemoveFromCompare } from "@/components/compare-tools";
import { getDestination, getTrip } from "@/lib/content";
import { meta } from "@/lib/seo";
import { usd } from "@/lib/utils";

export const metadata = { ...meta({ path: "/compare/", title: "Compare Trips Side by Side", description: "Compare up to three Base Camp Adventure trips side by side: price, days, altitude, group size, highlights and what's included." }), robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ trips?: string }> };

export default async function ComparePage({ searchParams }: Props) {
  const slugs = String((await searchParams).trips ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,120}$/.test(s)).slice(0, 3);
  const trips = slugs.map((s) => getTrip(s)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const region = (slug?: string) => (slug ? getDestination(slug)?.name ?? "" : "");
  const all: { label: string; cell: (t: (typeof trips)[number]) => React.ReactNode; has?: (t: (typeof trips)[number]) => boolean }[] = [
    { label: "Price from", cell: (t) => (t.price ? <span><strong className="font-display text-xl">{usd(t.price.amount)}</strong> <span className="text-xs text-muted">per adult</span><ApproxPrice usd={t.price.amount} className="block text-xs text-muted" /></span> : <span className="text-muted">On request</span>) },
    { label: "Duration", cell: (t) => `${t.days} days` },
    { label: "Highest point", has: (t) => Boolean(t.maxAltitude), cell: (t) => (t.maxAltitude ? `${t.maxAltitude.toLocaleString("en-US")} m` : "—") },
    { label: "Region", cell: (t) => region(t.destinations[0]) || "—" },
    { label: "Group size", cell: (t) => (t.groupSize?.min ? `${t.groupSize.min}${t.groupSize.max ? `–${t.groupSize.max}` : "+"} people` : "Private or group") },
    { label: "Reviews", has: (t) => Boolean(t.rating), cell: (t) => (t.rating ? <span className="inline-flex items-center gap-1"><Star className="size-4 fill-marigold text-marigold" aria-hidden /> {t.rating.value.toFixed(1)} <span className="text-muted">({t.rating.count})</span></span> : "—") },
    { label: "Starts / ends", has: (t) => t.itinerary.length > 0, cell: (t) => { const a = t.itinerary[0]?.title; const b = t.itinerary.at(-1)?.title; return a ? <span className="text-sm">{a}{b && b !== a ? <><br /><span className="text-muted">→ {b}</span></> : null}</span> : "—"; } },
    { label: "Highlights", has: (t) => t.highlights.length > 0, cell: (t) => (t.highlights.length ? <ul className="space-y-1 text-sm">{t.highlights.slice(0, 4).map((h) => <li key={h} className="flex gap-1.5"><Check className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden />{h}</li>)}</ul> : "—") },
    { label: "Included", has: (t) => t.includes.length > 0, cell: (t) => (t.includes.length ? <ul className="space-y-1 text-sm">{t.includes.slice(0, 5).map((h) => <li key={h} className="flex gap-1.5"><Check className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden /><span className="line-clamp-2">{h}</span></li>)}{t.includes.length > 5 ? <li className="text-muted">+ {t.includes.length - 5} more</li> : null}</ul> : "—") },
  ];
  // Rows where no trip has anything to show are left out.
  const rows = all.filter((r) => !r.has || trips.some(r.has));
  return (
    <>
      <PageHero title="Compare" accent="Trips" eyebrow="Side by side" intro="Up to three trips next to each other, so the choice is easy." photo="/photos/page-trips.webp" crumbs={[{ name: "All trips", path: "/trip/" }, { name: "Compare", path: "/compare/" }]} />
      <CompareSync current={trips.map((t) => t.slug)} />
      <section className="mx-auto max-w-site px-4 pb-24 sm:px-6">
        {trips.length ? (
          <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-left">
              <caption className="sr-only">Trip comparison</caption>
              <colgroup><col className="w-32 sm:w-44" />{trips.map((t) => <col key={t.slug} />)}</colgroup>
              <thead>
                <tr>
                  <td />
                  {trips.map((t) => (
                    <th key={t.slug} scope="col" className="px-2 pb-4 align-top font-normal">
                      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
                        <div className="relative aspect-[3/2] bg-snow-2">{t.cover ? <Image src={t.cover.src} alt={t.cover.alt || t.title} fill sizes="(max-width: 768px) 60vw, 28vw" className="object-cover" /> : null}<RemoveFromCompare slug={t.slug} /></div>
                        <div className="p-4"><Link href={`/trip/${t.slug}/`} className="font-display line-clamp-2 text-lg leading-snug hover:text-pine">{t.title}</Link></div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.label}>
                    <th scope="row" className={`sticky left-0 z-10 rounded-l-xl px-3 py-3.5 align-top text-xs font-bold tracking-wide text-muted uppercase ${i % 2 ? "bg-snow" : "bg-snow-2"}`}>{r.label}</th>
                    {trips.map((t, j) => <td key={t.slug} className={`px-3 py-3.5 align-top ${i % 2 ? "" : "bg-snow-2"} ${j === trips.length - 1 ? "rounded-r-xl" : ""}`}>{r.cell(t)}</td>)}
                  </tr>
                ))}
                <tr>
                  <td />
                  {trips.map((t) => (
                    <td key={t.slug} className="px-2 pt-4"><Link href={`/trip/${t.slug}/`} className="flex items-center justify-center gap-2 rounded-lg bg-pine py-3 text-sm font-bold text-white hover:bg-pine-deep">View trip <ArrowRight className="size-4" aria-hidden /></Link></td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mx-auto max-w-xl rounded-3xl border border-line bg-card p-10 text-center">
            <p className="font-display text-2xl">Pick trips to compare</p>
            <p className="mt-2 text-muted">Tap the compare button on any trip photo (up to three), then come back here.</p>
            <Link href="/trip/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2.5 text-sm font-bold text-white">Browse trips <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
        )}
      </section>
    </>
  );
}
