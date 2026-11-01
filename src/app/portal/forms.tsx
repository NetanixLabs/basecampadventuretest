"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, inputClass, Label } from "@/components/admin/ui";
import { Submit } from "@/components/admin/submit";
import { portalForgot, portalSetPassword, portalSignIn, type PortalState } from "./actions";

function PasswordInput(props: { id: string; name: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} required className={`${inputClass} pr-16`} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-xs font-semibold text-muted hover:text-pine" aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
    </div>
  );
}

export function PortalLogin({ notice }: { notice?: string }) {
  const [state, action] = useActionState<PortalState, FormData>(portalSignIn, null);
  return (
    <form action={action} className="space-y-5">
      {notice ? <Alert tone="green">{notice}</Alert> : null}
      {state?.error ? <Alert tone="red">{state.error}</Alert> : null}
      <div><Label htmlFor="email">Email</Label><input id="email" name="email" type="email" autoComplete="username" required defaultValue={state?.email} key={state?.email ?? ""} className={inputClass} /></div>
      <div><Label htmlFor="password" hint={<Link href="/forgot/" className="font-semibold text-pine hover:underline">Forgot password?</Link>}>Password</Label><PasswordInput id="password" name="password" autoComplete="current-password" /></div>
      <Submit className="w-full" pending="Signing in…">Sign in</Submit>
    </form>
  );
}

export function PortalSetPassword({ token }: { token: string }) {
  const [state, action] = useActionState<PortalState, FormData>(portalSetPassword, null);
  return (
    <form action={action} className="space-y-5">
      {state?.error ? <Alert tone="red">{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <div><Label htmlFor="password" info="At least 12 characters. A short sentence you'll remember works well.">New password</Label><PasswordInput id="password" name="password" autoComplete="new-password" /></div>
      <div><Label htmlFor="confirm">Type it again</Label><PasswordInput id="confirm" name="confirm" autoComplete="new-password" /></div>
      <Submit className="w-full" pending="Saving…">Save and open my trip</Submit>
    </form>
  );
}

export function PortalForgot() {
  const [state, action] = useActionState<PortalState, FormData>(portalForgot, null);
  if (state?.ok) return <Alert tone="green">{state.ok}</Alert>;
  return (
    <form action={action} className="space-y-5">
      <div><Label htmlFor="email">Email</Label><input id="email" name="email" type="email" autoComplete="username" required className={inputClass} /></div>
      <Submit className="w-full" pending="Sending…">Send me a reset link</Submit>
      <Link href="/login/" className="block text-center text-sm font-semibold text-pine hover:underline">Back to sign in</Link>
    </form>
  );
}
