import Image from "@/components/image";
import { Award, CalendarDays, HeartHandshake, MapPin, Sprout, Users } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion";
import { galleryPhoto } from "@/lib/content";
import type { CommunityPost } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const ICONS = { Relief: HeartHandshake, Sponsorship: Award, Community: Users, Environment: Sprout } as const;

/**
 * Social work posted by the team. A post with photographs shows the first
 * one; a post without shows its place on a teal panel, so nothing is ever
 * illustrated with a picture that was not taken there.
 */
export function CommunityCards({ posts, full = false, className }: { posts: CommunityPost[]; full?: boolean; className?: string }) {
  return (
    <Stagger className={cn("grid gap-4 sm:grid-cols-2 lg:gap-5", className)}>
      {posts.map((p) => {
        const Icon = ICONS[p.kind] ?? HeartHandshake;
        const cover = p.photos[0];
        return (
          <StaggerItem key={p.slug} className="h-full">
            <article id={p.slug} className="group flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[1.1rem] border border-line bg-card">
              <div className="relative aspect-[16/10] overflow-hidden">
                {cover ? (
                  <Image src={cover.src} alt={cover.alt || p.title} fill sizes="(max-width: 640px) 100vw, 40vw" quality={80} className="object-cover object-right-bottom transition-transform duration-[1100ms] group-hover:scale-[1.05]" />
                ) : (
                  <div className="bg-pine absolute inset-0 overflow-hidden text-white dark:bg-pine-deep">
                    <div aria-hidden className="blueprint absolute inset-0 text-white opacity-[0.09]" />
                    <div aria-hidden className="absolute -right-16 -bottom-20 size-72 rounded-full bg-[#36c4d5]/30 blur-3xl" />
                    <Icon aria-hidden strokeWidth={1.1} className="absolute -right-4 -bottom-6 size-48 text-white/15 transition-transform duration-700 group-hover:-rotate-6 group-hover:scale-105" />
                    <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
                      <Icon aria-hidden className="mb-auto size-8 text-white/90" />
                      <p className="text-[0.62rem] font-bold tracking-[0.16em] text-white/70 uppercase">{p.kind}</p>
                      <p className="font-display mt-1 text-3xl leading-none sm:text-4xl">{p.place.split(",")[0]}</p>
                    </div>
                  </div>
                )}
                {cover ? (
                  <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[0.62rem] font-bold tracking-[0.08em] text-[#242a2c] uppercase shadow-sm">{p.kind}</span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] font-bold tracking-[0.1em] text-muted uppercase">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="text-pine size-3.5" aria-hidden /> {p.place}
                  </span>
                  {p.date ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="text-pine size-3.5" aria-hidden /> {formatDate(p.date)}
                    </span>
                  ) : null}
                </p>
                <h3 className="font-display mt-3 text-xl leading-snug tracking-[-0.03em] text-ink">{p.title}</h3>
                {full && p.html ? (
                  <div className="prose-trail mt-3 text-[0.95rem]" dangerouslySetInnerHTML={{ __html: p.html }} />
                ) : (
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{p.summary}</p>
                )}
                {full && p.photos.length > 1 ? (
                  <ul className="mt-4 grid grid-cols-3 gap-2">
                    {p.photos.slice(1, 7).map((im) => (
                      <li key={im.src} className="relative aspect-square overflow-hidden rounded-lg">
                        <Image src={galleryPhoto(im.src)} alt={im.alt || p.title} fill sizes="160px" className="object-cover object-right-bottom" />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
