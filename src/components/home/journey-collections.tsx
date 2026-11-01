import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TripCard } from "@/components/trip-card";
import { Accent, SectionHeading } from "@/components/section-heading";
import type { TripCard as Card } from "@/lib/types";

export function JourneyCollections({ tours, luxury, regionNames }: { tours: Card[]; luxury: Card[]; regionNames: Record<string, string> }) {
  const tourSlugs = new Set(tours.map((trip) => trip.slug));
  const luxuryTrips = luxury.filter((trip) => !tourSlugs.has(trip.slug));
  const luxurySlugs = new Set(luxuryTrips.map((trip) => trip.slug));
  const items = [tours[0], tours[1], luxuryTrips[0], tours[2], luxuryTrips[1], tours[3]]
    .filter((trip): trip is Card => Boolean(trip));

  return (
    <section className="border-t border-line pt-14 pb-5 sm:pt-16 sm:pb-6 lg:pt-20 lg:pb-7">
      <div className="mx-auto max-w-site px-4 sm:px-6">
        <SectionHeading eyebrow="Journeys beyond the ordinary" lines={["Discover Nepal.", <Accent key="way">Your way.</Accent>]} />
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">From cultural discoveries and scenic flights to mountain journeys with extra comfort. Choose the way you want to experience Nepal.</p>
        <div className="journey-collection-grid package-grid-gap mt-8 grid sm:grid-cols-2 lg:grid-cols-3">
          {items.map((trip, index) => {
            const isLuxury = luxurySlugs.has(trip.slug);
            const photoWidth = [0, 5].includes(index) ? "42vw" : [1, 3].includes(index) ? "25vw" : "33vw";
            return <TripCard key={trip.slug} trip={trip} regionName={isLuxury ? regionNames[trip.destinations[0]] : "Nepal Tour"} label={isLuxury ? "Luxury" : undefined} imageSizes={`(max-width: 640px) 92vw, (max-width: 1024px) 46vw, ${photoWidth}`} imageQuality={80} />;
          })}
        </div>
        <div className="mt-8 flex justify-end"><Link href="/trip/" className="inline-flex items-center gap-2 rounded-full border border-pine/30 px-5 py-3 text-sm font-bold text-pine transition-colors hover:bg-pine hover:text-white">View more <ArrowRight className="size-4" aria-hidden /></Link></div>
      </div>
    </section>
  );
}
