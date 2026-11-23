import Image from "@/components/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { LineReveal, Reveal } from "@/components/motion";
import { breadcrumbLd } from "@/lib/seo";
import { cropFor } from "@/lib/banner";
import { imageSize } from "@/lib/image-size";
import { cn } from "@/lib/utils";

export type Crumb = { name: string; path: string };

/** Breadcrumb trail plus its BreadcrumbList schema. */
export function Breadcrumbs({ items, tone = "light" }: { items: Crumb[]; tone?: "dark" | "light" }) {
  const all = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className={cn("flex flex-wrap items-center gap-1.5 text-[0.8rem]", tone === "dark" ? "text-white/70" : "text-muted")}>
          {all.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1.5">
              {i > 0 ? <ChevronRight className="size-3.5 opacity-60" aria-hidden /> : null}
              {i === all.length - 1 ? (
                <span aria-current="page" className={cn("line-clamp-1", tone === "dark" ? "text-white" : "text-ink")}>{c.name}</span>
              ) : (
                <Link href={c.path} className="hover:text-pine">{c.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(all)} />
    </>
  );
}

/**
 * Page heading in the prototype's style: breadcrumbs, a small eyebrow, the
 * page title (the one H1), then a wide photograph.
 */
export function PageHero({
  title,
  accent,
  eyebrow = "Base Camp Adventure",
  intro,
  photo,
  crumbs,
  children,
  size = "md",
}: {
  title: string;
  accent?: string;
  eyebrow?: string;
  intro?: React.ReactNode;
  photo: string;
  crumbs: Crumb[];
  children?: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <section className="pt-[5.5rem] lg:pt-[6.25rem]">
      <div className="mx-auto max-w-site px-4 pt-6 sm:px-6 lg:px-6">
        <Reveal y={8}>
          <Breadcrumbs items={crumbs} />
        </Reveal>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <Reveal y={8} delay={0.05}>
              <p className="eyebrow text-pine">{eyebrow}</p>
            </Reveal>
            <LineReveal
              as="h1"
              immediate
              delay={0.08}
              lines={accent ? [<span key="t">{title} <span className="accent-word">{accent}</span></span>] : [title]}
              className="font-display mt-3 text-[clamp(2.3rem,5.4vw,4.5rem)] leading-[1.02] text-ink"
            />
          </div>
          {intro ? (
            <Reveal delay={0.2} y={10}>
              <div className="max-w-xl text-lg leading-relaxed text-ink-soft lg:pb-2">{intro}</div>
            </Reveal>
          ) : null}
        </div>
        {children ? <Reveal delay={0.25} y={10}>{children}</Reveal> : null}
      </div>
      <div className="mx-auto mt-8 max-w-site px-4 sm:px-6 lg:px-6">
        <BannerPhoto src={photo} wide={size === "lg" ? 21 / 8 : 21 / 7} />
      </div>
    </section>
  );
}

/**
 * The page's wide photograph: 3:2 on phones, a wide strip from 640 px. Each
 * crop shows exactly one logo: the one in the photo, or an overlay in its place.
 */
function BannerPhoto({ src, wide }: { src: string; wide: number }) {
  const size = imageSize(src);
  const small = size ? cropFor(size.w, size.h, 3 / 2) : null;
  const large = size ? cropFor(size.w, size.h, wide) : null;
  return (
    <div
      className={cn("relative overflow-hidden rounded-xl bg-snow-2", wide > 2.9 ? "aspect-[3/2] sm:aspect-[21/7]" : "aspect-[3/2] sm:aspect-[21/8]")}
      style={{ ["--pos-s" as string]: small?.position ?? "50% 50%", ["--pos-l" as string]: large?.position ?? "50% 40%" }}
    >
      <Image src={src} alt="" fill preload fetchPriority="high" quality={75} sizes="(max-width: 1440px) 100vw, 1376px" className="object-cover object-[var(--pos-s)] sm:object-[var(--pos-l)]" />
    </div>
  );
}
