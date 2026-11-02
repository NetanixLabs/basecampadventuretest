import { PageHero } from "@/components/page-hero";
import { TripFinder } from "@/components/trip-finder";
import { getLiveTerms, getTripCards } from "@/lib/content";
import { meta } from "@/lib/seo";

export const metadata = meta({
  path: "/trip-finder/",
  title: "Trip Finder: Which Himalayan Trek or Tour Suits You?",
  description: "Answer five quick questions about time, budget, altitude and style, and we suggest the Nepal, Bhutan or Tibet trips that fit you best.",
});

export default function TripFinderPage() {
  const trips = getTripCards();
  const { destinations } = getLiveTerms();
  const regionNames = Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
  return (
    <>
      <PageHero title="Trip" accent="Finder" eyebrow="5 questions · 30 seconds" intro="Tell us a little about you and we'll suggest the trips that fit best." photo="/photos/page-trips.webp" crumbs={[{ name: "All trips", path: "/trip/" }, { name: "Trip finder", path: "/trip-finder/" }]} />
      <section className="mx-auto max-w-site px-4 pb-24 sm:px-6">
        <TripFinder trips={trips} regionNames={regionNames} />
      </section>
    </>
  );
}
