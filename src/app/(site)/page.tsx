import Image from "@/components/image";
import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { Awards } from "@/components/awards";
import { FeaturedTrips, type TripGroup } from "@/components/home/featured-trips";
import { CommunityCards } from "@/components/community-cards";
import { HomeHero } from "@/components/home/hero";
import { Offers } from "@/components/home/offers";
import { RegionShowcase } from "@/components/home/regions";
import { Testimonials } from "@/components/home/testimonials";
import { TripCarousel } from "@/components/home/trip-carousel";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { PhotoGlow } from "@/components/photo-glow";
import { Accent, SectionHeading } from "@/components/section-heading";
import { JourneyCollections } from "@/components/home/journey-collections";
import homeTourImages from "@/content/home-tour-images.json";
import {
  getActiveOffer,
  getAwards,
  getAllReviews,
  getCommunity,
  getFeaturedTrips,
  getFeaturedVideos,
  getHomeList,
  getLiveTerms,
  getOfferTrips,
  getPostCards,
  getTeam,
  getTrip,
  getTripCards,
  getTripadvisor,
  getTripsIn,
  photo,
  termSummary,
} from "@/lib/content";
import { JsonLd } from "@/components/json-ld";
import { YouTube } from "@/components/video";
import { meta, videoLd } from "@/lib/seo";
import { regionMeta, site } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export const metadata = meta({
  path: "/",
  title: "Base Camp Adventure - Tours and Trekking Company in Nepal",
  description: site.description,
});

