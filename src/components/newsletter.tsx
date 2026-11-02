"use client";

import { useChromeLang } from "@/components/site/tr";
import { word } from "@/lib/chrome-words";
import { useState } from "react";
import { ArrowRight, CircleCheck, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Email-only newsletter sign-up. `tone="dark"` for the footer, `light` elsewhere.
 */
export function Newsletter({ source, tone = "light", className }: { source: string; tone?: "light" | "dark"; className?: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  const dark = tone === "dark";
  const lang = useChromeLang();
  const w = (en: string) => word(lang, en);

  if (state === "done") {
    return (
      <p role="status" className={cn("flex items-center gap-2 text-sm font-semibold", dark ? "text-white" : "text-pine", className)}>
        <CircleCheck className="size-5 shrink-0" aria-hidden /> {w("You're on the list. Dhanyabad!")}
      </p>
    );
  }

  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError("");
        try {
          const res = await fetch("/api/newsletter/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source, website }) });
          const json = await res.json().catch(() => ({ ok: false }));
          if (!json.ok) throw new Error(json.error ?? "Please try again.");
          setState("done");
        } catch (err) {
          setError((err as Error).message);
          setState("idle");
        }
      }}
    >
      <label htmlFor={`nl-${source}`} className="sr-only">
        {w("Email address")}
      </label>
      <div className={cn("flex items-center gap-1.5 rounded-xl border p-1.5", dark ? "border-white/20 bg-white/[0.06] focus-within:border-[#3ccbdc]" : "border-line bg-card focus-within:border-pine")}>
        <Mail className={cn("ml-2 size-4 shrink-0", dark ? "text-white/50" : "text-muted")} aria-hidden />
        <input
          id={`nl-${source}`}
          type="email"
          required
          autoComplete="email"
          placeholder={w("Your email address")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn("min-w-0 flex-1 bg-transparent px-1.5 py-2 text-sm outline-none", dark ? "text-white placeholder:text-white/45" : "placeholder:text-muted")}
        />
        <button type="submit" disabled={state === "busy"} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60", dark ? "bg-[#3ccbdc] text-[#0f2a30] hover:bg-white" : "bg-pine hover:bg-pine-deep text-white")}>
          {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {w("Sign up")} <ArrowRight className="hidden size-4 sm:block" aria-hidden />
        </button>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden />
      {error ? <p role="alert" className={cn("mt-2 text-xs font-medium", dark ? "text-[#ffb4ab]" : "text-crimson")}>{error}</p> : null}
    </form>
  );
}
