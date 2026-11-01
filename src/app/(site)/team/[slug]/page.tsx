import Image from "@/components/image";
import Link from "next/link";
import { missing } from "@/lib/not-found";
import { ArrowLeft } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/motion";
import { Breadcrumbs } from "@/components/page-hero";
import { getMember, getTeam } from "@/lib/content";
import { abs, meta } from "@/lib/seo";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// New pages published from the admin render on first visit, then stay cached.
export const dynamicParams = true;

export function generateStaticParams() {
  return getTeam().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) return {};
  return meta({ path: `/team/${slug}/`, title: `${m.name}, ${m.role}`, description: m.excerpt, image: m.photo });
}

export default async function MemberPage({ params }: Props) {
  const { slug } = await params;
  const m = getMember(slug);
  if (!m) missing(`/team/${slug}/`);

  return (
    <section className="bg-pine-night relative overflow-hidden pt-32 pb-24 text-white">
      <div className="aura absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-site gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <Reveal>
          <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-white/5">
            {m.photo ? <Image src={m.photo.src} alt={m.name} fill preload sizes="(max-width: 1024px) 100vw, 35vw" className="object-cover" /> : null}
          </div>
        </Reveal>
        <div>
          <Breadcrumbs items={[{ name: "Our team", path: "/our-team/" }, { name: m.name, path: `/team/${slug}/` }]} />
          <p className="eyebrow text-marigold mt-8">{m.role}</p>
          <h1 className="font-display mt-3 text-[clamp(3rem,7vw,6rem)] font-black uppercase leading-[0.88]">{m.name}</h1>
          <Reveal delay={0.1}>
            <div className="prose-trail prose-on-dark mt-8" dangerouslySetInnerHTML={{ __html: m.bio }} />
          </Reveal>
          <Link href="/our-team/" className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold hover:bg-white/10">
            <ArrowLeft className="size-4" aria-hidden /> The whole team
          </Link>
        </div>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: m.name,
          jobTitle: m.role,
          image: m.photo ? abs(m.photo.src) : undefined,
          worksFor: { "@type": "Organization", name: site.name, url: site.url },
          url: abs(`/team/${slug}/`),
        }}
      />
    </section>
  );
}
