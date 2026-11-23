"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, ShieldCheck, X } from "lucide-react";
import { verifyStepUpAction } from "@/app/admin/(panel)/step-up-actions";
import { inputClass } from "@/components/admin/ui";
import type { StepUpPurpose } from "@/lib/admin/step-up-purposes";
import { cn } from "@/lib/utils";

export type StepUpRequest = {
  purpose: StepUpPurpose;
  /** What is about to happen, e.g. "Delete “Everest Base Camp Trek” for good". */
  title: string;
  /** More detail: what changes, what can't be undone. */
  detail?: React.ReactNode;
  /** Label of the confirm button, e.g. "Delete". */
  action?: string;
  danger?: boolean;
};

type Ask = (r: StepUpRequest) => Promise<boolean>;
const Ctx = createContext<Ask | null>(null);

/**
 * Sensitive changes ask for the current authenticator code in this dialog
 * first. The server refuses the change without a fresh confirmation, so this
 * dialog is the only way through, never just a formality.
 */
export function StepUpProvider({ method, children }: { method: "code" | "password"; children: React.ReactNode }) {
  const [req, setReq] = useState<(StepUpRequest & { resolve: (ok: boolean) => void }) | null>(null);
  // Opened from a new task: buttons call this inside a React transition, which would otherwise
  // hold the dialog back until the transition ends (and the transition is waiting for the dialog).
  const ask = useCallback<Ask>((r) => new Promise((resolve) => { setTimeout(() => setReq({ ...r, resolve }), 0); }), []);
  return (
    <Ctx.Provider value={ask}>
      {children}
      {req ? <Dialog key={req.title + req.purpose} req={req} method={method} onDone={(ok) => { req.resolve(ok); setReq(null); }} /> : null}
    </Ctx.Provider>
  );
}

/** Returns `confirm(request)`: resolves true once the person confirmed with a valid code. */
export function useStepUp(): Ask {
  const ask = useContext(Ctx);
  // Outside the admin panel there is nothing to confirm with: refuse.
  return ask ?? (async () => false);
}

function Dialog({ req, method, onDone }: { req: StepUpRequest; method: "code" | "password"; onDone: (ok: boolean) => void }) {
  const [code, setCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onDone(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [busy, onDone]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return setError("Tick the box to confirm.");
    setBusy(true);
    setError(null);
    const r = await verifyStepUpAction(code, req.purpose);
    setBusy(false);
    if (r.ok) return onDone(true);
    setError(r.error);
    setCode("");
    if (r.signedOut) setTimeout(() => { window.location.href = "/login"; }, 2500);
    else input.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="stepup-title">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className={cn("flex items-start gap-3 border-b border-line px-5 py-4", req.danger ? "bg-red-50 dark:bg-red-950/40" : "bg-pine/5")}>
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", req.danger ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200" : "bg-pine/15 text-pine")}><ShieldCheck className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Confirm a sensitive change</p>
            <h2 id="stepup-title" className="mt-0.5 font-bold leading-snug">{req.title}</h2>
          </div>
          <button type="button" disabled={busy} onClick={() => onDone(false)} className="grid size-8 place-items-center rounded-full text-muted hover:text-ink" aria-label="Cancel"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {req.detail ? <div className="text-sm text-ink-soft">{req.detail}</div> : null}
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[var(--pine)]" />
            <span>I understand and want to make this change.</span>
          </label>
          <div>
            <label htmlFor="stepup-code" className="flex items-center gap-1.5 text-sm font-semibold"><KeyRound className="size-4 text-muted" /> {method === "code" ? "Code from your authenticator app" : "Your password"}</label>
            <input
              ref={input}
              id="stepup-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type={method === "code" ? "text" : "password"}
              inputMode={method === "code" ? "numeric" : undefined}
              autoComplete={method === "code" ? "one-time-code" : "current-password"}
              placeholder={method === "code" ? "123 456" : ""}
              maxLength={method === "code" ? 20 : 200}
              className={cn(inputClass, "mt-1.5", method === "code" && "text-center font-mono text-lg tracking-[0.3em]")}
            />
            <p className="mt-1.5 text-xs text-muted">{method === "code" ? "Lost your phone? A backup code works too." : "Two-step sign-in is off on this server, so your password is asked instead."}</p>
          </div>
          {error ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" disabled={busy} onClick={() => onDone(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink">Cancel</button>
          <button type="submit" disabled={busy || !code.trim() || !agree} className={cn("inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-40", req.danger ? "bg-red-700 hover:bg-red-800" : "bg-pine hover:bg-pine-deep")}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}{req.action ?? "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
}
