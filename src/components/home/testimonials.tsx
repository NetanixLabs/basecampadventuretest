
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Flag } from "@/components/flag";
import { ReviewCarousel, type CarouselReview } from "@/components/home/review-carousel";
import { ReviewSources } from "@/components/home/review-sources";
import { Reveal } from "@/components/motion";
import { Accent } from "@/components/section-heading";
import { getReviewSources, type TripadvisorFacts } from "@/lib/content";
import { reviewer } from "@/lib/reviewer";
import type { Review } from "@/lib/types";

type R = Review & { trip: { slug: string; title: string } };

/**
 * Real traveller reviews: the Tripadvisor rating up top, the reviews in a
 * 3D carousel (each with the traveller's own home town and flag), and the
 * countries they came from.
 */
export function Testimonials({ reviews, tripadvisor }: { reviews: R[]; tripadvisor: TripadvisorFacts | null }) {
  if (!reviews.length) return null;

  // One review per text (some were posted on several trips); the most
  // readable lengths first, and those that say where the traveller is from.
  const seen = new Set<string>();
  const items: CarouselReview[] = reviews
    .filter((r) => (seen.has(r.body) ? false : (seen.add(r.body), true)))
    .map((r) => ({ r, who: reviewer(r.author) }))
    .sort((a, b) => Number(Boolean(b.who.code)) - Number(Boolean(a.who.code)) || Math.abs(a.r.body.length - 380) - Math.abs(b.r.body.length - 380))
    .slice(0, 12)
    .map(({ r, who }) => ({ name: who.name, place: who.place, country: who.country, flag: who.flag, body: r.body, rating: r.rating, trip: r.trip }));

  const countries = new Map<string, { name: string; flag: string; n: number }>();
  for (const r of reviews) {
    const w = reviewer(r.author);
    if (!w.code || !w.flag) continue;
    const c = countries.get(w.code) ?? { name: w.country ?? w.code, flag: w.flag, n: 0 };
    c.n++;
    countries.set(w.code, c);
  }
  const list = [...countries.values()].sort((a, b) => b.n - a.n);

  const countryFooter = list.length ? (
    <Reveal className="mt-5 flex flex-col items-center gap-3 border-t border-line pt-4 sm:flex-row sm:justify-between">
      <p className="text-sm text-ink-soft">
        Reviews from travellers in <strong className="text-ink">{list.length} countries</strong>
      </p>
      <ul className="no-scrollbar -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 sm:mx-0 sm:min-w-0 sm:flex-1 sm:w-auto sm:px-0">
        {list.map((c) => (
          <li key={c.name} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-semibold">
            <Flag svg={c.flag} label={c.name} /> {c.name}
          </li>
        ))}
      </ul>
      <Link href="/testimonials/" className="text-pine inline-flex shrink-0 items-center gap-1.5 text-sm font-bold hover:underline">
        All reviews <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Reveal>
  ) : null;

  return (
    <section className="bg-snow-2 relative overflow-hidden py-8 sm:py-9 lg:py-10">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[60rem] -translate-x-1/2 rounded-full bg-[#00afc4]/10 blur-3xl" />
      <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-6">
        <ReviewSources tripadvisorRating={tripadvisor?.rating} footer={countryFooter} sources={getReviewSources()}>
        <div className="grid gap-5">
          <div className="min-w-0">
          <p className="eyebrow text-pine">Testimonials</p>
          <h2 className="font-display mt-3 text-[clamp(2.25rem,3.2vw,3.5rem)] leading-[1.05] tracking-tight">In their<br /><Accent>own words.</Accent></h2>

          </div>
          <div className="min-w-0 w-full overflow-hidden py-2">
            <ReviewCarousel items={items} />
          </div>
        </div>
        </ReviewSources>
      </div>
    </section>
  );
}

