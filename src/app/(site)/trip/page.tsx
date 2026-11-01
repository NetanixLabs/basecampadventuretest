import { Suspense } from "react";
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
        <Suspense fallback={<TripGrid trips={trips.slice(0, 12)} regionNames={regionNames} />}>
          <TripExplorer trips={trips} regions={destinations.map(opt)} activities={activities.map(opt)} regionNames={regionNames} />
        </Suspense>
      </section>
      <JsonLd data={itemListLd("All trips", trips.map((t) => `/trip/${t.slug}/`))} />
    </>
  );
}
