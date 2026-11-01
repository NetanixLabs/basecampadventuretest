import Link from "next/link";
import Image from "@/components/image";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { visaGuides } from "@/content/visa-guides";
import { meta } from "@/lib/seo";

export const metadata = meta({ path: "/visa-info/", title: "Tourist Visa Information: Nepal, Tibet & Bhutan", description: "Tourist visa fees, stays, application steps, documents and official application links for Nepal, Tibet and Bhutan." });
export default function VisaIndexPage() {
  return (
    <>
      <PageHero title="Before you" accent="travel" eyebrow="Visa information" intro="Find the entry requirements, fees and application steps for your destination." photo="/photos/activity-tour.webp" crumbs={[{ name: "Visa information", path: "/visa-info/" }]} />
      <div className="mx-auto grid max-w-site gap-6 px-4 py-14 sm:px-6 lg:grid-cols-3">{Object.entries(visaGuides).map(([slug, guide]) => <Link key={slug} href={`/visa-info/${slug}/`} className="group overflow-hidden rounded-2xl border border-line bg-card"><div className="relative aspect-[16/9]"><Image src={guide.photo} alt={guide.country} fill sizes="(max-width: 1024px) 92vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /></div><div className="p-6"><h2 className="font-display text-2xl">{guide.country} Visa</h2><p className="mt-3 text-sm leading-relaxed text-muted">{guide.intro}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-pine">View visa guide<ArrowRight className="size-4" aria-hidden /></span></div></Link>)}</div>
    </>
  );
}
