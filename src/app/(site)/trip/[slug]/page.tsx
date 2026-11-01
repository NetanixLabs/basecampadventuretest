import { ReviewVerified } from "@/components/review-verified";
import Image from "@/components/image";
import Link from "next/link";
import { missing } from "@/lib/not-found";
import { ArrowRight, Backpack, Check, Clock, Compass, FileDown, Flag, Gauge, Info, MapPin, Mountain, Route, Star, Sun, Users, X, type LucideIcon } from "lucide-react";
import { TripSidebar } from "@/components/trip/trip-sidebar";
import { TripAwards } from "@/components/trip/trip-awards";
import { TripProse } from "@/components/trip/trip-prose";
import { AltitudeProfile } from "@/components/altitude-profile";
import { Faq } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Breadcrumbs } from "@/components/page-hero";
import { Accent, SectionHeading } from "@/components/section-heading";
import { BookingCard, MobileBookingBar } from "@/components/trip/booking-card";
import { PlanTripButton, TripSlider } from "@/components/trip/trip-slider";
import { TripPhotos } from "@/components/trip/trip-photos";
import { Itinerary } from "@/components/trip/itinerary";
import { SectionNav } from "@/components/trip/section-nav";
import { TripModals } from "@/components/trip/trip-modals";
import { TripCard } from "@/components/trip-card";
import { getActivity, getDestination, getGuidesForRegion, getRelatedTrips, getTravellerPhotos, getTrip, getEquipment, getTripInfo, getTrips, getVideosForTrip } from "@/lib/content";
import type { InfoKey } from "@/lib/trip-info";
import { meta, tripLd, tripLead, videoLd } from "@/lib/seo";
import { YouTube } from "@/components/video";
import { Flag as CountryFlag } from "@/components/flag";
import { ReviewText } from "@/components/review-text";
import { reviewer } from "@/lib/reviewer";
import { whatsappHref } from "@/lib/site";
import { formatDate } from "@/lib/utils";
import { costTitle } from "@/lib/cost-title";
import { Equipment } from "@/components/trip/equipment";

type Props = { params: Promise<{ slug: string }> };

// New pages published from the admin render on first visit, then stay cached.
export const dynamicParams = true;

export function generateStaticParams() {
  return getTrips().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const trip = getTrip(slug);
  if (!trip) return {};
  return meta({ path: `/trip/${trip.slug}/`, title: trip.title, description: trip.summary, seo: trip.seo, image: trip.cover, lead: tripLead(trip), price: trip.price?.amount });
}

const INFO_ICONS: Record<InfoKey, LucideIcon> = {
  duration: Clock,
  start: MapPin,
  end: Flag,
  altitude: Mountain,
  group: Users,
  distance: Route,
  difficulty: Gauge,
  destination: Compass,
  type: Backpack,
  season: Sun,
};

const GOKYO_COST_TITLES = {
  includes: [
    "Airport transfers", "Kathmandu accommodation", "Trek meals",
    "Guesthouse accommodation", "Experienced trekking guide", "Trekking crew support",
    "Permits and fees", "Baggage storage", "Trekking equipment",
    "Trekking map", "First aid kit", "Ground transportation", "Lukla flights",
  ],
  excludes: [
    "Nepal visa fees", "Meals in Kathmandu", "International flights",
    "Insurance and emergency expenses", "Optional porter service", "Drinks and refreshments",
    "Laundry and personal expenses", "Excess baggage charges", "Personal trekking gear",
    "Tips and gratuities", "Other services and expenses",
  ],
};

