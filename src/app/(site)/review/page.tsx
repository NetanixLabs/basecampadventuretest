import type { Metadata } from "next";
import Link from "next/link";
import { getFeatures, getTrip } from "@/lib/content";
import { bookingForReview } from "@/lib/server/reviews";
import { ReviewForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review your trip", robots: { index: false, follow: false } };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const b = getFeatures().reviews.enabled ? await bookingForReview(t).catch(() => null) : null;
  const trip = b ? getTrip(b.tripSlug) : null;
  return (
    <section className="bg-snow-2 min-h-[80dvh] px-4 pt-32 pb-20">
      <div className="mx-auto max-w-2xl">
        {b ? (
          <>
            <p className="text-xs font-semibold tracking-[0.2em] text-ink-soft uppercase">Your review</p>
            <h1 className="font-display mt-3 text-4xl leading-tight font-black sm:text-5xl">How was <span className="accent-word text-marigold">{b.tripTitle}</span>?</h1>
            <p className="mt-4 text-lg text-ink-soft">Thank you for travelling with us, {b.leadName.split(" ")[0]}. Your words help other travellers choose, and our guides and porters read every one.</p>
            {trip?.cover?.src ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={trip.cover.src} alt="" className="mt-8 aspect-[16/6] w-full rounded-3xl object-cover" />) : null}
            <ReviewForm token={t} name={b.leadName} country={b.leadCountry} />
          </>
        ) : (
          <div className="text-center">
            <h1 className="font-display text-4xl font-black">This review link has been used or has expired</h1>
            <p className="mt-4 text-lg text-ink-soft">Thank you! If you&apos;d still like to share your experience, write to us and we&apos;ll happily add it.</p>
            <Link href="/contact-us/" className="bg-pine mt-8 inline-block rounded-full px-6 py-3 font-semibold text-white">Contact us</Link>
          </div>
        )}
      </div>
    </section>
  );
}
