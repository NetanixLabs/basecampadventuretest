"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, FileDown, Lock, MessageSquare, Phone, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { WhatsappIcon } from "@/components/icons";
import { openTripModal } from "@/components/trip/trip-modals";
import { site, whatsappHref } from "@/lib/site";
import type { Price } from "@/lib/types";
import { usd } from "@/lib/utils";
import { SITE_COPY_DEFAULTS, type SiteCopy } from "@/lib/site-copy";
import { ApproxPrice, CurrencyPicker } from "@/components/currency";
import { TripPageActions } from "@/components/shortlist";

/**
 * The booking box: discount and "From" price per adult, Book Now, Customize
 * Trip, the program PDF, help, and the reasons it is safe to book.
 */
export function BookingCard({ slug, title, price, copy = SITE_COPY_DEFAULTS.booking }: { slug: string; title: string; price: Price | null; days: number; copy?: SiteCopy["booking"] }) {
  const off = price?.regular ? Math.round((1 - price.amount / price.regular) * 100) : 0;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_60px_-40px_oklch(0.2_0.04_170/0.55)]">
      <div className="bg-pine relative overflow-hidden p-6 text-white dark:bg-pine-deep">
        <div aria-hidden className="blueprint absolute inset-0 text-white opacity-[0.07]" />
        {off > 0 ? <span className="bg-crimson absolute top-5 right-5 rounded-full px-3 py-1 text-xs font-bold">{off}% Off</span> : null}
        <p className="relative text-[0.66rem] font-bold tracking-[0.16em] text-white/75 uppercase">{price ? "From, per adult" : "Book this trip"}</p>
        {price ? (
          <div className="relative mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            {price.regular ? <span className="pb-1 text-lg text-white/60 line-through">{usd(price.regular)}</span> : null}
            <span className="font-display text-5xl leading-none">{usd(price.amount)}</span>
          </div>
        ) : null}
        {price ? (
          <div className="relative mt-2 flex min-h-6 items-center gap-2 text-sm text-white/80">
            <ApproxPrice usd={price.amount} />
            <CurrencyPicker tone="dark" className="ml-auto" />
          </div>
        ) : (
          <p className="font-display relative mt-2 text-4xl leading-none">Price on request</p>
        )}
      </div>

      <div className="space-y-2.5 p-5">
        {price ? (
          <button type="button" onClick={() => openTripModal("book")} className="bg-pine hover:bg-pine-deep flex w-full items-center justify-center gap-2 rounded-lg py-3.5 font-bold text-white transition-colors">
            Book Now <ArrowRight className="size-4" aria-hidden />
          </button>
        ) : null}
        <Link href={`/customize-trip/?trip=${encodeURIComponent(slug)}#request`} className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-3.5 font-bold transition-colors hover:border-pine">
          <SlidersHorizontal className="size-4" aria-hidden /> Customize Trip
        </Link>
        <a href={`/trip/${slug}/itinerary.pdf`} download className="hover:text-pine flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-ink-soft">
          <FileDown className="size-4" aria-hidden /> Download trip program (PDF)
        </a>
        <TripPageActions slug={slug} title={title} />
        <div className="rounded-xl bg-snow-2 p-3.5 text-center">
          <p className="text-sm font-semibold">{copy.helpTitle}</p>
          <button type="button" onClick={() => openTripModal("enquire")} className="text-pine mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold hover:underline">
            <MessageSquare className="size-4" aria-hidden /> {copy.helpButton}
          </button>
        </div>
      </div>

      {/* Why it is safe to book */}
      <ul className="grid gap-2.5 border-t border-line px-5 py-4 text-[0.8rem] text-ink-soft">
        <li className="flex items-start gap-2.5">
          <ShieldCheck className="text-pine mt-0.5 size-4 shrink-0" aria-hidden />
          <span>Licensed by the Government of Nepal · Reg. {site.registration[0].value} · TAAN {site.registration[3].value}</span>
        </li>
        {copy.trust.map((t, i) => (
          <li key={t} className="flex items-start gap-2.5">
            {i === 0 ? <Lock className="text-pine mt-0.5 size-4 shrink-0" aria-hidden /> : <BadgeCheck className="text-pine mt-0.5 size-4 shrink-0" aria-hidden />}
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3 border-t border-line bg-snow p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{copy.callTitle}</p>
          <a href={`tel:${site.mobileHref}`} className="text-pine inline-flex items-center gap-1.5 text-sm">
            <Phone className="size-3.5" aria-hidden /> {site.mobile} [{site.contactPerson.split(" ")[0]}]
          </a>
        </div>
        <a href={whatsappHref(`Namaste! I'm interested in the ${title}.`)} target="_blank" rel="noopener noreferrer" aria-label="Ask on WhatsApp" className="grid size-11 place-items-center rounded-full bg-[#25D366] text-white">
          <WhatsappIcon className="size-5" />
        </a>
      </div>
    </div>
  );
}

/** Pinned to the bottom of the screen on phones. */
export function MobileBookingBar({ price }: { slug: string; title: string; price: Price | null }) {
  return (
    <div className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line px-4 pt-3 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {price ? (
            <>
              <p className="text-[0.68rem] font-semibold tracking-wide text-muted uppercase">From</p>
              <p className="font-display text-3xl leading-none">
                {usd(price.amount)} <span className="text-sm font-semibold text-muted normal-case">/ Adult</span>
              </p>
              <ApproxPrice usd={price.amount} className="text-xs text-muted" />
            </>
          ) : (
            <p className="text-sm font-bold">Price on request</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => openTripModal("enquire")} aria-label="Send Us A Message" className="grid size-12 place-items-center rounded-lg border border-line bg-card">
            <MessageSquare className="size-5" aria-hidden />
          </button>
          {price ? (
            <button type="button" onClick={() => openTripModal("book")} className="bg-pine inline-flex items-center gap-2 rounded-lg px-5 py-3.5 font-bold text-white">
              Book Now <ArrowRight className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
