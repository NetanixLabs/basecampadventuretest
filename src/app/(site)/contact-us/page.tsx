import { Suspense } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/enquiry-forms";
import { WhatsappIcon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { PageHero } from "@/components/page-hero";
import { getTrips } from "@/lib/content";
import { meta } from "@/lib/seo";
import { site, whatsappHref } from "@/lib/site";

export const metadata = meta({
  path: "/contact-us/",
  title: "Contact Us",
  description: "Talk to Base Camp Adventure in Thamel, Kathmandu: +977 985 102 9616 (24/7, WhatsApp), +977-1-4517875, info@basecampadventure.com.",
});

export default function ContactPage() {
  const trips = getTrips().map((t) => t.title);
  const cards = [
    { Icon: Phone, title: "Mobile (24/7)", lines: ["+977 9851 029616 [Shree]", "Available 24/7 - Call Us Anytime"], href: `tel:${site.mobileHref}` },
    { Icon: WhatsappIcon, title: "WhatsApp", lines: [site.mobile], href: whatsappHref() },
    { Icon: Mail, title: "Email", lines: [site.email], href: `mailto:${site.email}` },
    { Icon: Clock, title: "Phone", lines: [site.phone], href: `tel:${site.phone.replace(/[^+\d]/g, "")}` },
  ];

  return (
    <>
      <PageHero
        title="Contact"
        accent="Us"
        eyebrow="Available 24/7 - Call Us Anytime"
        photo="/photos/page-contact.webp"
        crumbs={[{ name: "Contact us", path: "/contact-us/" }]}
      />
      <section className="mx-auto grid max-w-site gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          {cards.map(({ Icon, title, lines, href }, i) => (
            <Reveal key={title} delay={i * 0.06}>
              <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="group flex gap-4 rounded-[1.4rem] border border-line bg-card p-5 transition-colors hover:border-pine">
                <span className="bg-pine/10 text-pine group-hover:bg-pine grid size-12 shrink-0 place-items-center rounded-2xl transition-colors group-hover:text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-bold">{title}</span>
                  {lines.map((l) => (
                    <span key={l} className="block text-sm text-muted">{l}</span>
                  ))}
                </span>
              </a>
            </Reveal>
          ))}
          <Reveal delay={0.3}>
            <div className="bg-pine-deep aura relative overflow-hidden rounded-[1.4rem] p-6 text-white">
              <p className="eyebrow text-marigold">Contact Info</p>
              <p className="font-display mt-2 text-3xl font-black uppercase">{site.legalName}</p>
              <p className="mt-3 flex gap-2 text-white/80">
                <MapPin className="text-marigold mt-1 size-4 shrink-0" aria-hidden />
                <span>{site.address.street}, {site.address.city}, Nepal<br />{site.address.poBox}</span>
              </p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${site.geo.lat},${site.geo.lng}`} target="_blank" rel="noopener noreferrer" className="bg-marigold text-pine-night mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-bold">
                Open in Google Maps
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal>
          <div className="rounded-[2rem] border border-line bg-card p-6 sm:p-10">
            <h2 className="font-display mb-8 text-4xl font-black uppercase">Send Us A Message</h2>
            <Suspense fallback={<div className="h-96" />}>
              <ContactForm trips={trips} />
            </Suspense>
          </div>
        </Reveal>
      </section>
    </>
  );
}
