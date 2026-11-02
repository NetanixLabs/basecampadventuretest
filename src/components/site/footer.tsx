import Image from "@/components/image";
import { Tr } from "@/components/site/tr";
import Link from "next/link";
import { ArrowRight, ArrowUp, ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import { Accreditations } from "@/components/accreditations";
import { Logo } from "@/components/brand/logo";
import { FacebookIcon, InstagramIcon, WhatsappIcon, XIcon } from "@/components/icons";
import { Newsletter } from "@/components/newsletter";
import { FooterPlan } from "@/components/site/footer-plan";
import { getTrip } from "@/lib/content";
import { regNo, site, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

/** The card brands' own vector logos (transparent), in their original colours. */
const PAYMENTS = [
  { src: "/brand/payments/visa.svg", w: 512, h: 166, alt: "Visa", className: "h-5" },
  { src: "/brand/payments/mastercard.svg", w: 1000, h: 618, alt: "Mastercard", className: "h-7" },
  { src: "/brand/payments/american-express.svg", w: 1000, h: 998, alt: "American Express", className: "h-8" },
  { src: "/brand/payments/union-pay.svg", w: 256, h: 160, alt: "UnionPay", className: "h-7" },
  { src: "/brand/payments/jcb.svg", w: 300, h: 232, alt: "JCB", className: "h-7" },
];

const POPULAR = ["everest-base-camp-trek", "annapurna-base-camp-trek", "annapurna-circuit-trek", "langtang-valley-trek", "manaslu-circuit-trek", "ghorepani-poon-hill-trek"];

const COMPANY = [
  { href: "/about-us/", label: "Our story" },
  { href: "/our-team/", label: "Our Team" },
  { href: "/why-book-with-us/", label: "Why Travel With Us?" },
  { href: "/community/", label: "Community & social work" },
  { href: "/gallery/", label: "Photo Gallery" },
  { href: "/legal-documents/", label: "Legal Documents" },
  { href: "/terms-and-conditions/", label: "Terms and Conditions" },
  { href: "/online-payment/", label: "Online Payment" },
];

/** The closing call, a range of mountains, and the footer. */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const popular = POPULAR.map((slug) => getTrip(slug))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({ href: `/trip/${t.slug}/`, label: t.title }));

  const socials = [
    { href: site.social.facebook, label: "Facebook", icon: <FacebookIcon className="size-4" /> },
    { href: site.social.instagram, label: "Instagram", icon: <InstagramIcon className="size-4" /> },
    { href: site.social.x, label: "X", icon: <XIcon className="size-3.5" /> },
  ];

  return (
    <footer>
      {/* Let's make a plan. */}
      <FooterPlan>
      <section className="relative border-t border-line bg-snow">
        <div className="mx-auto flex max-w-site flex-col gap-8 px-4 py-14 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-6 lg:py-16">
          <div>
            <p className="eyebrow text-pine"><Tr>Your time. Your interests. Your trip.</Tr></p>
            <h2 className="font-display mt-3 text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-ink">
              <Tr>Let&apos;s make</Tr>
              <br />
              <span className="accent-word"><Tr>a plan.</Tr></span>
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-ink-soft"><Tr>Choose an itinerary or talk to our local team about a journey built around you.</Tr></p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/customize-trip/#request" className="bg-pine hover:bg-pine-deep inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-bold text-white transition-colors">
                <Tr>Plan your trip</Tr> <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-3.5 text-sm font-semibold">
                <WhatsappIcon className="size-4 text-[#25D366]" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
      </FooterPlan>

      <div className="relative overflow-hidden bg-[#1c2224] text-white/75">
        <div aria-hidden className="blueprint absolute inset-0 text-white opacity-[0.04]" />
        <div aria-hidden className="absolute -top-40 right-[-10%] size-[36rem] rounded-full bg-[#00afc4]/12 blur-[120px]" />
        <div className="relative mx-auto max-w-site px-4 pt-12 pb-8 sm:px-6 lg:px-6 lg:pt-14">
          {/* Newsletter: email only */}
          <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow text-[#3ccbdc]"><Tr>Newsletter</Tr></p>
              <p className="font-display mt-1.5 text-xl text-white sm:text-2xl"><Tr>Trip ideas and festival offers, by email.</Tr></p>
            </div>
            <Newsletter source="footer" tone="dark" className="w-full lg:max-w-md" />
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.35fr_1fr_1fr_1.25fr] lg:gap-12">
            {/* Brand */}
            <div className="text-center lg:text-left">
              <Logo tone="dark" className="mx-auto w-[132px] lg:mx-0" />
              <p className="mx-auto mt-5 max-w-xs text-sm leading-relaxed lg:mx-0"><Tr>{site.description}</Tr></p>
              <ul className="mt-6 flex items-center justify-center gap-2 lg:justify-start">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="me noopener noreferrer" aria-label={`Base Camp Adventure on ${s.label}`} className="grid size-10 place-items-center rounded-full border border-white/20 transition-all hover:-translate-y-0.5 hover:border-[#3ccbdc] hover:text-[#3ccbdc]">
                      {s.icon}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Phones: big contact buttons, then the link groups folded */}
            <div className="grid grid-cols-3 gap-2 lg:hidden">
              <a href={`tel:${site.mobileHref}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-3.5 text-xs font-semibold text-white">
                <Phone className="size-5 text-[#3ccbdc]" aria-hidden /> <Tr>Call 24/7</Tr>
              </a>
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-3.5 text-xs font-semibold text-white">
                <WhatsappIcon className="size-5 text-[#25D366]" /> WhatsApp
              </a>
              <a href={`mailto:${site.email}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-3.5 text-xs font-semibold text-white">
                <Mail className="size-5 text-[#3ccbdc]" aria-hidden /> <Tr>Email</Tr>
              </a>
            </div>
            <div className="divide-y divide-white/10 border-y border-white/10 lg:hidden">
              <Fold title="Popular treks" links={popular} />
              <Fold title="Company" links={COMPANY} />
            </div>

            {/* Desktop columns */}
            <LinkColumn title="Popular treks" links={popular} />
            <LinkColumn title="Company" links={COMPANY} />

            <div>
              <p className="eyebrow hidden text-[#3ccbdc] lg:block"><Tr>Get in touch</Tr></p>
              <ul className="mt-5 hidden space-y-3 text-sm lg:block">
                <li>
                  <a href={`tel:${site.mobileHref}`} className="flex items-start gap-2.5 hover:text-white">
                    <Phone className="mt-0.5 size-4 shrink-0" aria-hidden /> {site.mobile} <Tr>[Available 24/7]</Tr>
                  </a>
                </li>
                <li>
                  <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-2.5 hover:text-white">
                    <Phone className="mt-0.5 size-4 shrink-0 opacity-60" aria-hidden /> {site.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${site.email}`} className="flex items-start gap-2.5 hover:text-white">
                    <Mail className="mt-0.5 size-4 shrink-0" aria-hidden /> {site.email}
                  </a>
                </li>
              </ul>
              <p className="flex items-start justify-center gap-2.5 text-sm text-white/60 lg:mt-3 lg:justify-start">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {site.address.street}, {site.address.city}, Nepal · {site.address.poBox}
              </p>
              <p className="eyebrow mt-7 text-center text-[#3ccbdc] lg:text-left"><Tr>We Accept</Tr></p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                {PAYMENTS.map((p) => (
                  <Image key={p.alt} src={p.src} alt={p.alt} width={p.w} height={p.h} unoptimized className={cn(p.className, "w-auto")} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center gap-6 border-t border-white/10 pt-8 lg:flex-row lg:justify-between">
            <div>
              <p className="eyebrow mb-3 text-center text-[#3ccbdc] lg:text-left"><Tr>Our affiliations</Tr></p>
              <Accreditations variant="compact" surface="dark" />
            </div>
            <p className="text-center text-xs leading-relaxed text-white/50 lg:text-right">
              {[regNo("Govt. Reg.") && `Government Reg. No: ${regNo("Govt. Reg.")}`, regNo("VAT") && `VAT No: ${regNo("VAT")}`, regNo("NTB Licence") && `Tourism Licence: ${regNo("NTB Licence")}`].filter(Boolean).join(" · ")}
              <br />
              {[regNo("NMA") && `NMA Membership No: ${regNo("NMA")}`, regNo("TAAN") && `TAAN Member: ${regNo("TAAN")}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-site flex-col items-center gap-3 px-4 py-6 text-xs text-white/50 sm:flex-row sm:justify-between sm:px-6 lg:px-6">
            <p>© {year} {site.legalName}. <Tr>All rights reserved.</Tr></p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link href="/image-attributions/" className="hover:text-white"><Tr>Photo credits</Tr></Link>
              <Link href="/privacy-policy/" className="hover:text-white"><Tr>Privacy Policy</Tr></Link>
              <Link href="/terms-and-conditions/" className="hover:text-white"><Tr>Terms</Tr></Link>
              <Link href="/contact-us/" className="hover:text-white"><Tr>Contact Us</Tr></Link>
              <a href="#top" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 hover:border-white/40 hover:text-white">
                <Tr>Back to top</Tr> <ArrowUp className="size-3" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LinkColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className="hidden lg:block">
      <p className="eyebrow text-[#3ccbdc]"><Tr>{title}</Tr></p>
      <ul className="mt-5 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="link-draw hover:text-white">
              <Tr>{l.label}</Tr>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A link group that folds away on phones. */
function Fold({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-bold text-white [&::-webkit-details-marker]:hidden">
        <Tr>{title}</Tr>
        <ChevronDown className="size-4 text-white/60 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="grid grid-cols-1 gap-1 pb-4 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block py-1.5 hover:text-white">
              <Tr>{l.label}</Tr>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
