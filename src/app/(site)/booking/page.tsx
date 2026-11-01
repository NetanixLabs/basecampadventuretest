import { Suspense } from "react";
import { Lock } from "lucide-react";
import { Checkout, type CheckoutTrip } from "@/components/checkout";
import { getLiveTerms, getTrips } from "@/lib/content";
import { meta } from "@/lib/seo";

export const metadata = {
  ...meta({ path: "/booking/", title: "Book your trip", description: "Reserve your Base Camp Adventure trip and pay securely through WeTravel." }),
  robots: { index: false, follow: true },
};

export default function BookingPage() {
  const names = Object.fromEntries(getLiveTerms().destinations.map((d) => [d.slug, d.name]));
  const trips: CheckoutTrip[] = getTrips()
    .filter((t) => t.price)
    .map((t) => ({ slug: t.slug, title: t.title, days: t.days, price: t.price!, cover: t.cover, region: names[t.destinations[0]] ?? "" }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="bg-snow-2 min-h-dvh pt-32 pb-24">
      <div className="mx-auto max-w-site px-4 sm:px-6">
        <p className="eyebrow text-pine flex items-center gap-2"><Lock className="size-3.5" aria-hidden /> Secure booking</p>
        <h1 className="font-display mt-3 text-[clamp(3rem,7vw,5.5rem)] font-black uppercase leading-[0.88]">
          Book your <span className="accent-word text-marigold">adventure.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">Choose your dates and group size. You&apos;ll pay on WeTravel&apos;s encrypted checkout, and our team confirms every detail by email.</p>
        <div className="mt-12">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-[1.8rem] bg-card" />}>
            <Checkout trips={trips} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
