import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheckBig, Clock } from "lucide-react";
import { settleHblOrder } from "@/lib/server/gateway";
import { site, whatsappHref } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

/** Where the bank sends the traveller back. The result is checked with the bank, never read from the address. */
export default async function PayReturn({ searchParams }: { searchParams: Promise<{ o?: string; done?: string; error?: string }> }) {
  const { o = "", done, error } = await searchParams;
  let state: "paid" | "pending" | "failed" | "review" | "unknown" = done ? "paid" : "unknown";
  let ref = done ?? error ?? "";
  if (o && o.length <= 20 && /^(BCA|PAY)-[A-Z0-9-]{4,16}$/.test(o)) {
    const r = await settleHblOrder(o).catch(() => ({ state: "pending" as const, booking: undefined }));
    state = r.state;
    ref = r.booking?.reference ?? ref;
  }
  if (error) state = "failed";
  const look = {
    paid: { Icon: CircleCheckBig, tone: "bg-moss/15 text-moss", title: "Payment received", text: "Thank you! Your payment is confirmed. A confirmation email and your receipt are on their way." },
    pending: { Icon: Clock, tone: "bg-marigold/20 text-pine", title: "We're confirming your payment", text: "The bank hasn't confirmed it yet. You'll receive an email as soon as it does; there is no need to pay again." },
    review: { Icon: Clock, tone: "bg-marigold/20 text-pine", title: "We're checking your payment", text: "Our team is checking this payment with the bank and will contact you shortly." },
    failed: { Icon: CircleAlert, tone: "bg-crimson/10 text-crimson", title: "Payment not completed", text: "Nothing was charged. You can try again with the button below, or contact us and we'll help." },
    unknown: { Icon: CircleAlert, tone: "bg-crimson/10 text-crimson", title: "Payment not found", text: "We couldn't find this payment. If money was taken, please contact us with your booking reference." },
  }[state];
  return (
    <section className="bg-snow-2 grid min-h-[80dvh] place-items-center px-4 pt-32 pb-20">
      <div className="max-w-xl text-center">
        <span className={`mx-auto grid size-16 place-items-center rounded-full ${look.tone}`}><look.Icon className="size-8" aria-hidden /></span>
        <h1 className="font-display mt-6 text-5xl leading-tight font-black">{look.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{look.text}</p>
        {ref ? <p className="mt-2 text-sm text-ink-soft">Booking reference <strong className="font-mono">{ref}</strong></p> : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {state === "failed" && ref ? <a href={`/pay/${ref}/`} className="bg-pine rounded-full px-6 py-3 font-semibold text-white">Try again</a> : <Link href="/trip/" className="bg-pine rounded-full px-6 py-3 font-semibold text-white">Explore more trips</Link>}
          <a href={whatsappHref(`Namaste, about my payment for booking ${ref}`)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white">WhatsApp us</a>
        </div>
        <p className="mt-6 text-xs text-ink-soft">{site.email} · {site.mobile}</p>
      </div>
    </section>
  );
}
