"use client";

import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { changePassword, signOutOthers } from "../system-actions";

export function AccountForms({ totp }: { totp: boolean }) {
  const [v, setV] = useState({ current: "", next: "", code: "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title="Change password">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await changePassword(v); setMsg(r.ok ? r.message ?? "Done." : r.error); if (r.ok) setV({ current: "", next: "", code: "" }); }); }}>
        <div><Label htmlFor="cp">Current password</Label><input id="cp" type="password" autoComplete="current-password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} className={inputClass} required /></div>
        <div><Label htmlFor="np" info={<>At least 12 characters. A short sentence is easiest.</>}>New password</Label><input id="np" type="password" autoComplete="new-password" minLength={12} value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} className={inputClass} required /></div>
        {totp ? <div><Label htmlFor="cc">Code from your authenticator app</Label><input id="cc" inputMode="numeric" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} className={`${inputClass} font-mono`} required /></div> : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Change password</button>
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await signOutOthers(); setMsg(r.ok ? r.message ?? "" : r.error); })} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-pine">Sign out other devices</button>
        </div>
        {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      </form>
    </Card>
  );
}
