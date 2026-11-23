"use client";

import Image from "@/components/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, BookOpen, CornerDownLeft, FileText, Loader2, MapPin, Search, UserRound, X } from "lucide-react";
import { Portal } from "@/components/portal";
import { cn } from "@/lib/utils";

type Index = {
  trips: [string, string, string, number, number, string][];
  places: [string, string, string][];
  pages: [string, string, string][];
  posts: [string, string, string][];
  team: [string, string, string][];
};
type Kind = "page" | "place" | "trip" | "post" | "team";
type Hit = { kind: Kind; href: string; title: string; sub: string; image?: string; score: number };
const GROUP: Record<Kind, string> = { page: "Pages", place: "Regions & activities", trip: "Trips", post: "Travel guides", team: "Our team" };
const BLOG_WORDS = "blog blogs journal article articles guide guides news";

let cache: Promise<Index> | null = null;
const load = () => (cache ??= fetch("/search-index.json").then((r) => r.json() as Promise<Index>));

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Every query word must appear; matches at the start of a word rank first. */
function score(text: string, words: string[]) {
  const t = norm(text);
  let s = 0;
  for (const w of words) {
    const i = t.indexOf(w);
    if (i < 0) return 0;
    s += i === 0 ? 4 : /\W/.test(t[i - 1] ?? " ") ? 3 : 1;
  }
  return s;
}

/** Opens the search dialog from anywhere. */
export const openSearch = () => window.dispatchEvent(new Event("bca:search"));

const SUGGESTED = ["everest-base-camp-trek", "annapurna-base-camp-trek", "langtang-valley-trek", "manaslu-circuit-trek", "ghorepani-poon-hill-trek"];

/**
 * Site search, opened with Ctrl+K / Cmd+K, "/" or the header button.
 * Trips, regions, activities and guides; arrow keys and Enter to go.
 */
