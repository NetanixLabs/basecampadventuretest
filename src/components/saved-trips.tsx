"use client";

import Link from "next/link";
import { ArrowRight, GitCompareArrows, Heart, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { TripCard } from "@/components/trip-card";
import { COMPARE_MAX, setList, useList } from "@/lib/shortlist";
import type { TripCard as Card } from "@/lib/types";

export function SavedTrips({ trips, regionNames, restore }: { trips: Card[]; regionNames: Record<string, string>; restore: string[] | null }) {
  const saved = useList("saved");
  useEffect(() => {
    if (!restore?.length) return;
    let mine: string[] = [];
    try { mine = JSON.parse(localStorage.getItem("bca_saved") ?? "[]"); } catch {}
    setList("saved", [...new Set([...restore, ...(Array.isArray(mine) ? mine : [])])]);
  }, [restore]);
  const list = saved.map((s) => trips.find((t) => t.slug === s)).filter((t): t is Card => Boolean(t));
  const [email, setEmail] = useState("");
  const [remind, setRemind] = useState(true);
  const [state, setState] = useState<{ ok?: boolean; msg?: string; busy?: boolean }>({});

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ busy: true });
    const website = String(new FormData(e.currentTarget).get("website") ?? "");
    const r = await fetch("/api/saved/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, trips: saved, remind, website }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setState(r?.ok ? { ok: true, msg: "Sent! Check your inbox (and spam folder, just in case)." } : { ok: false, msg: j.error ?? "Could not send. Please try again." });
  }

  if (!list.length) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-card p-10 text-center">
        <Heart className="mx-auto size-10 text-crimson" aria-hidden />
        <p className="font-display mt-4 text-2xl">No saved trips yet</p>
        <p className="mt-2 text-muted">Tap the heart on any trip photo to keep it here.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/trip/" className="inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2.5 text-sm font-bold text-white">Browse trips <ArrowRight className="size-4" aria-hidden /></Link>
          <Link href="/trip-finder/" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-bold hover:border-pine">Try the trip finder</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{list.length} saved {list.length === 1 ? "trip" : "trips"}</p>
          {list.length > 1 ? <Link href={`/compare/?trips=${list.slice(0, COMPARE_MAX).map((t) => t.slug).join(",")}`} onClick={() => setList("compare", list.slice(0, COMPARE_MAX).map((t) => t.slug))} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold hover:border-pine"><GitCompareArrows className="size-4" aria-hidden /> Compare {Math.min(list.length, COMPARE_MAX)}</Link> : null}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {list.map((t) => <TripCard key={t.slug} trip={t} regionName={regionNames[t.destinations[0]]} />)}
        </div>
      </div>
      <aside className="h-fit rounded-3xl border border-line bg-card p-6 shadow-sm lg:sticky lg:top-28">
        <Mail className="size-7 text-pine" aria-hidden />
        <h2 className="font-display mt-3 text-xl">Email me this list</h2>
        <p className="mt-1 text-sm text-muted">Open it on any device, or share it with your travel partner.</p>
        {state.ok ? <p role="status" className="mt-4 rounded-xl bg-pine/8 p-3 text-sm text-pine">{state.msg}</p> : (
          <form onSubmit={send} className="mt-4 space-y-3">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <label className="block"><span className="sr-only">Your email address</span><input type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" className="w-full rounded-xl border border-line bg-snow-2/50 px-4 py-3 text-base outline-none focus:border-pine sm:text-sm" /></label>
            <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pine)]" /> Send me one reminder in a few days</label>
            <button disabled={state.busy} className="w-full rounded-lg bg-pine py-3 text-sm font-bold text-white hover:bg-pine-deep disabled:opacity-50">{state.busy ? "Sending…" : "Email my list"}</button>
            {state.msg ? <p role="alert" className="text-sm text-crimson">{state.msg}</p> : null}
            <p className="text-[11px] text-muted">We only use your email for this list (and the one reminder if ticked). No newsletter unless you sign up for it.</p>
          </form>
        )}
      </aside>
    </div>
  );
}
