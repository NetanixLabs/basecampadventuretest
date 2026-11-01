import { TermIndex } from "@/components/term-index";
import { getLiveTerms, termSummary } from "@/lib/content";
import { meta } from "@/lib/seo";
import { regionMeta } from "@/lib/site";

export const metadata = meta({
  path: "/destination/",
  title: "Destinations: Everest, Annapurna, Langtang, Manaslu, Bhutan & Tibet",
  description: "Choose your region: Everest, Annapurna, Langtang, Manaslu, Mustang and the remote west, plus Bhutan and Tibet. Trips, prices and local guides for each.",
});

const ORDER = ["everest-region", "annapurna-region", "langtang-region", "manaslu-region", "remote-area-trekking", "nepal", "bhutan", "tibet"];

export default function DestinationsIndex() {
  const items = [...getLiveTerms().destinations]
    .sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug))
    .map((d) => ({ slug: d.slug, name: d.name, trips: d.trips, photo: regionMeta[d.slug]?.photo ?? "/photos/region-everest.webp", line: termSummary("destinations", d.slug).line }));
  return (
    <TermIndex
      base="destinations"
      path="/destination/"
      crumb="Destinations"
      title="A place for"
      accent="every journey."
      photo="/photos/page-destinations.webp"
      items={items}
    />
  );
}