export default function HomePage() {
  const cards = getTripCards();
  const { destinations } = getLiveTerms();
  const regionNames = Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
  const founder = getTeam().find((m) => m.slug === "shree-ghimire");
  const reviews = getAllReviews();
  const posts = getPostCards().slice(0, 3);
  const featured = getFeaturedTrips();
  const popular = getHomeList("popular");
  const luxury = getHomeList("luxury");
  const enhancedTourImages: Record<string, { src: string; w: number; h: number }> = homeTourImages;
  const tours = getTripsIn("activities", "nepal-tour").slice(0, 8).map((trip) => {
    const enhanced = enhancedTourImages[trip.slug];
    return enhanced && trip.cover ? { ...trip, cover: { ...trip.cover, ...enhanced } } : trip;
  });
  const helicopterTours = tours.filter((trip) => ["helicopter-tour", "helicopter-tours-in-nepal"].includes(trip.slug));
  const otherTours = tours.filter((trip) => !helicopterTours.some((featured) => featured.slug === trip.slug));
  const offer = getActiveOffer();
  const offerTrips = getOfferTrips(offer);
  const community = getCommunity();
  const awards = getAwards();
  const videos = getFeaturedVideos().slice(0, 3);

  const byRegion = (slug: string) => cards.filter((c) => c.destinations.includes(slug)).sort((a, b) => (b.rating?.count ?? 0) - (a.rating?.count ?? 0) || (b.price ? 1 : 0) - (a.price ? 1 : 0));
  const all = [...featured, ...popular.filter((p) => !featured.some((f) => f.slug === p.slug))];
  const groups: TripGroup[] = [
    { key: "all", label: "All adventures", trips: all, href: "/trip/" },
    { key: "everest", label: "Everest", trips: byRegion("everest-region"), href: "/destinations/everest-region/" },
    { key: "annapurna", label: "Annapurna", trips: byRegion("annapurna-region"), href: "/destinations/annapurna-region/" },
    { key: "langtang", label: "Langtang", trips: byRegion("langtang-region"), href: "/destinations/langtang-region/" },
    { key: "manaslu", label: "Manaslu", trips: byRegion("manaslu-region"), href: "/destinations/manaslu-region/" },
  ]
    .filter((g) => g.trips.length)
    // The finder shows eight per tab; sending more only weighs the page down.
    .map((g) => ({ ...g, trips: g.trips.slice(0, 8) }));

  const regionOrder = ["everest-region", "annapurna-region", "manaslu-region"];
  const panels = regionOrder
    .map((slug) => {
      const d = destinations.find((x) => x.slug === slug);
      if (!d) return null;
      const s = termSummary("destinations", slug);
      return { slug, name: d.name, line: s.line, photo: regionMeta[slug]?.photo ?? "/photos/region-everest.webp", trips: d.trips, highest: s.highest };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  for (const [slug, name] of [["kanchenjunga-base-camp-trek", "Kanchenjunga"], ["makalu-base-camp-trek", "Makalu"]]) {
    const trip = getTrip(slug);
    if (trip?.cover) panels.push({ slug: trip.slug, name, line: trip.summary, photo: trip.cover.src, trips: 1, highest: trip.maxAltitude });
  }
  const moreTreks = [
    "makalu-base-camp-trek", "upper-dolpo-trek", "arun-valley-trekking",
    "mustang-trek", "mustang-tiji-festival-trek", "ganesh-himal-trekking",
    "dolpo-trek", "jumla-rara-lake-trek", "dhaulagiri-round-trek",
    "kanchenjunga-base-camp-trek",
  ].flatMap((slug) => {
    const trip = getTrip(slug);
    return trip ? [{ slug: trip.slug, name: trip.title, days: trip.days }] : [];
  });

  const about = photo("hero-alpenglow");

  return (
    <>
      <HomeHero />

      {/* 01 / Find your trail */}
      <section id="find" className="scroll-mt-24 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-6">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading eyebrow="01 / Find your trail" lines={["Where do you", <span key="g">want to <Accent>go?</Accent></span>]} />
            <Reveal className="max-w-sm">
              <p className="text-ink-soft">From the foothills to Everest Base Camp. Find a trip that fits your time and your sense of adventure.</p>
              <Link href="/trip/" className="mt-3 inline-block border-b-2 border-ink pb-1 text-sm font-bold">Explore the full collection</Link>
            </Reveal>
          </div>
          <FeaturedTrips groups={groups} regionNames={regionNames} regions={destinations.map((d) => ({ slug: d.slug, name: d.name }))} />
        </div>
      </section>

      <JourneyCollections tours={[...helicopterTours.slice(0, 1), ...otherTours.slice(0, 3)]} luxury={luxury} regionNames={regionNames} />

      {/* 02 / Get to know Nepal */}
      <section className="bg-pine relative overflow-hidden pt-7 pb-10 text-white sm:pt-8 sm:pb-12 lg:pt-9 lg:pb-14 dark:bg-pine-deep">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-6">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading tone="dark" eyebrow="02 / Get to know Nepal" lines={["Same country.", <Accent key="d">Different worlds.</Accent>]} />
            <Reveal className="max-w-sm">
              <p className="text-white/80">Everest, Annapurna, Langtang, Manaslu. There&apos;s more than one way into the Himalayas.</p>
            </Reveal>
          </div>
          <RegionShowcase regions={panels.map((panel) => ({ ...panel, href: ["kanchenjunga-base-camp-trek", "makalu-base-camp-trek"].includes(panel.slug) ? `/trip/${panel.slug}/` : `/destinations/${panel.slug}/` }))} moreTreks={moreTreks} />
        </div>
      </section>

      {/* Popular Trekking & Tour Packages */}
      <section className="bg-snow-2 overflow-hidden pt-8 pb-14 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-6">
          <SectionHeading eyebrow={`${popular.length} packages`} lines={["Popular trekking", <span key="p">& tour <Accent>packages.</Accent></span>]} />
          <div className="mt-6">
            <TripCarousel trips={popular.slice(0, 20)} regionNames={regionNames} moreHref="/trip/" moreLabel={`All ${cards.length} trips`} />
          </div>
        </div>
      </section>

      {/* Festival offers, or the trips on a reduced price today */}
      <Offers offer={offer} trips={offerTrips} regionNames={regionNames} />

      {/* 04 / The people behind the journey */}
      <section className="story-community border-t border-line py-10 sm:py-11 lg:py-14">
        <div className="mx-auto grid max-w-site gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.35fr] lg:items-start lg:gap-10 lg:px-6">
          <div className="relative isolate lg:sticky lg:top-28">
            <SectionHeading eyebrow="Our story & community" lines={["Local roots.", <Accent key="o">Open horizons.</Accent>]} />
            <div className="relative mt-5">
            <PhotoGlow src={about.src} strength="lg" />
            <div className="relative aspect-[15/7] overflow-hidden rounded-xl bg-snow-2">
              <Image src={about.src} alt="Evening light on the Annapurna range" fill sizes="(max-width: 1024px) 100vw, 45vw" quality={80} className="object-cover object-right-bottom" />
            </div>
            <Reveal delay={0.2} className="bg-glacier-soft absolute top-6 right-4 rotate-[3deg] rounded-md px-5 py-4 text-center shadow-lg sm:-right-4">
              <p className="text-[0.58rem] font-bold tracking-[0.18em] text-pine uppercase">On the trail since</p>
              <p className="font-display text-pine text-4xl">2009</p>
              <p className="text-[0.55rem] font-bold tracking-[0.18em] text-pine uppercase">Kathmandu, Nepal</p>
            </Reveal>
            <div className="mt-3 flex justify-between text-[0.6rem] font-bold tracking-[0.16em] text-muted uppercase">
              <span>The place we call home</span>
              <span>Nepal / Annapurna</span>
            </div>
            </div>
          </div>

          <div>
            <Reveal delay={0.1}>
              <p className="mt-4 text-xl leading-snug text-ink">
                Founded by a local guide.
                <br />
                Built on a love of Nepal.
              </p>
              <p className="mt-3 text-ink-soft">{site.about}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
                {founder?.photo ? (
                  <div className="flex items-center gap-3">
                    <span className="relative size-12 overflow-hidden rounded-full">
                      <Image src={founder.photo.src} alt={founder.name} fill sizes="48px" className="object-cover" />
                    </span>
                    <span>
                      <span className="block font-bold">{founder.name}</span>
                      <span className="accent-word block text-sm text-muted">Founder &amp; Managing Director</span>
                    </span>
                  </div>
                ) : null}
                <Link href="/our-team/" className="border-b-2 border-ink pb-1 text-sm font-bold">Meet our team</Link>
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
                {["Small groups", "Local guides", "No hidden fees"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <Check className="text-pine size-4" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            {community.length ? (
              <div id="community" className="mt-5 scroll-mt-28 border-t border-line pt-5">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow text-pine">Community &amp; social work</p>
                    <h3 className="font-display mt-2 text-2xl tracking-tight">Giving back to the place we call home.</h3>
                    <p className="mt-2 max-w-lg text-sm text-ink-soft">Supporting the people and places that make every journey possible.</p>
                  </div>
                  <Link href="/community/" className="shrink-0 border-b-2 border-ink pb-1 text-sm font-bold">See our community work</Link>
                </div>
                <CommunityCards posts={community.slice(0, 2)} className="home-community" />
              </div>
            ) : null}
          </div>
        </div>
      </section>


      {awards.length ? (
        <section className="border-t border-line">
          <div className="mx-auto max-w-site px-4 py-10 sm:px-6 lg:px-6">
            <p className="eyebrow text-pine mb-4">Awards &amp; recognition</p>
            <Awards awards={awards} />
          </div>
        </section>
      ) : null}

      {/* Videos from the trail */}
      {videos.length ? (
        <section className="border-t border-line py-14 sm:py-16">
          <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-6">
            <SectionHeading eyebrow="Watch" lines={["Videos from", <Accent key="v">the trail.</Accent>]} />
            <div className={`mt-10 grid gap-4 ${videos.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : "max-w-3xl"}`}>
              {videos.map((v) => (
                <YouTube key={v.id} id={v.id} title={v.title} />
              ))}
            </div>
            {videos.map((v) => (
              <JsonLd key={v.id} data={videoLd(v)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Testimonials */}
      <Testimonials reviews={reviews} tripadvisor={getTripadvisor()} />

      {/* From the journal */}
      <section className="border-t border-line py-14 sm:py-16">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-6">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading eyebrow="Journal" lines={["Notes from", <Accent key="t">the trail.</Accent>]} />
            <Link href="/blogs/" className="border-b-2 border-ink pb-1 text-sm font-bold">Read our blogs</Link>
          </div>
          <Stagger className="rail grid gap-6 md:grid-cols-3">
            {posts.map((p) => (
              <StaggerItem key={p.slug} className="relative isolate">
                {p.cover ? <PhotoGlow src={p.cover.src} strength="sm" /> : null}
                <Link href={`/${p.slug}/`} className="group block">
                  <div className="zoom-img relative aspect-[16/10] overflow-hidden rounded-xl bg-snow-2">
                    {p.cover ? <Image src={p.cover.src} alt={p.cover.alt} fill sizes="(max-width: 768px) 100vw, 33vw" quality={75} className="object-cover object-right-bottom" /> : null}
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-[0.64rem] font-bold tracking-[0.14em] text-muted uppercase">
                    {formatDate(p.published)} <span aria-hidden>·</span> <Clock className="size-3" aria-hidden /> {p.readingMinutes} min
                  </p>
                  <h3 className="font-display mt-2 text-xl leading-snug group-hover:text-pine">{p.title}</h3>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}






