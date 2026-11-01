import Image from "@/components/image";
import Link from "next/link";
import { SiteChrome } from "@/components/site/chrome";

export default function NotFound() {
  return (
    <SiteChrome>
    <section className="bg-pine-night relative isolate grid min-h-[90dvh] place-items-center overflow-hidden px-4 text-center text-white">
      <Image src="/photos/page-404.webp" alt="" fill sizes="100vw" className="-z-10 object-cover object-right-bottom opacity-60" />
      <div className="scrim-hero absolute inset-0 -z-10" />
      <div className="max-w-2xl pt-24">
        <p className="eyebrow text-marigold">Error 404 · altitude unknown</p>
        <h1 className="font-display mt-4 text-[clamp(4rem,14vw,10rem)] font-black uppercase leading-[0.85]">
          Off the <span className="accent-word text-marigold">trail.</span>
        </h1>
        <p className="mt-6 text-lg text-white/80">This page has moved or never existed. The mountains are still where we left them.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="bg-marigold text-pine-night rounded-full px-7 py-4 font-bold">
            Back to base camp
          </Link>
          <Link href="/trip/" className="rounded-full border border-white/30 px-7 py-4 font-semibold hover:bg-white/10">
            Browse all trips
          </Link>
        </div>
      </div>
    </section>
    </SiteChrome>
  );
}
