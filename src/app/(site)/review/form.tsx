"use client";

import { Star } from "lucide-react";
import { useState } from "react";

const LABELS = ["", "Disappointing", "Could be better", "Good", "Very good", "Unforgettable"];
const field = "mt-1.5 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-pine focus:ring-2 focus:ring-pine/20";

export function ReviewForm({ token, name, country }: { token: string; name: string; country: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) return setError("Please choose 1 to 5 stars.");
    const f = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    const r = await fetch("/api/review/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, rating, name: f.get("name"), country: f.get("country"), title: f.get("title"), body: f.get("body"), consent: f.get("consent") === "on", website: f.get("website") }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) return setState("done");
    setState("idle");
    setError(j.error ?? "Something went wrong. Please try again.");
  }

  if (state === "done") return (
    <div className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm">
      <p className="font-display text-3xl font-black">Dhanyabad!</p>
      <p className="mt-3 text-ink-soft">Your review has reached our team. Once it is approved it will appear on the trip page.</p>
    </div>
  );

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="mt-10 space-y-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <fieldset>
        <legend className="font-semibold">Your rating</legend>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="rounded-lg p-1 transition-transform hover:scale-110">
              <Star className={`size-9 ${n <= shown ? "fill-marigold text-marigold" : "text-ink/20"}`} aria-hidden />
            </button>
          ))}
          <span className="ml-3 text-sm font-semibold text-ink-soft">{LABELS[shown]}</span>
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Your name<input name="name" required maxLength={80} defaultValue={name} className={field} /></label>
        <label className="block text-sm font-semibold">Country<input name="country" maxLength={60} defaultValue={country} className={field} /></label>
      </div>
      <label className="block text-sm font-semibold">Title<input name="title" maxLength={120} placeholder="e.g. The trip of a lifetime" className={field} /></label>
      <label className="block text-sm font-semibold">Your review<textarea name="body" required minLength={20} maxLength={4000} rows={6} placeholder="What did you enjoy most? How were your guide and porters?" className={field} /></label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex items-start gap-3 text-sm text-ink-soft"><input name="consent" type="checkbox" required className="mt-0.5 size-5 accent-[var(--pine)]" /> I agree that Base Camp Adventure may show my review, first name and country on its website.</label>
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <button disabled={state === "sending"} className="bg-pine w-full rounded-full px-6 py-3.5 font-semibold text-white disabled:opacity-60 sm:w-auto">{state === "sending" ? "Sending…" : "Send my review"}</button>
    </form>
  );
}
