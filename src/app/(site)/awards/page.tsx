import { TripAwards } from "@/components/trip/trip-awards";
import { Breadcrumbs } from "@/components/page-hero";
import { meta } from "@/lib/seo";

export const metadata = meta({
  path: "/awards/",
  title: "Awards & Certificates",
  description: "Base Camp Adventure’s Tripadvisor Travellers’ Choice awards and Certificates of Excellence.",
});

export default function AwardsPage() {
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
    <Breadcrumbs items={[{ name: "Awards & certificates", path: "/awards/" }]} />
    <p className="eyebrow mt-8 text-pine">Recognised by travellers</p>
    <h1 className="font-display mt-3 text-4xl leading-tight tracking-tight sm:text-5xl">Awards & certificates</h1>
    <p className="mt-4 text-sm leading-relaxed text-ink-soft">Explore Base Camp Adventure’s Tripadvisor awards and Certificates of Excellence. Select an award to read our traveller reviews on Tripadvisor.</p>
    <div className="mt-8"><TripAwards full /></div>
  </div>;
}
