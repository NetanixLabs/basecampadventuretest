import { missing } from "@/lib/not-found";
import { CollectionPage } from "@/components/collection-page";
import { getDestination, getGuidesForRegion, getLiveTerms, getTripsIn, termSummary } from "@/lib/content";
import { meta } from "@/lib/seo";
import { regionMeta } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// New pages published from the admin render on first visit, then stay cached.
export const dynamicParams = true;

export function generateStaticParams() {
  return getLiveTerms().destinations.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const term = getDestination(slug);
  if (!term) return {};
  const trips = getTripsIn("destinations", slug);
  const prices = trips.map((t) => t.price?.amount).filter((n): n is number => Boolean(n));
  const lead = prices.length ? `${trips.length} trips from US$${Math.min(...prices).toLocaleString("en-US")}.` : null;
  return meta({
    lead,
    path: `/destinations/${slug}/`,
    title: `${term.name} Trips & Treks`,
    description: `${trips.length} ${term.name} trips with Base Camp Adventure. ${termSummary("destinations", slug).line}`,
    seo: term.seo,
    image: regionMeta[slug]?.photo,
  });
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const term = getDestination(slug);
  if (!term) missing(`/destinations/${slug}/`);
  const trips = getTripsIn("destinations", slug);
  const m = regionMeta[slug];

  return (
    <CollectionPage
      term={term}
      kind="destination"
      trips={trips}
      photo={m?.photo ?? trips[0]?.cover?.src ?? "/photos/page-destinations.webp"}
      line={termSummary("destinations", slug).line}
      crumbs={[
        { name: "Destinations", path: "/destination/" },
        { name: term.name, path: `/destinations/${slug}/` },
      ]}
      guides={getGuidesForRegion(slug, 3)}
    />
  );
}
