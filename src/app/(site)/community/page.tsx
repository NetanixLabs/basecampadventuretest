import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CommunityCards } from "@/components/community-cards";
import { PageHero } from "@/components/page-hero";
import { Accent, SectionHeading } from "@/components/section-heading";
import { getCommunity } from "@/lib/content";
import { meta } from "@/lib/seo";
import { whatsappHref } from "@/lib/site";

export const metadata = meta({
  path: "/community/",
  title: "Community & Social Work",
  description: "How Base Camp Adventure gives back in Nepal: flood relief in Rasuwa, sponsored local events and other community work by our Kathmandu team.",
});

export default function CommunityPage() {
  const posts = getCommunity();
  return (
    <>
      <PageHero
        title="Community"
        accent="& social work"
        eyebrow="Base Camp Adventure"
        intro="Giving back to the people and places that make every journey possible."
        photo="/photos/page-about-group.webp"
        crumbs={[
          { name: "About us", path: "/about-us/" },
          { name: "Community", path: "/community/" },
        ]}
      />

      <section className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-20 lg:px-6">
        <SectionHeading eyebrow={`${posts.length} ${posts.length === 1 ? "story" : "stories"}`} lines={["Where we", <Accent key="g">give back.</Accent>]} />
        <CommunityCards posts={posts} full className="mt-10" />
      </section>

      <section className="border-t border-line bg-snow-2">
        <div className="mx-auto flex max-w-site flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <p className="eyebrow text-pine">Work with us</p>
            <p className="font-display mt-2 text-2xl text-ink sm:text-3xl">Want to know more about our community work?</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact-us/" className="bg-pine hover:bg-pine-deep inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-bold text-white transition-colors">
              Contact us <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-line bg-card px-5 py-3.5 text-sm font-semibold">
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
