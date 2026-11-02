"use client";

import { useSyncExternalStore } from "react";

/** Approximate prices in the visitor's currency. Rates come from Admin → Settings → Features. */
export type Cur = "USD" | "EUR" | "GBP" | "AUD";
type W = Window & { __BCA_FX__?: Partial<Record<Cur, number>> };
const KEY = "bca_currency";
const EVENT = "bca-currency";
const EURO = new Set(["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES"]);
const SYMBOL: Record<Cur, string> = { USD: "US$", EUR: "€", GBP: "£", AUD: "A$" };

function guess(): Cur {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const [lang, region] = l.split("-");
    const r = region?.toUpperCase();
    if (r === "GB") return "GBP";
    if (r === "AU") return "AUD";
    if (r && EURO.has(r)) return "EUR";
    if (!r && ["de", "fr", "es", "it", "nl", "pt", "fi", "el", "sk", "sl", "et", "lv", "lt"].includes(lang)) return "EUR";
    if (r) return "USD";
  }
  return "USD";
}

function read(): Cur {
  const fx = (window as W).__BCA_FX__;
  if (!fx) return "USD";
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  const c = (saved && saved in SYMBOL ? saved : guess()) as Cur;
  return c === "USD" || fx[c] ? c : "USD";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

export function useCurrency(): [Cur, (c: Cur) => void, Cur[]] {
  const cur = useSyncExternalStore(subscribe, read, () => "USD" as Cur);
  const set = (c: Cur) => { try { localStorage.setItem(KEY, c); } catch {} window.dispatchEvent(new Event(EVENT)); };
  const options = useSyncExternalStore(subscribe, () => ((window as W).__BCA_FX__ ? ALL : NONE), () => NONE);
  return [cur, set, options];
}
const ALL: Cur[] = ["USD", "EUR", "GBP", "AUD"];
const NONE: Cur[] = [];

export function convert(usd: number, cur: Cur): string | null {
  if (cur === "USD" || typeof window === "undefined") return null;
  const rate = (window as W).__BCA_FX__?.[cur];
  if (!rate) return null;
  // Round to the nearest 5 so it reads as the estimate it is.
  const v = Math.round((usd * rate) / 5) * 5;
  return `${SYMBOL[cur]}${v.toLocaleString("en-US")}`;
}

/** "≈ €1,190" under a US$ price; nothing for US$ or when switched off. */
export function ApproxPrice({ usd, className }: { usd: number; className?: string }) {
  const [cur] = useCurrency();
  const text = convert(usd, cur);
  if (!text) return null;
  return <span className={className} title="Approximate. Bookings are charged in US$.">≈ {text}</span>;
}

/** Small currency switch, only when the office has switched the feature on. */
export function CurrencyPicker({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const [cur, set, options] = useCurrency();
  if (!options.length) return null;
  return (
    <label className={className}>
      <span className="sr-only">Show prices in</span>
      <select value={cur} onChange={(e) => set(e.target.value as Cur)} className={`cursor-pointer rounded-md border bg-transparent px-1.5 py-0.5 text-xs font-semibold ${tone === "dark" ? "border-white/30 text-white [&>option]:text-ink" : "border-line text-ink-soft"}`}>
        {options.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );
}
