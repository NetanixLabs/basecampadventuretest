import Link from "next/link";
import { Quote, Star } from "lucide-react";
import type { Review } from "@/lib/types";

type R = Review & { trip: { slug: string; title: string } };

/** Two rows of real traveller reviews drifting in opposite directions. */
export function ReviewsMarquee({ reviews }: { reviews: R[] }) {
  const half = Math.ceil(reviews.length / 2);
  const rows = [reviews.slice(0, half), reviews.slice(half)];
  return (
    <div className="marquee-host relative flex flex-col gap-5 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      {rows.map((row, r) => (
        <div key={r} className="flex overflow-hidden">
          <div className="marquee flex shrink-0 gap-5 pr-5" style={{ ["--marquee-speed" as string]: `${row.length * 9}s`, animationDirection: r ? "reverse" : "normal" }}>
            {[...row, ...row].map((rv, i) => (
              <figure key={i} aria-hidden={i >= row.length} className="flex w-[22rem] shrink-0 flex-col justify-between rounded-[1.4rem] border border-line bg-card p-6 sm:w-[26rem]">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5" role="img" aria-label={`${rv.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className={s < Math.round(rv.rating) ? "fill-marigold text-marigold size-4" : "size-4 text-line"} aria-hidden />
                      ))}
                    </div>
                    <Quote className="text-glacier size-6 opacity-40" aria-hidden />
                  </div>
                  <blockquote className="mt-4 line-clamp-5 text-[0.95rem] leading-relaxed text-ink-soft">{rv.body}</blockquote>
                </div>
                <figcaption className="mt-5 border-t border-line pt-4">
                  <p className="font-semibold">{rv.author.split(/[-,]/)[0].trim()}</p>
                  <Link href={`/trip/${rv.trip.slug}/`} tabIndex={i >= row.length ? -1 : 0} className="text-pine text-sm hover:underline">
                    {rv.trip.title}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
