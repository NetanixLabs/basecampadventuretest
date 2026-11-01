import { Suspense } from "react";
import { PageHero } from "@/components/page-hero";
import { Accent, SectionHeading } from "@/components/section-heading";
import { TripRequest, type RequestTrip } from "@/components/trip-request";
import { getTripCards } from "@/lib/content";
import { meta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = meta({
  path: "/customize-trip/",
  title: "Customize Your Trip",
  description: "Tell us your dates, interests and fitness and a local guide will design a private Nepal, Bhutan or Tibet itinerary around you. Free, with no obligation.",
});

export default function CustomizeTripPage() {
  const trips: RequestTrip[] = getTripCards()
    .map((t) => ({ slug: t.slug, title: t.title, days: t.days, price: t.price?.amount ?? null }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <>
      <PageHero
        title="Customize"
        accent="Your Trip"
        eyebrow="Base Camp Adventure"
        intro={site.customize}
        photo="/photos/page-customize.webp"
        crumbs={[{ name: "Customize your trip", path: "/customize-trip/" }]}
      />
      <section id="request" className="mx-auto max-w-site scroll-mt-28 px-4 py-14 sm:px-6 sm:py-20 lg:px-6">
        <SectionHeading eyebrow="Four short steps" lines={["Start your", <Accent key="r">trip request.</Accent>]} />
        <div className="mt-10">
          <Suspense fallback={<div className="h-[36rem] rounded-2xl border border-line bg-card" />}>
            <TripRequest trips={trips} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
