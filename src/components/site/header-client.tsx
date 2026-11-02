"use client";

import Image from "@/components/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, ChevronDown, Menu as MenuIcon, Phone, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { WhatsappIcon } from "@/components/icons";
import { Portal } from "@/components/portal";
import { SiteSearch } from "@/components/site/search";
import { ThemeToggle } from "@/components/theme-toggle";
import { site, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";
import { langOfPath, regionWord, word } from "@/lib/chrome-words";

export type HeaderRegion = { slug: string; name: string; count: number; photo: string; href: string };

/** The prototype's navigation, word for word. */
const LINKS = [
  { href: "/trip/", label: "Our trips", menu: true },
  { href: "/destination/", label: "Destinations", menu: true },
  { href: "/visa-info/", label: "Visa Info", menu: true },
  { href: "/blogs/", label: "Journal" },
  { href: "/our-affiliation/", label: "Our Affiliation" },
  { href: "/about-us/", label: "About us" },
];

const VISA_OPTIONS: HeaderRegion[] = [
  { slug: "nepal-visa", name: "Nepal Visa", count: 0, href: "/visa-info/nepal/", photo: "/media/2021/09/bouddhanath-scaled.webp" },
  { slug: "tibet-visa", name: "Tibet Visa", count: 0, href: "/visa-info/tibet/", photo: "/photos/region-tibet.webp" },
  { slug: "bhutan-visa", name: "Bhutan Visa", count: 0, href: "/visa-info/bhutan/", photo: "/photos/region-bhutan.webp" },
];

export function HeaderClient({ regions, tripOptions }: { regions: HeaderRegion[]; tripOptions: HeaderRegion[] }) {
  const pathname = usePathname();
  const lang = langOfPath(pathname);
  const w = (en: string) => word(lang, en);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setOpenMenu(null);
      setMobile(false);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = mobile ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile]);

  const open = (href: string) => {
    if (timer.current) clearTimeout(timer.current);
    setOpenMenu(href);
  };
  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpenMenu(null), 150);
  };

  const isActive = (href: string) => {
    const base = href.split("#")[0];
    if (base === "/destination/") return pathname.startsWith("/destination");
    if (base === "/trip/") return pathname.startsWith("/trip") || pathname.startsWith("/activities");
    if (base === "/visa-info/") return pathname.startsWith("/visa-info");
    if (base === "/blogs/") return pathname.startsWith("/blogs") || pathname.startsWith("/category");
    return pathname === base && !href.includes("#");
  };

  return (
    <>
      <header data-site-header className="fixed inset-x-0 top-0 z-50">
        <div
          data-header-bar
          className={cn(
            "relative border-b bg-snow/95 backdrop-blur-xl transition-[box-shadow,border-color] duration-500",
            scrolled ? "border-line shadow-[0_8px_30px_-22px_oklch(0.25_0.05_210/0.5)]" : "border-line/70",
          )}
        >
          <div className="mx-auto flex h-16 max-w-site items-center gap-4 px-4 sm:px-6 lg:h-[4.75rem] lg:px-6">
            <Link href="/" aria-label="Base Camp Adventure home" className="shrink-0">
              <Logo priority className="w-[92px] sm:w-[104px] lg:w-[112px]" />
            </Link>

            <nav aria-label="Main" className="mx-auto hidden items-center gap-0 xl:flex">
              {LINKS.map((l) =>
                l.menu ? (
                  <div key={l.href} className="relative" onMouseEnter={() => open(l.href)} onMouseLeave={close}>
                    <Link
                      href={l.href}
                      onFocus={() => open(l.href)}
                      aria-expanded={openMenu === l.href}
                      className={cn("relative inline-flex items-center gap-1 rounded-full px-3 py-2 text-[0.95rem] font-semibold transition-colors", isActive(l.href) || openMenu === l.href ? "text-pine" : "text-ink hover:text-pine")}
                    >
                      {w(l.label)}
                      <ChevronDown className={cn("size-4 transition-transform", openMenu === l.href && "rotate-180")} aria-hidden />
                    </Link>
                    <AnimatePresence>
                      {openMenu === l.href ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          className={cn("absolute top-full left-1/2 -translate-x-1/2 pt-3", l.href === "/destination/" ? "w-[19rem]" : "w-[24rem]")}
                        >
                          <div data-lenis-prevent className={cn("max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-card shadow-[0_24px_60px_-28px_oklch(0.25_0.05_210/0.45)]")}>
                            <div>
                            <ul className="grid gap-0.5 p-1.5">
                              {(l.href === "/trip/" ? tripOptions : l.href === "/visa-info/" ? VISA_OPTIONS : regions).map((r) => (
                                <li key={r.slug}>
                                  <Link href={r.href} className="group flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-snow-2">
                                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg">
                                      <Image src={r.photo} alt="" fill sizes="40px" className="object-cover" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-semibold group-hover:text-pine">{regionWord(lang, r.name)}</span>
                                      <span className="block text-xs text-muted">{l.href === "/visa-info/" ? w("Fees, documents & application steps") : `${r.count} ${w(r.slug === "nepal" ? "tours" : "trips")}`}</span>
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={cn("rounded-full px-3 py-2 text-[0.95rem] font-semibold transition-colors", isActive(l.href) ? "text-pine" : "text-ink hover:text-pine")}
                  >
                    {w(l.label)}
                  </Link>
                ),
              )}
            </nav>

            <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
              <div className="flex shrink-0 flex-col gap-0.5 rounded-xl border border-pine/15 border-l-2 border-l-pine bg-pine/[0.035] px-2 py-1.5 sm:gap-1 sm:px-3">
                <div className="flex items-center justify-between gap-3 text-xs leading-tight sm:text-sm">
                  <span className="font-bold tracking-wide text-ink">{site.contactPerson.split(" ")[0]}</span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-muted"><span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />{w("Available Now")}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <a href={`tel:${site.mobileHref}`} className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.65rem] font-bold tracking-tight text-pine hover:underline sm:text-sm"><Phone className="size-3 shrink-0 sm:size-3.5" aria-hidden />{site.mobile}</a>
                  <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" aria-label={`Contact ${site.contactPerson.split(" ")[0]} on WhatsApp`} title="Chat on WhatsApp" className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 sm:size-6"><WhatsappIcon className="size-3.5" /></a>
                </div>
              </div>
              <div className="hidden sm:block"><ThemeToggle /></div>
              <button type="button" onClick={() => setMobile(true)} aria-label="Open menu" aria-expanded={mobile} className="grid size-10 place-items-center rounded-lg border border-line text-ink xl:hidden">
                <MenuIcon className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </header>
      <SiteSearch />

      <Portal>
        <AnimatePresence>
          {mobile ? (
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[150] flex flex-col bg-snow xl:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4 pt-[env(safe-area-inset-top)] sm:px-6">
                <Logo className="w-[92px]" />
                <div className="flex items-center gap-1.5">
                  <ThemeToggle />
                  <button type="button" onClick={() => setMobile(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-lg border border-line">
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
              </div>
              <nav aria-label="Mobile" className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-6 sm:px-6">
                {LINKS.map((l, i) => (
                  <motion.div key={l.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.3 }}>
                    <Link href={l.href} className="flex items-center justify-between border-b border-line py-4 text-[1.35rem] font-bold tracking-tight">
                      {w(l.label)} <ArrowRight className="size-5 text-muted" aria-hidden />
                    </Link>
                    {l.menu ? (
                      <div className="py-3">
                        <div className="grid grid-cols-2 gap-2">
                        {(l.href === "/trip/" ? tripOptions : l.href === "/visa-info/" ? VISA_OPTIONS : regions).map((r) => (
                          <Link key={r.slug} href={r.href} className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-semibold">
                            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg">
                              <Image src={r.photo} alt="" fill sizes="40px" className="object-cover" />
                            </span>
                            <span>
                            {regionWord(lang, r.name).replace(" Region", "")} {l.href !== "/visa-info/" ? <span className="text-xs font-normal text-muted">{r.count}</span> : null}
                            </span>
                          </Link>
                        ))}
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                ))}
                <Link href="/contact-us/" className="flex items-center justify-between border-b border-line py-4 text-[1.35rem] font-bold tracking-tight">
                  {w("Contact")} <ArrowRight className="size-5 text-muted" aria-hidden />
                </Link>
              </nav>
              <div className="grid shrink-0 gap-2 border-t border-line bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:${site.mobileHref}`} className="flex items-center justify-center gap-2 rounded-lg border border-line py-3 text-sm font-bold">
                    <Phone className="size-4" aria-hidden /> {w("Call 24/7")}
                  </a>
                  <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 text-sm font-bold text-white">
                    <WhatsappIcon className="size-4" /> WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Portal>
    </>
  );
}
