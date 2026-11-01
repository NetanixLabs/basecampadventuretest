import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, Clock, FileText } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { visaGuides } from "@/content/visa-guides";
import { meta } from "@/lib/seo";

export function generateStaticParams() { return Object.keys(visaGuides).map((country) => ({ country })); }
export async function generateMetadata({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const guide = visaGuides[country];
  if (!guide) return {};
  return meta({ path: `/visa-info/${country}/`, title: `${guide.country} Visa Information for Tourists`, description: guide.intro });
}

export default async function VisaPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const guide = visaGuides[country];
  if (!guide) notFound();
  return (
    <>
      <PageHero title={guide.country} accent="Visa information" eyebrow="Travel essentials · Checked 13 October 2026" intro={guide.intro} photo={guide.photo} crumbs={[{ name: "Visa information", path: "/visa-info/" }, { name: `${guide.country} Visa`, path: `/visa-info/${country}/` }]} />
      <div className="mx-auto max-w-site px-4 py-12 sm:px-6">
        <nav aria-label="Visa destinations" className="mb-8 flex flex-wrap gap-2">{Object.entries(visaGuides).map(([slug, item]) => <Link key={slug} href={`/visa-info/${slug}/`} aria-current={slug === country ? "page" : undefined} className={`rounded-full border px-5 py-2.5 text-sm font-semibold ${slug === country ? "border-pine bg-pine text-white" : "border-line bg-card text-ink hover:text-pine"}`}>{item.country} Visa</Link>)}</nav>
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-5"><p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-pine uppercase"><FileText className="size-4" aria-hidden /> Permitted stay</p><p className="text-lg font-semibold">{guide.stay}</p></div>
          <div className="rounded-2xl border border-line bg-card p-5"><p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-pine uppercase"><Clock className="size-4" aria-hidden /> Processing</p><p className="text-lg font-semibold">{guide.timing}</p></div>
        </div>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <section aria-labelledby="visa-fees"><h2 id="visa-fees" className="font-display mb-5 text-3xl">Fees &amp; pricing</h2><div className="overflow-x-auto rounded-2xl border border-line"><table className="w-full text-left text-sm"><thead className="bg-snow-2"><tr><th className="p-4">Item</th><th className="p-4">Cost</th><th className="p-4">Details</th></tr></thead><tbody>{guide.fees.map((fee) => <tr key={fee.item} className="border-t border-line"><th scope="row" className="p-4 font-semibold">{fee.item}</th><td className="p-4 font-bold text-pine">{fee.cost}</td><td className="p-4 text-muted">{fee.note}</td></tr>)}</tbody></table></div><p className="mt-4 text-sm leading-relaxed text-muted">{guide.feeNote}</p></section>
            <section aria-labelledby="visa-process"><h2 id="visa-process" className="font-display mb-5 text-3xl">How to apply</h2><ol className="space-y-4">{guide.steps.map((step, index) => <li key={step} className="flex gap-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pine/10 text-sm font-bold text-pine">{index + 1}</span><p className="pt-1 text-ink-soft">{step}</p></li>)}</ol></section>
            <section aria-labelledby="visa-notes"><h2 id="visa-notes" className="font-display mb-5 text-3xl">Stay limits &amp; entry conditions</h2><ul className="list-disc space-y-3 pl-5 text-ink-soft">{guide.notes.map((note) => <li key={note}>{note}</li>)}</ul></section>
          </div>
          <aside className="space-y-6">
            <section className="rounded-2xl border border-line bg-card p-6"><h2 className="font-display mb-5 text-2xl">Required documents</h2><ul className="space-y-4">{guide.documents.map((document) => <li key={document} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft"><Check className="mt-1 size-4 shrink-0 text-pine" aria-hidden />{document}</li>)}</ul></section>
            <section className="rounded-2xl border border-line bg-card p-6"><h2 className="font-display mb-5 text-2xl">Where to apply</h2><div className="space-y-5">{guide.apply.map((place) => <div key={place.url}><a href={place.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-pine underline underline-offset-4">{place.name}<ArrowUpRight className="size-4 shrink-0" aria-hidden /></a><p className="mt-2 text-sm text-muted">{place.detail}</p></div>)}</div></section>
            <section className="rounded-2xl bg-snow-2 p-6"><h2 className="font-display mb-4 text-xl">Official sources</h2><p className="mb-4 text-xs leading-relaxed text-muted">Checked 13 October 2026. Fees and entry rules can change; confirm with the relevant immigration authority before applying.</p><ul className="space-y-3">{guide.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm text-pine underline underline-offset-4">{source.name}</a></li>)}</ul></section>
          </aside>
        </div>
      </div>
    </>
  );
}
