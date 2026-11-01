import Link from "next/link";
import type { Metadata } from "next";
import { Check, Clock, Gauge, MessageCircle, Mountain, Star, Users, X } from "lucide-react";
import Image from "@/components/image";
import { AltitudeProfile } from "@/components/altitude-profile";
import { Faq } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { TripSlider } from "@/components/trip/trip-slider";
import { getTrip, getTrips } from "@/lib/content";
import { CHART_WORDS, DIFFICULTY, LANG_NAMES, UI, tripAlternates, tripLangs, tripPath, translation, type Lang } from "@/lib/i18n";
import { missing } from "@/lib/not-found";
import { abs, bareTitle, breadcrumbLd, tripLd } from "@/lib/seo";
import { site, whatsappHref } from "@/lib/site";

/** One component for /de/trip/…, /fr/trip/… and /es/trip/…. */
export function localizedParams(lang: Lang) {
  return getTrips().filter((t) => translation(t, lang)).map((t) => ({ slug: t.slug }));
}

const clip = (s: string, n = 158) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);

export function localizedMetadata(lang: Lang, slug: string): Metadata {
  const trip = getTrip(slug);
  const tr = trip ? translation(trip, lang) : null;
  if (!trip || !tr) return { robots: { index: false } };
  const t = bareTitle(tr.seoTitle) || tr.title;
  const branded = `${t} | ${site.name}`;
  const description = clip(tr.seoDescription || tr.summary);
  const url = abs(tripPath(slug, lang));
  return {
    title: { absolute: branded.length <= 62 ? branded : t },
    description,
    alternates: { canonical: url, languages: tripAlternates(trip) },
    openGraph: { type: "website", url, siteName: site.name, title: t, description, locale: { de: "de_DE", fr: "fr_FR", es: "es_ES" }[lang], images: trip.cover ? [{ url: abs(trip.cover.src), width: trip.cover.w, height: trip.cover.h, alt: trip.cover.alt || tr.title }] : undefined },
  };
}

