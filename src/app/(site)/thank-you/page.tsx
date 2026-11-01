import Link from "next/link";
import { CircleCheckBig } from "lucide-react";
import { site, whatsappHref } from "@/lib/site";

export const metadata = { title: "Thank you", robots: { index: false, follow: true } };

export default function ThankYou() {
  return (
    <section className="bg-snow-2 grid min-h-[80dvh] place-items-center px-4 pt-32 pb-20">
      <div className="max-w-xl text-center">
        <span className="bg-moss/15 text-moss mx-auto grid size-16 place-items-center rounded-full">
          <CircleCheckBig className="size-8" aria-hidden />
        </span>
        <h1 className="font-display mt-6 text-6xl font-black uppercase leading-[0.9]">
          Dhanyabad. <span className="accent-word text-marigold">Thank you.</span>
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          We&apos;ve got your message and will reply within a few hours. For anything urgent, call or WhatsApp Shree on {site.mobile}.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/trip/" className="bg-pine rounded-full px-6 py-3 font-semibold text-white">
            Keep exploring trips
          </Link>
          <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white">
            WhatsApp us
          </a>
        </div>
      </div>
    </section>
  );
}
