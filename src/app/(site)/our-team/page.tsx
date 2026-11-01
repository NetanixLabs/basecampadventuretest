import Image from "@/components/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion";
import { PageHero } from "@/components/page-hero";
import { getTeam } from "@/lib/content";
import { meta } from "@/lib/seo";

export const metadata = meta({
  path: "/our-team/",
  title: "Our Team",
  description: "Meet the Base Camp Adventure team: founder Shree Ghimire, our operations manager, and the licensed trekking, climbing and cultural guides who lead every trip.",
});

export default function TeamPage() {
  const team = getTeam();
  return (
    <>
      <PageHero
        title="Our"
        accent="Team"
        eyebrow={`${team.length} guides & staff`}
        photo="/photos/page-team.webp"
        crumbs={[{ name: "Our team", path: "/our-team/" }]}
      />
      <section className="mx-auto max-w-site px-4 py-20 sm:px-6">
        <Stagger className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          {team.map((m) => (
            <StaggerItem key={m.slug}>
              <Link href={`/team/${m.slug}/`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[1.6rem] bg-snow-2">
                  {m.photo ? (
                    <Image
                      src={m.photo.src}
                      alt={m.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover grayscale-[35%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    />
                  ) : null}
                  <span className="bg-marigold text-pine-night absolute right-4 bottom-4 grid size-11 place-items-center rounded-full opacity-0 transition-all duration-500 group-hover:opacity-100">
                    <ArrowUpRight className="size-5" aria-hidden />
                  </span>
                </div>
                <p className="font-display mt-4 text-3xl font-black uppercase leading-none group-hover:text-pine">{m.name}</p>
                <p className="eyebrow mt-2 text-muted">{m.role}</p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