const money = (n: number, lang: Lang) => new Intl.NumberFormat({ de: "de-DE", fr: "fr-FR", es: "es-ES" }[lang], { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const paragraphs = (s: string) => s.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean);

export async function LocalizedTrip({ lang, params }: { lang: Lang; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = getTrip(slug);
  const tr = trip ? translation(trip, lang) : null;
  if (!trip || !tr) return missing(tripPath(slug, lang));
  const w = UI[lang];
  const days = trip.itinerary.map((d, i) => ({ ...d, title: tr.itinerary[i]?.title?.trim() || "", body: tr.itinerary[i]?.body?.trim() || "" }));
  const translatedDays = days.every((d) => d.title) ? days : [];
  const altitude = translatedDays.filter((d) => d.altitude).length >= 3 ? translatedDays : [];
  const photos = [trip.cover, ...trip.gallery].filter(Boolean) as NonNullable<typeof trip.cover>[];
  const diff = trip.difficulty ? DIFFICULTY[lang][trip.difficulty.toLowerCase()] ?? trip.difficulty : null;
  const ld = { ...tripLd(trip), name: tr.title, description: tr.summary, url: abs(tripPath(slug, lang)), inLanguage: lang };
  const facts = [
    { icon: Clock, label: w.days, value: `${trip.days} ${w.days}` },
    ...(trip.maxAltitude ? [{ icon: Mountain, label: w.maxAltitude, value: `${trip.maxAltitude.toLocaleString(lang)} m` }] : []),
    ...(diff ? [{ icon: Gauge, label: w.difficulty, value: diff }] : []),
    { icon: Users, label: w.group, value: trip.groupSize.max ? `${trip.groupSize.min}–${trip.groupSize.max}` : `${trip.groupSize.min}+` },
  ];
  const book = tripPath(slug) + "#book";

  return (
    <div lang={lang}>
      <section className="pt-[5.5rem] lg:pt-[6.25rem]">
        <div className="mx-auto max-w-site px-4 pt-6 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
            <Link href="/trip/" className="hover:text-pine">{w.trips}</Link> <span aria-hidden>/</span> <span className="text-ink">{tr.title}</span>
          </nav>
          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="font-display text-[clamp(2.2rem,5vw,4.2rem)] leading-[1.03] text-ink">{tr.title}</h1>
              <p className="mt-4 text-lg text-ink-soft">{tr.summary}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {trip.rating ? <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2.5 text-sm font-semibold"><Star className="fill-marigold text-marigold size-4" aria-hidden /> {trip.rating.value.toFixed(1)} · {trip.rating.count} {w.reviews}</span> : null}
              <a href={book} className="bg-pine rounded-full px-6 py-3 font-semibold text-white">{w.book}</a>
            </div>
          </div>
          <LangSwitch trip={trip} current={lang} label={w.alsoIn} />
        </div>
        <div className="mx-auto mt-7 max-w-site px-4 sm:px-6"><TripSlider images={photos} title={tr.title} /></div>
        <div className="mx-auto max-w-site px-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-5 border-b border-line py-6 sm:grid-cols-4">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3"><Icon className="text-pine size-6 shrink-0" aria-hidden /><div><dt className="text-xs text-ink-soft">{label}</dt><dd className="font-semibold">{value}</dd></div></div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto grid max-w-site gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-14">
          {tr.overview ? (
            <section id="overview" className="scroll-mt-32">
              <h2 className="font-display text-3xl">{w.overview}</h2>
              <div className="prose-trip mt-5 max-w-none text-lg leading-relaxed text-ink-soft [&_a]:text-pine [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-4" dangerouslySetInnerHTML={{ __html: tr.overview }} />
            </section>
          ) : null}
          {tr.highlights.length ? (
            <section>
              <h2 className="font-display text-3xl">{w.highlights}</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">{tr.highlights.map((h) => <li key={h} className="flex gap-3 rounded-2xl border border-line bg-card p-4"><Check className="text-moss mt-0.5 size-5 shrink-0" aria-hidden />{h}</li>)}</ul>
            </section>
          ) : null}
          {translatedDays.length ? (
            <section id="itinerary" className="scroll-mt-32">
              <h2 className="font-display text-3xl">{w.itinerary}</h2>
              <ol className="mt-6 space-y-3">
                {translatedDays.map((d, i) => (
                  <li key={d.day}>
                    <details open={i === 0} className="group rounded-2xl border border-line bg-card p-5 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer items-baseline gap-4">
                        <span className="text-pine shrink-0 font-mono text-sm font-semibold">{w.day} {d.day}</span>
                        <span className="font-display text-lg font-bold">{d.title}</span>
                        {d.altitude ? <span className="ml-auto shrink-0 text-sm text-ink-soft">{d.altitude.toLocaleString(lang)} m</span> : null}
                      </summary>
                      {d.body ? <div className="mt-3 space-y-3 text-ink-soft">{paragraphs(d.body).map((p) => <p key={p.slice(0, 40)}>{p}</p>)}</div> : null}
                    </details>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {altitude.length ? (
            <section>
              <h2 className="font-display text-3xl">{w.altitude}</h2>
              <div className="mt-6 rounded-[1.6rem] border border-line bg-card p-4 sm:p-6"><AltitudeProfile days={altitude.map(({ day, title, altitude: a }) => ({ day, title, altitude: a }))} tone="light" words={CHART_WORDS[lang]} /></div>
            </section>
          ) : null}
          {tr.includes.length || tr.excludes.length ? (
            <section className="grid gap-6 md:grid-cols-2">
              {tr.includes.length ? <div className="rounded-2xl border border-line bg-card p-6"><h2 className="font-display text-2xl">{w.included}</h2><ul className="mt-4 space-y-2">{tr.includes.map((x) => <li key={x} className="flex gap-3"><Check className="text-moss mt-0.5 size-5 shrink-0" aria-hidden />{x}</li>)}</ul></div> : null}
              {tr.excludes.length ? <div className="rounded-2xl border border-line bg-card p-6"><h2 className="font-display text-2xl">{w.excluded}</h2><ul className="mt-4 space-y-2">{tr.excludes.map((x) => <li key={x} className="flex gap-3"><X className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />{x}</li>)}</ul></div> : null}
            </section>
          ) : null}
          {tr.faqs.length ? (
            <section>
              <h2 className="font-display text-3xl">{w.faqs}</h2>
              <div className="mt-6"><Faq items={tr.faqs} /></div>
            </section>
          ) : null}
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[1.6rem] border border-line bg-card p-6 shadow-sm">
            {trip.price?.amount ? (
              <p><span className="text-sm text-ink-soft">{w.from}</span><br /><span className="font-display text-4xl font-bold">{money(trip.price.amount, lang)}</span> <span className="text-sm text-ink-soft">{w.perPerson}</span></p>
            ) : null}
            <a href={book} className="bg-pine mt-5 block rounded-full px-6 py-3 text-center font-semibold text-white">{w.book}</a>
            <a href={whatsappHref(`${w.whatsappText} ${tr.title}.`)} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white"><MessageCircle className="size-5" aria-hidden />{w.whatsapp}</a>
            <p className="mt-4 text-xs text-ink-soft">{w.englishNote}</p>
          </div>
          {trip.cover ? <div className="relative mt-6 hidden aspect-[4/3] overflow-hidden rounded-[1.6rem] lg:block"><Image src={trip.cover.src} alt={trip.cover.alt || tr.title} fill sizes="22rem" className="object-cover" /></div> : null}
        </aside>
      </div>
      <JsonLd data={ld} />
      <JsonLd data={breadcrumbLd([{ name: w.trips, path: "/trip/" }, { name: tr.title, path: tripPath(slug, lang) }])} />
    </div>
  );
}

/** "This trip in: English · Deutsch · Français" (only languages that exist). */
export function LangSwitch({ trip, current, label }: { trip: NonNullable<ReturnType<typeof getTrip>>; current: "en" | Lang; label: string }) {
  const langs = tripLangs(trip);
  if (langs.length < 2) return null;
  return (
    <p className="mt-5 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-ink-soft">{label}:</span>
      {langs.map((l) => (l === current ? <span key={l} className="rounded-full bg-pine/10 px-3 py-1 font-semibold text-pine" aria-current="page">{LANG_NAMES[l]}</span> : <Link key={l} href={tripPath(trip.slug, l)} hrefLang={l} lang={l} className="rounded-full border border-line px-3 py-1 font-semibold hover:border-pine hover:text-pine">{LANG_NAMES[l]}</Link>))}
    </p>
  );
}
