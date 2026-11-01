import Image from "@/components/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Award, Compass, HeartPulse, Mountain, Route, Users } from "lucide-react";
import { Accreditations } from "@/components/accreditations";
import { Awards } from "@/components/awards";
import { CommunityCards } from "@/components/community-cards";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { PageHero } from "@/components/page-hero";
import { PhotoGlow } from "@/components/photo-glow";
import { Accent, SectionHeading } from "@/components/section-heading";
import { getAbout, getAwards, getCommunity, getPage, getTeam, getTrips, getTripsIn } from "@/lib/content";
import { meta } from "@/lib/seo";
import { site, whatsappHref } from "@/lib/site";

const page = () => getPage("about-us");

export const metadata = meta({
  path: "/about-us/",
  title: "About Us",
  description: "Base Camp Adventure was founded in 2009 by a local guide. Meet the Kathmandu team behind our treks, tours and climbs in Nepal, Bhutan and Tibet.",
  seo: page()?.seo,
});

/** "12 trips, including Island Peak Climbing, Mera Peak Climbing and Lobuche Peak Climbing." */
function tripsLine(href: string) {
  const slug = href.match(/\/activities\/([^/]+)\//)?.[1];
  const trips = slug ? getTripsIn("activities", slug) : [];
  if (!trips.length) return null;
  const names = trips.slice(0, 3).map((t) => t.title);
  return `${trips.length} trips, including ${names.slice(0, -1).join(", ")} and ${names.at(-1)}.`;
}

const WHY_ICONS = { award: Award, guide: Compass, mountain: Mountain, route: Route, shield: HeartPulse, users: Users } as const;

export default function AboutPage() {
  const about = getAbout();
  const team = getTeam();
  const community = getCommunity();
  const founder = team.find((m) => m.slug === "shree-ghimire");
  const years = new Date().getFullYear() - site.founded;
  // The live page's H1, kept word for word: "Tours and Trekking in Nepal with Base Camp Adventure".
  const [lead, ...rest] = (about?.h1 ?? "About Base Camp Adventure").split(" with ");

  return (
    <>
      <PageHero
        title={lead}
        accent={rest.length ? `with ${rest.join(" with ")}` : undefined}
        eyebrow="About us"
        intro="Founded in 2009 by an experienced local guide. Treks and tours in Nepal, Bhutan and Tibet."
        photo="/photos/page-about-group.webp"
        crumbs={[{ name: "About us", path: "/about-us/" }]}
        size="lg"
      />

      {/* Numbers */}
      <section className="mx-auto max-w-site px-4 pt-14 sm:px-6 sm:pt-20 lg:px-6">
        <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {[
            { n: years, s: "+", l: "Years on the trail" },
            { n: getTrips().length, s: "", l: "Trips and tours" },
            { n: team.length, s: "", l: "Guides & staff" },
            { n: 24, s: "/7", l: "Available" },
          ].map((x) => (
            <StaggerItem key={x.l} className="bg-card p-5 sm:p-8">
              <CountUp to={x.n} suffix={x.s} className="font-display block text-4xl text-ink sm:text-6xl" />
              <p className="eyebrow mt-2 text-muted">{x.l}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Who we are, in the live page's own words */}
      <section id="who-we-are" className="mx-auto grid max-w-site scroll-mt-28 gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:px-6">
        <div className="relative isolate">
          <PhotoGlow src="/photos/page-about.webp" strength="lg" />
          <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-snow-2">
            <Image src="/photos/page-about.webp" alt="Namche Bazaar in the Everest region" fill sizes="(max-width: 1024px) 100vw, 45vw" quality={80} className="object-cover object-right-bottom" />
          </div>
          <Reveal delay={0.2} className="bg-glacier-soft absolute -bottom-5 left-4 rotate-[-2deg] rounded-md px-5 py-4 shadow-lg sm:left-8">
            <p className="text-[0.58rem] font-bold tracking-[0.18em] text-pine uppercase">On the trail since</p>
            <p className="font-display text-pine text-4xl">{site.founded}</p>
          </Reveal>
        </div>
        <div>
          <SectionHeading eyebrow="Who we are" lines={["Base Camp", <Accent key="b">Adventure.</Accent>]} />
          <Reveal delay={0.1}>
            {(about?.intro ?? [site.about]).map((para, i) => (
              <p key={i} className={i === 0 ? "mt-6 text-lg leading-relaxed text-ink" : "mt-4 leading-relaxed text-ink-soft"}>
                {para}
              </p>
            ))}
            {founder ? (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-line py-5">
                <Link href={`/team/${founder.slug}/`} className="group flex items-center gap-3">
                  {founder.photo ? (
                    <span className="relative size-14 overflow-hidden rounded-full">
                      <Image src={founder.photo.src} alt={founder.name} fill sizes="56px" className="object-cover" />
                    </span>
                  ) : null}
                  <span>
                    <span className="block font-bold group-hover:text-pine">{founder.name}</span>
                    <span className="accent-word block text-sm text-muted">Founder &amp; Managing Director</span>
                  </span>
                </Link>
                <div className="flex flex-wrap gap-2">
                  <Link href="/contact-us/" className="bg-pine hover:bg-pine-deep inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white transition-colors">
                    Contact us <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-line bg-card px-4 py-3 text-sm font-semibold">
                    WhatsApp
                  </a>
                </div>
              </div>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* Our services */}
      {about?.services.length ? (
        <section id="services" className="bg-snow-2 scroll-mt-28 py-16 sm:py-24">
          <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-6">
            <SectionHeading eyebrow="What we do" lines={["Our", <Accent key="s">services.</Accent>]} />
            <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {about.services.map((sv) => (
                <StaggerItem key={sv.title} className="h-full">
                  <Link href={sv.href} className="group flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-line bg-card transition-[border-color,box-shadow] duration-500 hover:border-pine/30 hover:shadow-[0_22px_48px_-26px_oklch(0.25_0.05_210/0.45)]">
                    <span className="relative block aspect-[3/2] overflow-hidden bg-snow-2">
                      <Image src={sv.photo} alt={sv.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw" quality={80} className="object-cover object-right-bottom transition-transform duration-[1100ms] group-hover:scale-[1.03]" />
                    </span>
                    <span className="flex flex-1 flex-col p-5">
                      <span className="font-display flex items-center justify-between gap-2 text-lg text-ink group-hover:text-pine">
                        {sv.title} <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                      </span>
                      <span className="mt-2 text-sm leading-relaxed text-ink-soft">{sv.text ?? tripsLine(sv.href)}</span>
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {/* Why book with us */}
      {about?.why.length ? (
        <section className="bg-pine relative overflow-hidden py-16 text-white sm:py-24 dark:bg-pine-deep">
          <div aria-hidden className="blueprint absolute inset-0 text-white opacity-[0.07]" />
          <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading tone="dark" eyebrow="Base Camp Adventure" lines={["Why book", <Accent key="w">with us.</Accent>]} />
              <Link href="/why-book-with-us/" className="inline-flex items-center gap-2 self-start rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#006c7c] lg:self-auto">
                Why Travel With Us? <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <Stagger className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
              {about.why.map((w) => {
                const Icon = WHY_ICONS[w.icon as keyof typeof WHY_ICONS] ?? Award;
                return (
                  <StaggerItem key={w.title} className="h-full rounded-[1.1rem] border border-white/15 bg-white/[0.06] p-5 sm:p-6">
                    <span className="grid size-11 place-items-center rounded-xl bg-white/12">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="font-display mt-4 text-xl leading-snug">{w.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">{w.text}</p>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </section>
      ) : null}

      {/* Community & social work */}
      {community.length ? (
        <section id="community" className="mx-auto max-w-site scroll-mt-28 px-4 pt-16 sm:px-6 sm:pt-24 lg:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Community & social work" lines={["Where we", <Accent key="g">give back.</Accent>]} />
            <Link href="/community/" className="border-b-2 border-ink pb-1 text-sm font-bold">
              All community work
            </Link>
          </div>
          <CommunityCards posts={community.slice(0, 4)} className="mt-10" />
        </section>
      ) : null}

      {/* Our team */}
      <section className="mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow="The people behind the journey" lines={["Our", <Accent key="t">team.</Accent>]} />
          <Link href="/our-team/" className="border-b-2 border-ink pb-1 text-sm font-bold">
            Meet everyone
          </Link>
        </div>
        <Stagger className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-5">
          {team.slice(0, 8).map((m) => (
            <StaggerItem key={m.slug}>
              <Link href={`/team/${m.slug}/`} className="group block">
                <div className="zoom-img relative aspect-[3/4] overflow-hidden rounded-[1.1rem] bg-snow-2">
                  {m.photo ? <Image src={m.photo.src} alt={m.name} fill sizes="(max-width: 768px) 50vw, 25vw" quality={80} className="object-cover" /> : null}
                </div>
                <p className="mt-3 font-bold group-hover:text-pine">{m.name}</p>
                <p className="text-sm text-muted">{m.role}</p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Our affiliation: where the menu's "Our Affiliation" lands */}
      <section id="affiliations" className="scroll-mt-28 border-t border-line pt-16">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-6">
          <SectionHeading eyebrow="Associated with" lines={["Our", <Accent key="a">affiliation.</Accent>]} />
        </div>
        <div className="mt-4">
          <Accreditations />
        </div>
        <div id="awards" className="mx-auto max-w-site scroll-mt-28 px-4 pt-10 sm:px-6 lg:px-6">
          <p className="eyebrow text-pine mb-4">Awards &amp; recognition</p>
          <Awards awards={getAwards()} />
        </div>
        <div className="mx-auto flex max-w-site flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <p className="font-mono text-xs text-ink-soft sm:text-sm">{site.registration.map((r) => `${r.label} ${r.value}`).join("  ·  ")}</p>
          <Link href="/legal-documents/" className="text-pine inline-flex items-center gap-2 text-sm font-bold">
            Licences &amp; documents <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
