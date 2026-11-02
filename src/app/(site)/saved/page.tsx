import { PageHero } from "@/components/page-hero";
import { SavedTrips } from "@/components/saved-trips";
import { getLiveTerms, getTripCards } from "@/lib/content";
import { meta } from "@/lib/seo";
import { savedByToken } from "@/lib/server/saved";

export const metadata = { ...meta({ path: "/saved/", title: "Your Saved Trips", description: "The Base Camp Adventure trips you saved, ready to compare, share or email to yourself." }), robots: { index: false, follow: true } };

export default async function SavedPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const list = (await searchParams).list;
  const restore = list ? await savedByToken(list) : null;
  const { destinations } = getLiveTerms();
  return (
    <>
      <PageHero title="Saved" accent="Trips" eyebrow="Your shortlist" intro="The trips you've hearted, kept on this device. Email the list to yourself to open it anywhere." photo="/photos/page-trips.webp" crumbs={[{ name: "All trips", path: "/trip/" }, { name: "Saved trips", path: "/saved/" }]} />
      <section className="mx-auto max-w-site px-4 pb-24 sm:px-6">
        <SavedTrips trips={getTripCards()} regionNames={Object.fromEntries(destinations.map((d) => [d.slug, d.name]))} restore={restore} />
      </section>
    </>
  );
}