export default async function TripPage({ params }: Props) {
  const { slug } = await params;
  const trip = getTrip(slug);
  if (!trip) missing(`/trip/${slug}/`);

  const region = trip.destinations[0] ? getDestination(trip.destinations[0]) : null;
  const activity = trip.activities[0] ? getActivity(trip.activities[0]) : null;
  const related = getRelatedTrips(trip, 3);
  const guides = region ? getGuidesForRegion(region.slug, 3) : [];
  const sharpest = [trip.cover, ...trip.gallery].filter((x): x is NonNullable<typeof x> => Boolean(x) && x!.w >= x!.h).sort((a, b) => b.w - a.w)[0] ?? trip.cover;
  const photos = [trip.cover, ...trip.gallery].filter((x, i, a): x is NonNullable<typeof x> => Boolean(x) && a.findIndex((y) => y?.src === x?.src) === i);
  const travellerPhotos = getTravellerPhotos(trip.slug);
  const videos = getVideosForTrip(trip.slug);
  const altitudeDays = trip.itinerary.filter((d) => d.altitude).length >= 3 ? trip.itinerary : [];

  const info = getTripInfo(trip);
  const equipment = getEquipment(trip.slug);
  const costTitles = trip.slug === "everest-base-camp-and-gokyo-trek" ? GOKYO_COST_TITLES : {
    includes: trip.includes.map(costTitle),
    excludes: trip.excludes.map(costTitle),
  };

  // Combine repeated More information sections without losing their content.
  const mergedSections: typeof trip.sections = [];
  for (const section of trip.sections) {
    // The illustrated equipment section replaces the old packing-list copy.
    if (equipment && (section.id === "equipment" || /packing (?:list|checklist)|equipment list/i.test(section.title) || (/equipment list:/i.test(section.html) && !/<strong>Q:/i.test(section.html)))) continue;
    const existing = section.title.trim().toLowerCase() === "more information"
      ? mergedSections.find((item) => item.title.trim().toLowerCase() === "more information")
      : undefined;
    if (existing) {
      if (existing.html !== section.html) existing.html += `\n<div class="mt-8">${section.html}</div>`;
    } else {
      mergedSections.push({ ...section });
    }
  }

  // Imported sections can share IDs; each tab needs its own section target.
  const sectionIds = new Set(["overview", "itinerary", "altitude", "included", "equipment", "route-map", "videos", "gallery", "faqs", "reviews"]);
  const sections = mergedSections.map((section) => {
    let id = section.id;
    let suffix = 2;
    while (sectionIds.has(id)) id = `${section.id}-${suffix++}`;
    sectionIds.add(id);
    return { ...section, id };
  });

  const nav = [
    { id: "overview", label: "Overview" },
    ...(trip.itinerary.length ? [{ id: "itinerary", label: "Itinerary" }] : []),
    ...(altitudeDays.length ? [{ id: "altitude", label: "Altitude" }] : []),
    ...(trip.includes.length || trip.excludes.length ? [{ id: "included", label: "What's included" }] : []),
    ...sections.map((s) => ({ id: s.id, label: s.title.length > 22 ? `${s.title.slice(0, 20)}…` : s.title })),
    ...(equipment ? [{ id: "equipment", label: "Equipment" }] : []),
    ...(trip.map ? [{ id: "route-map", label: "Route map" }] : []),
    ...(videos.length ? [{ id: "videos", label: "Videos" }] : []),
    { id: "gallery", label: "Gallery" },
    ...(trip.faqs.length ? [{ id: "faqs", label: "FAQs" }] : []),
    ...(trip.reviews.length ? [{ id: "reviews", label: "Reviews" }] : []),
  ];

  return (
    <>
      {/* Heading, in the prototype's layout */}
      <section className="pt-[5.5rem] lg:pt-[6.25rem]">
        <div className="mx-auto max-w-site px-4 pt-6 sm:px-6 lg:px-6">
          <Reveal y={8}>
            <Breadcrumbs
              items={[
                { name: "Our trips", path: "/trip/" },
                ...(region ? [{ name: region.name, path: `/destinations/${region.slug}/` }] : []),
                { name: trip.title, path: `/trip/${trip.slug}/` },
              ]}
            />
          </Reveal>
          <Reveal y={8} delay={0.05}>
            <p className="eyebrow text-pine mt-7">{[region?.name, activity?.name].filter(Boolean).join(" · ")}</p>
          </Reveal>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="font-display max-w-4xl text-[clamp(2.2rem,5vw,4.2rem)] leading-[1.03] text-ink">{trip.title}</h1>
            <Reveal y={10} delay={0.2} className="flex shrink-0 flex-wrap items-center gap-3">
              {trip.rating ? (
                <a href="#reviews" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2.5 text-sm font-semibold">
                  <Star className="fill-marigold text-marigold size-4" aria-hidden /> {trip.rating.value.toFixed(1)} · {trip.rating.count} reviews
                </a>
              ) : null}
              <PlanTripButton priced={Boolean(trip.price)} />
            </Reveal>
          </div>
        </div>
        <div className="mx-auto mt-7 max-w-site px-4 sm:px-6 lg:px-6">
          <TripSlider images={[...(sharpest ? [sharpest] : []), ...photos.filter((p) => p.src !== sharpest?.src)]} title={trip.title} />
        </div>

        {/* Trip information: only the fields that have a value */}
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-6">
          <h2 className="sr-only">Trip information</h2>
          <Stagger className="grid grid-cols-2 gap-x-5 gap-y-5 border-b border-line py-6 sm:grid-cols-3 lg:grid-cols-5" gap={0.04}>
            {info.map((f) => {
              const Icon = INFO_ICONS[f.key] ?? Info;
              return (
                <StaggerItem key={f.key} className="flex min-w-0 items-start gap-3">
                  <span className="bg-glacier-soft text-pine grid size-9 shrink-0 place-items-center rounded-lg">
                    <Icon className="size-[1.1rem]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.72rem] text-muted">{f.label}</span>
                    <span className="mt-0.5 block text-[0.92rem] font-bold leading-snug break-words">{f.value}</span>
                  </span>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Direct child of <main>, so it stays pinned for the whole page. */}
      <div className="h-6" aria-hidden />
      <SectionNav items={nav} price={trip.price} />

      <div className="mx-auto grid max-w-site gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-16 lg:px-6">
        <article className="trip-detail-content min-w-0 space-y-20 xl:px-[clamp(2rem,4.7vw,6rem)]">
          <section id="overview" className="scroll-mt-40">
            <p className="eyebrow text-pine">Overview</p>
            {trip.highlights.length ? (
              <Reveal className="mt-6 rounded-[1.4rem] bg-marigold-soft p-6">
                <h2 className="font-display text-3xl font-black uppercase">Highlights</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {trip.highlights.map((h) => (
                    <li key={h} className="flex gap-3 text-ink-soft">
                      <Check className="text-pine mt-1 size-4 shrink-0" aria-hidden /> {h}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}
            <TripProse html={trip.overview} className="mt-6" />
            <div className="mx-auto mt-8 max-w-sm lg:hidden"><TripAwards /></div>
          </section>

          {trip.itinerary.length ? (
            <section id="itinerary" className="scroll-mt-40">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SectionHeading eyebrow="Itinerary" lines={["Day by", <Accent key="d">day.</Accent>]} />
                <a href={`/trip/${trip.slug}/itinerary.pdf`} download className="hover:border-pine inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold transition-colors">
                  <FileDown className="text-pine size-4" aria-hidden /> Download program (PDF)
                </a>
              </div>
              <div className="mt-8">
                <Itinerary days={trip.itinerary} />
              </div>
            </section>
          ) : null}

          {altitudeDays.length ? (
            <section id="altitude" className="scroll-mt-40">
              <SectionHeading eyebrow="Altitude profile" lines={["How high,", <Accent key="w">and when.</Accent>]} intro="Every overnight stop on the route. Rest days at the same height are where your body adjusts." />
              <div className="mt-8 rounded-[1.6rem] border border-line bg-card p-4 sm:p-6">
                <AltitudeProfile days={altitudeDays.map(({ day, title, altitude }) => ({ day, title, altitude }))} tone="light" />
              </div>
            </section>
          ) : null}

          {trip.includes.length || trip.excludes.length ? (
            <section id="included" className="scroll-mt-40">
              <SectionHeading eyebrow="Cost details" lines={["What's", <Accent key="i">included.</Accent>]} />
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {trip.includes.length ? (
                  <div className="rounded-[1.4rem] border border-line bg-card p-6">
                    <h3 className="text-lg font-bold">The price includes</h3>
                    <ul className="mt-4 space-y-3">
                      {trip.includes.map((x, i) => (
                        <li key={x} className="flex gap-3 text-[0.95rem] text-ink-soft">
                          <span className="bg-moss/15 text-moss mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"><Check className="size-3.5" aria-hidden /></span>
                          <div>
                            {costTitles?.includes[i] ? <h4 className="font-bold text-ink">{costTitles.includes[i]}</h4> : null}
                            <p>{x}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {trip.excludes.length ? (
                  <div className="rounded-[1.4rem] border border-line bg-snow-2 p-6">
                    <h3 className="text-lg font-bold">Not included</h3>
                    <ul className="mt-4 space-y-3">
                      {trip.excludes.map((x, i) => (
                        <li key={x} className="flex gap-3 text-[0.95rem] text-ink-soft">
                          <span className="bg-crimson/10 text-crimson mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"><X className="size-3.5" aria-hidden /></span>
                          <div>
                            {costTitles?.excludes[i] ? <h4 className="font-bold text-ink">{costTitles.excludes[i]}</h4> : null}
                            <p>{x}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-40">
              <TripProse html={s.html} />
            </section>
          ))}

          {equipment ? <Equipment key={trip.slug} items={equipment.items} /> : null}

          {trip.map ? (
            <section id="route-map" className="scroll-mt-40">
              <SectionHeading eyebrow="Route map" lines={["The way", <Accent key="t">there.</Accent>]} />
              <a href={trip.map.src} target="_blank" rel="noopener" className="mt-8 block overflow-hidden rounded-[1.4rem] border border-line bg-card">
                <Image src={trip.map.src} alt={trip.map.alt || `${trip.title} map`} width={trip.map.w} height={trip.map.h} sizes="(max-width: 1024px) 100vw, 60vw" className="h-auto w-full" />
              </a>
            </section>
          ) : null}

          {videos.length ? (
            <section id="videos" className="scroll-mt-40">
              <SectionHeading eyebrow="Videos" lines={["See it", <Accent key="v">for yourself.</Accent>]} />
              <div className={`mt-8 grid gap-4 ${videos.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {videos.map((v) => (
                  <YouTube key={v.id} id={v.id} title={v.title} />
                ))}
              </div>
              {videos.map((v) => (
                <JsonLd key={v.id} data={videoLd(v)} />
              ))}
            </section>
          ) : null}

          {photos.length || travellerPhotos.length ? (
            <section id="gallery" className="scroll-mt-40">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <SectionHeading eyebrow="Gallery" lines={["Moments from", <Accent key="g">the trail.</Accent>]} />
                <p className="text-sm text-muted">{photos.length + travellerPhotos.length} photos</p>
              </div>
              <TripPhotos
                title={trip.title}
                ours={photos.map((p) => ({ src: p.src, w: p.w, h: p.h, alt: p.alt }))}
                travellers={travellerPhotos}
                shareHref={whatsappHref(`Namaste Base Camp Adventure, here are my photos from the ${trip.title}.`)}
              />
            </section>
          ) : null}

          {trip.faqs.length ? (
            <section id="faqs" className="scroll-mt-40">
              <SectionHeading eyebrow="FAQs" lines={["Your", <Accent key="q">questions.</Accent>]} />
              <div className="mt-8">
                <Faq items={trip.faqs} />
              </div>
            </section>
          ) : null}

          {trip.reviews.length ? (
            <section id="reviews" className="scroll-mt-40">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <SectionHeading eyebrow="Reviews" lines={["From the", <Accent key="t">trail.</Accent>]} />
                {trip.rating ? (
                  <div className="flex items-center gap-4 rounded-2xl border border-line bg-card px-5 py-4">
                    <span className="font-display text-5xl font-black">{trip.rating.value.toFixed(1)}</span>
                    <span>
                      <span className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="fill-marigold text-marigold size-4" aria-hidden />
                        ))}
                      </span>
                      <span className="text-sm text-muted">{trip.rating.count} reviews</span>
                    </span>
                  </div>
                ) : null}
              </div>
              <Stagger className="mt-8 grid gap-4 md:grid-cols-2">
                {trip.reviews.map((r, i) => {
                  const who = reviewer(r.author);
                  return (
                  <StaggerItem key={i} className="rounded-2xl border border-line bg-card p-6">
                    <div className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className={s < Math.round(r.rating) ? "fill-marigold text-marigold size-4" : "size-4 text-line"} aria-hidden />
                      ))}
                    </div>
                    {r.title ? <p className="mt-3 font-bold">{r.title}</p> : null}
                    <div className="mt-3 text-[0.95rem]">
                      <ReviewText text={r.body} lines={8} />
                    </div>
                    <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#00afc4] to-[#00788a] text-xs font-bold text-white">
                        {who.name.replace(/[^A-Za-z\s]/g, " ").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "★"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <span className="truncate">{who.name}</span>
                          {who.flag && who.country ? <CountryFlag svg={who.flag} label={who.country} /> : null}
                          <ReviewVerified />
                        </p>
                        <p className="truncate text-xs text-muted">
                          {[who.place, r.date ? formatDate(r.date) || r.date : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                  );
                })}
              </Stagger>
              <div className="mt-4 flex justify-end">
                <Link href="/testimonials/" className="inline-flex items-center gap-2 rounded-sm py-2 text-sm font-bold text-pine hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine">
                  View more Reviews <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </section>
          ) : null}
        </article>

        <aside className="hidden lg:block">
          <TripSidebar>
            <BookingCard slug={trip.slug} title={trip.title} price={trip.price} days={trip.days} />
            <TripAwards />
          </TripSidebar>
        </aside>
      </div>

      {guides.length ? (
        <section className="border-t border-line py-20">
          <div className="mx-auto max-w-site px-4 sm:px-6">
            <SectionHeading eyebrow={`${region?.name} guides`} lines={["Read before", <Accent key="y">you go.</Accent>]} />
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {guides.map((p) => (
                <Link key={p.slug} href={`/${p.slug}/`} className="group">
                  <div className="zoom-img relative aspect-[16/10] overflow-hidden rounded-[1.2rem] bg-snow-2">
                    {p.cover ? <Image src={p.cover.src} alt={p.cover.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover object-right-bottom" /> : null}
                  </div>
                  <h3 className="mt-4 text-lg font-bold leading-snug group-hover:text-pine">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted">{p.readingMinutes} min read</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="bg-snow-2 py-20 lg:py-28">
          <div className="mx-auto max-w-site px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading eyebrow="You might also like" lines={["Other trails", <Accent key="n">nearby.</Accent>]} />
              <Link href="/trip/" className="text-pine inline-flex items-center gap-2 font-bold">
                All trips <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-10 package-grid-gap grid sm:grid-cols-2 lg:grid-cols-4">
              {related.map((t) => (
                <TripCard key={t.slug} trip={t} regionName={region?.name} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="h-20 lg:hidden" aria-hidden />
      <MobileBookingBar slug={trip.slug} title={trip.title} price={trip.price} />
      <TripModals trip={{ slug: trip.slug, title: trip.title, days: trip.days, price: trip.price, cover: trip.cover }} />
      <JsonLd data={tripLd(trip)} />
    </>
  );
}
