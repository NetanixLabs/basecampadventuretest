import { missing } from "@/lib/not-found";
import { CollectionPage } from "@/components/collection-page";
import { getActivity, getLiveTerms, getPostCards, getTripsIn, termSummary } from "@/lib/content";
import { meta } from "@/lib/seo";
import { activityMeta } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// New pages published from the admin render on first visit, then stay cached.
export const dynamicParams = true;

export function generateStaticParams() {
  return getLiveTerms().activities.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const term = getActivity(slug);
  if (!term) return {};
  const trips = getTripsIn("activities", slug);
  const prices = trips.map((t) => t.price?.amount).filter((n): n is number => Boolean(n));
  const lead = prices.length ? `${trips.length} trips from US$${Math.min(...prices).toLocaleString("en-US")}.` : null;
  return meta({
    lead,
    path: `/activities/${slug}/`,
    title: term.name,
    description: `${trips.length} ${term.name} trips with Base Camp Adventure. ${termSummary("activities", slug).line}`,
    seo: term.seo,
    image: activityMeta[slug]?.photo,
  });
}

export default async function ActivityPage({ params }: Props) {
  const { slug } = await params;
  const term = getActivity(slug);
  if (!term) missing(`/activities/${slug}/`);
  const trips = getTripsIn("activities", slug);
  const m = activityMeta[slug];
  const word = term.name.split(" ")[0].toLowerCase();

  return (
    <CollectionPage
      term={term}
      kind="activity"
      trips={trips}
      photo={m?.photo ?? trips[0]?.cover?.src ?? "/photos/page-activities.webp"}
      line={termSummary("activities", slug).line}
      crumbs={[
        { name: "Activities", path: "/activities/" },
        { name: term.name, path: `/activities/${slug}/` },
      ]}
      guides={getPostCards().filter((p) => p.title.toLowerCase().includes(word)).slice(0, 3)}
    />
  );
}
