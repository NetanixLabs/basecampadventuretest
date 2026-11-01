"use client";

import Link from "next/link";
import { useState } from "react";
import { Accent } from "@/components/section-heading";
import { VideoReviewCarousel } from "@/components/home/video-review-carousel";
import { ReviewCarousel } from "@/components/home/review-carousel";
import Image from "@/components/image";
import { ArrowRight, ArrowUpRight, Play, Star } from "lucide-react";
import type { ReviewSourcesData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReviewSources({ children, tripadvisorRating, footer, sources }: { children: React.ReactNode; tripadvisorRating?: number; footer?: React.ReactNode; sources: ReviewSourcesData }) {
  const { videoReviews, google, trustindex, tripadvisorUrl } = sources;
  const [source, setSource] = useState("tripadvisor");
  const tabs: { id: string; label: string; logo?: string; rating?: number }[] = [
    { id: "tripadvisor", label: "Tripadvisor reviews", logo: "/brand/partners/tripadvisor.png", rating: tripadvisorRating },
    { id: "trustindex", label: "Trustindex reviews", logo: "/brand/reviews/trustindex.svg", rating: trustindex.rating },
    { id: "google", label: "Google reviews", logo: "/brand/reviews/google.svg", rating: 4.6 },
    { id: "video", label: "Video review" },
  ];
  const isGoogle = source === "google";
  const sourceLabel = isGoogle ? "Google" : "Trustindex";
  const sourceUrl = isGoogle ? google.url : trustindex.url;
  const platformUrl = source === "tripadvisor" ? tripadvisorUrl : sourceUrl;
  const platformLabel = source === "tripadvisor" ? "Tripadvisor" : sourceLabel;
  const selectedReviews = isGoogle
    ? google.reviews.map((review) => ({ ...review, body: review.excerpt, title: "" }))
    : trustindex.reviews.map((review) => ({ ...review, publishedLabel: "", isExcerpt: false }));
  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-2">
        <div role="tablist" aria-label="Review source" className="inline-flex max-w-full items-stretch gap-1 rounded-2xl border border-line bg-card p-1 shadow-sm">
          {tabs.map((tab, index) => {
            const isVideo = tab.id === "video";
            const selected = source === tab.id;
            return <button key={tab.id} id={`reviews-tab-${tab.id}`} role="tab" type="button" aria-label={tab.label} title={tab.label} aria-selected={selected} aria-controls="reviews-source-panel" tabIndex={selected ? 0 : -1} onClick={() => setSource(tab.id)} onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
              if (next >= 0) { event.preventDefault(); setSource(tabs[next].id); document.getElementById(`reviews-tab-${tabs[next].id}`)?.focus(); }
            }} className={cn("flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine sm:px-4",
              isVideo ? "review-video-tab" : "",
              isVideo ? "border-transparent text-white" : selected ? "border-pine/20 bg-pine/10 text-pine" : "border-transparent text-muted hover:bg-pine/5 hover:text-pine") }>
              {isVideo ? <span className="relative z-10 flex h-7 w-12 items-center justify-center sm:w-18"><span className="grid size-7 place-items-center rounded-full border border-white/40 bg-white/20 shadow-sm"><Play className="ml-0.5 size-4 fill-current" aria-hidden /></span></span> : <Image src={tab.logo!} alt="" width={96} height={36} unoptimized className="h-7 w-12 object-contain sm:w-18" />}
              {isVideo ? <span className="relative z-10 h-3 whitespace-nowrap text-[0.7rem] leading-3 font-bold">Video review</span> : <span className="flex h-3 items-center text-[0.65rem]" aria-label={tab.rating ? `${tab.rating} out of 5` : "Rating unavailable"}>
                <span className="relative inline-flex text-[#fbbc04]" aria-hidden><span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-2.5" />)}</span><span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${(tab.rating ?? 0) / 5 * 100}%` }}><span className="flex w-max">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-2.5 fill-current" />)}</span></span></span>
              </span>}
            </button>;
          })}
        </div>
        <div className="flex h-5 items-center justify-center">{source !== "video" && <a href={platformUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-pine underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine">Read on {platformLabel} <ArrowUpRight className="size-3.5" aria-hidden /></a>}</div>
      </div>
      <div id="reviews-source-panel" role="tabpanel" aria-labelledby={`reviews-tab-${source}`}>
        {source === "video" ? <div className="video-reviews-layout"><div className="video-reviews-heading"><p className="eyebrow text-pine">Video reviews</p><h2 className="font-display mt-3 text-[clamp(2.25rem,3.2vw,3.5rem)] leading-[1.05] tracking-tight">Stories from<br /><Accent>our travellers.</Accent></h2></div><div className="min-w-0 w-full overflow-hidden py-2"><VideoReviewCarousel items={videoReviews} /></div><div className="mt-3 flex justify-end border-t border-line pt-4 lg:col-span-2"><Link href="/testimonials/" className="inline-flex items-center gap-1.5 text-sm font-bold text-pine hover:underline">All reviews <ArrowRight className="size-4" aria-hidden /></Link></div></div> : source === "tripadvisor" ? children : (
          <>
            <div className="grid gap-5">
              <div><p className="eyebrow text-pine">{sourceLabel} reviews</p><h2 className="font-display mt-3 text-[clamp(2.25rem,3.2vw,3.5rem)] leading-[1.05] tracking-tight">From our<br /><Accent>travellers.</Accent></h2>
                <p className="mt-3 text-xs leading-relaxed text-muted">{isGoogle ? `${selectedReviews.length} reviews from our Google listing. Full comments are included where available; entries marked as excerpts continue on Google.` : `${selectedReviews.length} featured reviews from our Trustindex profile. Read complete comments below or visit Trustindex for the full collection.`}</p>
              </div>
              <div className="min-w-0 w-full overflow-hidden py-2"><ReviewCarousel key={source} items={selectedReviews.map((review) => ({ name: review.name, title: review.title, body: review.body, rating: review.rating, published: review.published, publishedLabel: review.publishedLabel ? `${review.publishedLabel} (as shown)` : undefined, isExcerpt: review.isExcerpt, place: null, country: null, flag: null, sourceUrl, sourceLabel }))} /></div>
            </div>
            <div className="mt-4 text-xs text-muted"><p>{isGoogle ? <>Reviews for {google.business}, transcribed from Google screenshots and Google-source entries on <a href={google.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-pine underline underline-offset-4">Trustindex</a>. Snapshot: 13 October 2026.</> : <>Reviews published on <a href={google.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-pine underline underline-offset-4">Trustindex</a> for {google.business}.</>}</p></div>
          </>
        )}
        {source !== "video" ? footer : null}
      </div>
    </>
  );
}
