import { Suspense } from "react";
import { Lock } from "lucide-react";
import { OnlinePaymentForm } from "@/components/online-payment-form";
import { getTrips } from "@/lib/content";
import { meta } from "@/lib/seo";

export const metadata = {
  ...meta({ path: "/online-payment/", title: "Online Payment", description: "Pay for your Base Camp Adventure trip online." }),
  robots: { index: false, follow: true },
};

export default function OnlinePaymentPage() {
  const trips = getTrips().map((t) => ({ slug: t.slug, title: t.title })).sort((a, b) => a.title.localeCompare(b.title));
  return (
    <div className="bg-snow-2 min-h-dvh pt-32 pb-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="eyebrow text-pine flex items-center gap-2"><Lock className="size-3.5" aria-hidden /> Secure payment</p>
        <h1 className="font-display mt-3 text-[clamp(3rem,8vw,5.5rem)] font-black uppercase leading-[0.88]">
          Online <span className="accent-word text-marigold">Payment</span>
        </h1>
        <div className="mt-10 rounded-[1.8rem] border border-line bg-card p-5 shadow-[0_30px_60px_-40px_oklch(0.2_0.04_170/0.45)] sm:p-8">
          <Suspense fallback={<div className="h-96" />}>
            <OnlinePaymentForm trips={trips} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
