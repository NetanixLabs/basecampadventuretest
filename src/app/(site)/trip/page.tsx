import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { TripExplorer } from "@/components/trip-explorer";
import { TripGrid } from "@/components/trip-grid";
import { getLiveTerms, getTripCards } from "@/lib/content";
import { itemListLd, meta } from "@/lib/seo";

export const metadata = meta({
  path: "/trip/",
  title: "All Trips: Treks, Tours & Climbs in Nepal, Bhutan and Tibet",
  description:
    "Browse every Base Camp Adventure trip: Everest, Annapurna, Langtang and Manaslu treks, peak climbing, cultural tours, rafting, Bhutan and Tibet. Filter by region, days and budget.",
});

export default function TripsPage() {
  const trips = getTripCards();
  const { destinations, activities } = getLiveTerms();
  const regionNames = Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
  const opt = (t: { slug: string; name: string; trips: number }) => ({ slug: t.slug, name: t.name, count: t.trips });

  return (
    <>
      <PageHero
        title="Find Your"
        accent="Trip"
        eyebrow={`${trips.length} trips · 8 regions · 3 countries`}
        intro="Start planning your journey to experience the Himalayas."
        photo="/photos/page-trips.webp"
        crumbs={[{ name: "All trips", path: "/trip/" }]}
      />
      <section className="mx-auto max-w-site px-4 pb-24 sm:px-6">
        <Link href="/trip-finder/" className="group mb-8 flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition-colors hover:border-pine sm:p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pine/10 text-pine transition-colors group-hover:bg-pine group-hover:text-white"><Sparkles className="size-5" aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block font-bold">Not sure where to start?</span><span className="block text-sm text-muted">Answer 5 quick questions and we&apos;ll suggest the trips that fit you best.</span></span>
          <span className="hidden items-center gap-1.5 text-sm font-bold text-pine sm:inline-flex">Try the trip finder <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
          <ArrowRight className="size-5 shrink-0 text-pine sm:hidden" aria-hidden />
        </Link>
        <h2 className="sr-only">All trips</h2>
        <Suspense fallback={<TripGrid trips={trips.slice(0, 12)} regionNames={regionNames} />}>
          <TripExplorer trips={trips} regions={destinations.map(opt)} activities={activities.map(opt)} regionNames={regionNames} />
        </Suspense>
      </section>
      <JsonLd data={itemListLd("All trips", trips.map((t) => `/trip/${t.slug}/`))} />
    </>
  );
}
