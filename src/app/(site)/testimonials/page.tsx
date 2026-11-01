import { ReviewVerified } from "@/components/review-verified";
import Image from "@/components/image";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { Flag } from "@/components/flag";
import { Breadcrumbs } from "@/components/page-hero";
import { TestimonialVideoGallery } from "@/components/testimonial-video-gallery";
import { Accent } from "@/components/section-heading";
import { ReviewText } from "@/components/review-text";
import { ShowMore } from "@/components/show-more";
import { getAllReviews, getGoogleReviews, getTripadvisor, getTrustindexReviews, getVideoReviews } from "@/lib/content";
import { reviewer } from "@/lib/reviewer";
import { meta } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const metadata = meta({
  path: "/testimonials/",
  title: "Traveller Reviews",
  description: "Reviews from travellers who trekked and toured with Base Camp Adventure: Everest Base Camp, Annapurna, Langtang, Poon Hill and more.",
});

export default function TestimonialsPage() {
  const reviews = getAllReviews();
  const google = getGoogleReviews();
  const trustindex = getTrustindexReviews();
  const videos = getVideoReviews();
  const ta = getTripadvisor();
  const total = reviews.length + google.reviews.length + trustindex.reviews.length;
  const rows = reviews.map((r) => ({ r, who: reviewer(r.author) }));
  const countries = new Map<string, { name: string; flag: string; n: number }>();
  for (const { who } of rows) {
    if (!who.code || !who.flag) continue;
    const c = countries.get(who.code) ?? { name: who.country ?? who.code, flag: who.flag, n: 0 };
    c.n++;
    countries.set(who.code, c);
  }
  const excellent = ta ? Math.round(((ta.breakdown.excellent ?? 0) / ta.reviews) * 1000) / 10 : null;

  return (
    <>
      <header className="mx-auto max-w-site px-4 pt-10 sm:px-6 sm:pt-12">
        <Breadcrumbs items={[{ name: "Reviews", path: "/testimonials/" }]} />
        <p className="eyebrow mt-8 text-pine">{total} published review entries · Three platforms</p>
        <h1 className="font-display mt-3 text-[clamp(2.75rem,5vw,5rem)] leading-tight tracking-tight">Their journeys. <Accent>Their words.</Accent></h1>
        <nav aria-label="Review collections" className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-pine">{[{label:"Video stories",id:"video-stories"},{label:"Tripadvisor",id:"tripadvisor-reviews"},{label:"Google",id:"google-reviews"},{label:"Trustindex",id:"trustindex-reviews"}].map(item => <a key={item.id} href={`#${item.id}`} className="rounded-full border border-pine/20 px-4 py-2 hover:bg-pine/5">{item.label}</a>)}</nav>
      </header>
      <section id="video-stories" className="testimonial-video-showcase relative mt-8 scroll-mt-28 overflow-hidden border-y border-line bg-snow-2 px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-site">
          <TestimonialVideoGallery items={videos} />
        </div>
      </section>

      <section className="mx-auto max-w-site px-4 pt-12 sm:px-6 sm:pt-16 lg:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          {ta ? (
            <a href={ta.url} target="_blank" rel="noopener noreferrer" className="group hover:border-pine/40 flex flex-col gap-5 rounded-2xl border border-line bg-card p-5 transition-colors sm:flex-row sm:items-center sm:p-6">
              <span className="grid h-20 w-24 shrink-0 place-items-center">
                <Image src="/brand/partners/tripadvisor.png" alt="Tripadvisor" width={245} height={220} className="h-16 w-auto dark:brightness-0 dark:invert" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-3">
                  <span className="font-display text-5xl leading-none text-ink">{ta.rating.toFixed(1)}</span>
                  <span className="text-sm text-ink-soft">
                    from <strong className="text-ink">{ta.reviews} reviews</strong> on Tripadvisor
                  </span>
                </span>
                {excellent ? (
                  <span className="mt-3 block">
                    <span className="flex justify-between text-xs text-muted">
                      <span>Excellent</span>
                      <span>{excellent}%</span>
                    </span>
                    <span className="mt-1 block h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                      <span className="block h-full rounded-full bg-[#34e0a1]" style={{ width: `${excellent}%` }} />
                    </span>
                  </span>
                ) : null}
                {ta.ranking ? <span className="mt-2 block text-xs text-muted">{ta.ranking}</span> : null}
              </span>
              <span className="text-pine inline-flex items-center gap-1 text-sm font-bold group-hover:underline">
                Read on Tripadvisor <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </a>
          ) : null}
          {countries.size ? (
            <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
              <p className="eyebrow text-pine">Travellers from {countries.size} countries</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {[...countries.values()]
                  .sort((a, b) => b.n - a.n)
                  .map((c) => (
                    <li key={c.name} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-snow px-3 py-1.5 text-sm font-semibold">
                      <Flag svg={c.flag} label={c.name} decorative /> {c.name}
                      <span className="text-xs font-normal text-muted">{c.n}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section id="tripadvisor-reviews" className="mx-auto max-w-site scroll-mt-28 px-4 py-12 sm:px-6 sm:py-16 lg:px-6"><h2 className="font-display mb-6 text-3xl tracking-tight">Tripadvisor reviews</h2>
        <ShowMore className="columns-1 gap-5 md:columns-2 lg:columns-3 [&>*>*]:mb-5 [&>*>*]:break-inside-avoid" label="more reviews">
          {rows.map(({ r, who }, i) => (
            <article key={i} className="rounded-2xl border border-line bg-card p-6">
              <div className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className={s < Math.round(r.rating) ? "fill-marigold text-marigold size-4" : "size-4 text-line"} aria-hidden />
                ))}
              </div>
              {r.title ? <p className="mt-3 font-bold">{r.title}</p> : null}
              <div className="mt-3">
                <ReviewText text={r.body} />
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#00afc4] to-[#00788a] text-xs font-bold text-white">
                  {who.name.replace(/[^A-Za-z\s]/g, " ").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "★"}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="truncate">{who.name}</span>
                    {who.flag && who.country ? <Flag svg={who.flag} label={who.country} /> : null}
                          <ReviewVerified />
                  </p>
                  <p className="truncate text-sm text-muted">
                    {who.place ? `${who.place} · ` : ""}
                    <Link href={`/trip/${r.trip.slug}/`} className="text-pine underline underline-offset-2 hover:decoration-2">
                      {r.trip.title}
                    </Link>
                    {r.date ? ` · ${formatDate(r.date) || r.date}` : ""}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </ShowMore>
      </section>
      <PlatformReviews id="google-reviews" platform="Google" href={google.url} reviews={google.reviews.map(r => ({name:r.name,rating:r.rating,body:r.excerpt,title:"",date:r.published ? formatDate(r.published) : r.publishedLabel ? r.publishedLabel + " (as shown)" : "",excerpt:r.isExcerpt}))} />
      <PlatformReviews id="trustindex-reviews" platform="Trustindex" href={trustindex.url} reviews={trustindex.reviews.map(r => ({name:r.name,rating:r.rating,body:r.body,title:r.title,date:formatDate(r.published),excerpt:false}))} />
    </>
  );
}

function PlatformReviews({id,platform,href,reviews}: {id:string;platform:string;href:string;reviews:{name:string;rating:number;body:string;title:string;date:string;excerpt:boolean}[]}) {
  return <section id={id} className="mx-auto max-w-site scroll-mt-28 border-t border-line px-4 py-12 sm:px-6 sm:py-16">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow text-pine">{reviews.length} review entries</p><h2 className="font-display mt-2 text-3xl tracking-tight">{platform} reviews</h2></div><a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-pine">Read on {platform}<ArrowUpRight className="size-4" aria-hidden /></a></div>
    <ShowMore label="reviews" className="columns-1 gap-5 md:columns-2 lg:columns-3 [&>*>*]:mb-5 [&>*>*]:break-inside-avoid">{reviews.map((r,i)=><article key={i} className="rounded-2xl border border-line bg-card p-6"><div className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5`}>{Array.from({length:5},(_,i)=><Star key={i} className={i<r.rating ? "size-4 fill-marigold text-marigold" : "size-4 text-line"} aria-hidden />)}</div>{r.title ? <h3 className="mt-3 font-bold">{r.title}</h3>:null}<div className="mt-3">{r.body ? <ReviewText text={r.body} />:<p className="text-sm text-muted">This traveller left a rating without a written comment.</p>}</div>{r.excerpt ? <p className="mt-3 text-xs text-muted">Excerpt · <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-pine underline">Continue on {platform}</a></p>:null}<footer className="mt-5 border-t border-line pt-4"><p className="flex items-center gap-1.5 font-semibold">{r.name}<ReviewVerified /></p><p className="mt-1 text-xs text-muted">{r.date} · {platform}</p></footer></article>)}</ShowMore>
  </section>;
}
