"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Alert, Help, inputClass, Label } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { beginTotpSetup, confirmTotpSetup, requestReset, resetPassword, signIn, verifyTwoFactor, type FormState } from "./actions";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, null);
  return (
    <form action={action} className="space-y-5">
      {notice ? <Alert tone="green">{notice}</Alert> : null}
      {state?.error ? <Alert tone="red">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus={!state?.email} defaultValue={state?.email} key={state?.email ?? ""} className={inputClass} />
      </div>
      <div>
        <Label htmlFor="password" hint={<Link href="/forgot" className="font-semibold text-pine hover:underline">Forgot password?</Link>}>
          Password
        </Label>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </div>
      <Submit className="w-full" pending="Signing in…">Sign in</Submit>
    </form>
  );
}

function PasswordInput(props: { id: string; name: string; autoComplete: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} required className={`${inputClass} pr-16`} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-xs font-semibold text-muted hover:text-pine" aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function VerifyForm() {
  const [state, action] = useActionState<FormState, FormData>(verifyTwoFactor, null);
  const [backup, setBackup] = useState(false);
  return (
    <form action={action} className="space-y-5">
      {state?.error ? <Alert tone="red">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="code">{backup ? "Backup code" : "6-digit code"}</Label>
        {backup ? (
          <input key="b" id="code" name="code" autoComplete="off" required autoFocus placeholder="XXXXX-XXXXX" className={`${inputClass} font-mono tracking-widest uppercase`} />
        ) : (
          <input key="t" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="123 456" className={`${inputClass} text-center font-mono text-xl tracking-[0.4em]`} />
        )}
        <Help>{backup ? "Each backup code works once." : "Open your authenticator app and type the code shown for Base Camp Adventure."}</Help>
      </div>
      <Submit className="w-full" pending="Checking…">Continue</Submit>
      <button type="button" onClick={() => setBackup((b) => !b)} className="w-full text-center text-sm font-semibold text-pine hover:underline">
        {backup ? "Use my authenticator app instead" : "Lost your phone? Use a backup code"}
      </button>
    </form>
  );
}

export function SetupForm({ alreadyOn }: { alreadyOn?: boolean }) {
  const [enrol, setEnrol] = useState<{ qr: string; secret: string } | { error: string } | null>(null);
  const [state, action] = useActionState(confirmTotpSetup, null);
  useEffect(() => {
    if (!alreadyOn) void beginTotpSetup().then(setEnrol);
  }, [alreadyOn]);

  // The codes stay on screen until the person continues, even though the page refreshes behind them.
  if (state?.codes) return <BackupCodes codes={state.codes} />;
  if (alreadyOn) return (
    <div className="space-y-4">
      <Alert tone="green">Two-step sign-in is already on for this account.</Alert>
      <Link href="/" className="block w-full rounded-full bg-pine px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-pine-deep">Go to the dashboard</Link>
    </div>
  );
  if (!enrol) return <p className="text-sm text-muted">Preparing your QR code…</p>;
  if ("error" in enrol) return <Alert tone="red">{enrol.error}</Alert>;
  return (
    <div className="space-y-6">
      <ol className="space-y-2 text-sm text-ink-soft">
        <li>1. Install an authenticator app: Google Authenticator, Microsoft Authenticator or 1Password.</li>
        <li>2. In the app, add an account and scan this code.</li>
        <li>3. Type the 6-digit code it shows.</li>
      </ol>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrol.qr} alt="QR code for your authenticator app" width={200} height={200} />
        <details className="w-full text-center text-xs text-muted">
          <summary className="cursor-pointer font-semibold">Can't scan? Enter this key</summary>
          <code className="mt-2 block font-mono text-sm break-all text-ink select-all">{enrol.secret.match(/.{1,4}/g)?.join(" ")}</code>
        </details>
      </div>
      <form action={action} className="space-y-4">
        {state?.error ? <Alert tone="red">{state.error}</Alert> : null}
        <div>
          <Label htmlFor="code">Code from the app</Label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required placeholder="123 456" className={`${inputClass} text-center font-mono text-xl tracking-[0.4em]`} />
        </div>
        <Submit className="w-full" pending="Checking…">Turn on two-step sign-in</Submit>
      </form>
    </div>
  );
}

function BackupCodes({ codes }: { codes: string[] }) {
  const text = codes.join("\n");
  return (
    <div className="space-y-5">
      <Alert tone="green">Two-step sign-in is on. Your account is protected.</Alert>
      <div>
        <p className="text-sm font-semibold">Your backup codes</p>
        <p className="mt-1 text-sm text-muted">If you lose your phone, each of these lets you in once. Save them somewhere safe now. They won't be shown again.</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-card p-4 font-mono text-sm">
          {codes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => void navigator.clipboard.writeText(text)} className="rounded-full border border-line px-4 py-2 text-xs font-semibold hover:border-pine">Copy</button>
          <a download="base-camp-admin-backup-codes.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Base Camp Adventure admin backup codes\n\n${text}\n`)}`} className="rounded-full border border-line px-4 py-2 text-xs font-semibold hover:border-pine">Download</a>
        </div>
      </div>
      <Link href="/" className="block w-full rounded-full bg-pine px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-pine-deep">I've saved them. Continue</Link>
    </div>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestReset, null);
  if (state?.ok) return <Alert tone="green">{state.ok}</Alert>;
  return (
    <form action={action} className="space-y-5">
      {state?.error ? <Alert tone="red">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus className={inputClass} />
      </div>
      <Submit className="w-full" pending="Sending…">Email me a reset link</Submit>
      <Link href="/login" className="block text-center text-sm font-semibold text-pine hover:underline">Back to sign in</Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, null);
  return (
    <form action={action} className="space-y-5">
      {state?.error ? <Alert tone="red">{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={12} />
        <Help>At least 12 characters. A short sentence you'll remember is ideal, e.g. "prayer flags over namche".</Help>
      </div>
      <div>
        <Label htmlFor="confirm">Type it again</Label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" minLength={12} />
      </div>
      <Submit className="w-full" pending="Saving…">Save password and sign in</Submit>
    </form>
  );
}