export function SiteSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<Index | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const show = useCallback(() => {
    setOpen(true);
    load().then(setIndex).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = Boolean(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        show();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("bca:search", show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bca:search", show);
    };
  }, [show]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const id = requestAnimationFrame(() => input.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    if (!index) return [];
    const words = norm(q).split(/\s+/).filter(Boolean);
    const trip = (t: Index["trips"][number], s: number): Hit => ({
      kind: "trip",
      href: `/trip/${t[0]}/`,
      title: t[1],
      sub: [t[2], `${t[3]} ${t[3] === 1 ? "day" : "days"}`, t[4] ? `from US$${t[4].toLocaleString("en-US")}` : ""].filter(Boolean).join(" · "),
      image: t[5],
      score: s,
    });
    if (!words.length) {
      // Before typing: a few of the most-booked treks.
      return SUGGESTED.map((slug) => index.trips.find((t) => t[0] === slug))
        .filter((t): t is Index["trips"][number] => Boolean(t))
        .map((t) => trip(t, 1));
    }
    const by = (a: Hit, b: Hit) => b.score - a.score || a.title.length - b.title.length;
    const trips = index.trips.map((t) => trip(t, score(t[1], words) * 2 || score(`${t[1]} ${t[2]}`, words))).filter((h) => h.score > 0);
    const places: Hit[] = index.places.map((p) => ({ kind: "place" as const, href: p[0], title: p[1], sub: p[2], score: score(p[1], words) * 2 })).filter((h) => h.score > 0);
    const pages: Hit[] = index.pages
      .map((p) => ({ kind: "page" as const, href: p[0], title: p[1], sub: p[0], score: score(p[1], words) * 2 || score(`${p[1]} ${p[2]}`, words) * 1.5 }))
      .filter((h) => h.score > 0);
    const blogWords = words.every((w) => BLOG_WORDS.includes(w));
    const posts: Hit[] = index.posts
      .map((p) => ({ kind: "post" as const, href: `/${p[0]}/`, title: p[1], sub: p[2] || "Travel guide", score: score(p[1], words) * 1.5 || score(p[2], words) * 0.6 || (blogWords ? 0.3 : 0) }))
      .filter((h) => h.score > 0);
    const team: Hit[] = index.team.map((m) => ({ kind: "team" as const, href: m[0], title: m[1], sub: m[2], score: score(`${m[1]} ${m[2]}`, words) })).filter((h) => h.score > 0);
    return [...pages.sort(by).slice(0, 4), ...places.sort(by).slice(0, 3), ...trips.sort(by).slice(0, 8), ...posts.sort(by).slice(0, 6), ...team.sort(by).slice(0, 3)];
  }, [index, q]);

  const close = () => {
    setOpen(false);
    setQ("");
    setSel(0);
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const allTrips = q.trim() ? `/trip/?q=${encodeURIComponent(q.trim())}` : "/trip/";

  return (
    <Portal>
      <AnimatePresence>
        {open ? (
          <m.div
            data-lenis-prevent
            className="fixed inset-0 z-[180] flex items-start justify-center bg-[#0b1012]/55 px-3 pt-[max(1rem,8vh)] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="Search the site"
              initial={{ y: -12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex max-h-[min(40rem,84dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSel((s) => Math.min(s + 1, Math.max(hits.length - 1, 0)));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSel((s) => Math.max(s - 1, 0));
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (hits[sel]) go(hits[sel].href);
                  else if (q.trim()) go(allTrips);
                }
              }}
            >
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="text-pine size-5 shrink-0" aria-hidden />
                <input
                  ref={input}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setSel(0);
                  }}
                  placeholder="Search trips, places, guides and pages"
                  aria-label="Search"
                  aria-controls="search-results"
                  aria-activedescendant={hits[sel] ? `search-${sel}` : undefined}
                  className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
                />
                {!index ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden /> : null}
                <button type="button" onClick={close} aria-label="Close search" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-snow-2 hover:text-ink">
                  <X className="size-4" aria-hidden />
                </button>
              </div>

              <ul ref={listRef} id="search-results" role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {!q.trim() && hits.length ? <li className="px-3 pt-2 pb-1 text-[0.66rem] font-bold tracking-[0.14em] text-muted uppercase">Popular treks</li> : null}
                {hits.map((h, i) => {
                  const first = i === 0 || hits[i - 1].kind !== h.kind;
                  return (
                    <li key={h.kind + h.href} role="presentation">
                      {q.trim() && first ? (
                        <p className="px-3 pt-3 pb-1 text-[0.66rem] font-bold tracking-[0.14em] text-muted uppercase">{GROUP[h.kind]}</p>
                      ) : null}
                      <button
                        type="button"
                        id={`search-${i}`}
                        data-i={i}
                        role="option"
                        aria-selected={i === sel}
                        onMouseMove={() => setSel(i)}
                        onClick={() => go(h.href)}
                        className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === sel && "bg-glacier-soft")}
                      >
                        {h.kind === "trip" && h.image ? (
                          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-snow-2">
                            <Image src={h.image} alt="" fill sizes="44px" className="object-cover" />
                          </span>
                        ) : (
                          <span className="text-pine grid size-11 shrink-0 place-items-center rounded-lg bg-snow-2">
                            {h.kind === "post" ? <BookOpen className="size-4" aria-hidden /> : h.kind === "page" ? <FileText className="size-4" aria-hidden /> : h.kind === "team" ? <UserRound className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{h.title}</span>
                          <span className="block truncate text-xs text-muted">{h.sub}</span>
                        </span>
                        {i === sel ? <CornerDownLeft className="size-4 shrink-0 text-muted" aria-hidden /> : null}
                      </button>
                    </li>
                  );
                })}
                {index && q.trim() && !hits.length ? (
                  <li className="px-4 py-10 text-center text-sm text-muted">
                    Nothing matches &ldquo;{q}&rdquo;.{" "}
                    <button type="button" onClick={() => go("/customize-trip/#request")} className="text-pine font-semibold underline">
                      Ask us to plan it
                    </button>
                  </li>
                ) : null}
              </ul>

              <div className="hidden items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted sm:flex">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">&uarr;</kbd>
                  <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">&darr;</kbd> to move,
                  <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">Enter</kbd> to open
                </span>
                <button type="button" onClick={() => go(allTrips)} className="text-pine inline-flex items-center gap-1 font-semibold">
                  All trips <ArrowRight className="size-3.5" aria-hidden />
                </button>
              </div>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}

/** The header's search button, with the shortcut shown on wide screens. */
export function SearchButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openSearch} aria-label="Search (Ctrl+K)" className={cn("hover:border-pine inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-line px-2.5 text-sm text-muted transition-colors", className)}>
      <Search className="size-4 text-ink" aria-hidden />
      <span className="hidden xl:inline">Search</span>
      <kbd className="hidden rounded border border-line px-1.5 font-mono text-[0.68rem] xl:inline">Ctrl K</kbd>
    </button>
  );
}
