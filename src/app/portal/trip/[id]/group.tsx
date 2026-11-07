"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Smartphone, UserPlus } from "lucide-react";
import { inputClass } from "@/components/admin/ui";
import { inviteToGroup, removeFromGroup, savePush } from "../../actions";

type Member = { id: string; name: string; email: string; joined: boolean; you: boolean };

/** The group on this booking. The lead traveller can add and remove people. */
export function Group({ bookingId, lead, members, pax, canEdit }: { bookingId: string; lead: string; members: Member[]; pax: number; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ name: "", email: "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const room = Math.max(0, pax - 1 - members.length);
  return (
    <div className="mt-4">
      <ul className="divide-y divide-line rounded-xl border border-line">
        <li className="flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pine text-sm font-bold text-white">{lead.charAt(0).toUpperCase()}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{lead}{canEdit ? " (you)" : ""}</span><span className="text-xs text-muted">Lead traveller · payments and receipts</span></span>
        </li>
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-glacier-soft text-sm font-bold text-pine">{m.name.charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.name}{m.you ? " (you)" : ""}</span><span className="block truncate text-xs text-muted">{canEdit ? `${m.email} · ` : ""}{m.joined ? "Has signed in" : "Invitation sent"}</span></span>
            {canEdit ? <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove ${m.name} from this trip page?`)) start(async () => { const r = await removeFromGroup(bookingId, m.id); setMsg(r.message); router.refresh(); }); }} className="rounded-full px-2 py-1 text-xs font-semibold text-muted hover:text-red-600">Remove</button> : null}
          </li>
        ))}
      </ul>
      {canEdit && room > 0 ? (
        <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await inviteToGroup(bookingId, v); setMsg(r.message); if (r.ok) { setV({ name: "", email: "" }); router.refresh(); } }); }}>
          <input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={120} placeholder="Their name" aria-label="Their name" className={inputClass} />
          <input required type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} maxLength={200} placeholder="Their email" aria-label="Their email" className={inputClass} />
          <button disabled={pending} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50"><UserPlus className="size-4" aria-hidden />{pending ? "Sending…" : "Invite"}</button>
          <p className="text-xs text-muted sm:col-span-3">You can add {room} more {room === 1 ? "person" : "people"}. They get their own sign-in to add their passport and flight details, documents and packing list. Payments and receipts stay with you.</p>
        </form>
      ) : null}
      {msg ? <p role="status" className="mt-2 text-sm font-semibold text-pine">{msg}</p> : null}
    </div>
  );
}

const b64 = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Switches phone notifications on or off for this device. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<"loading" | "unsupported" | "ios" | "off" | "on" | "blocked">("loading");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState(ios && !standalone ? "ios" : "unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "blocked" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/portal-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
      const r = await savePush(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setMsg(r.message);
      setState(r.ok ? "on" : "off");
    } catch {
      setMsg("This browser couldn't switch on notifications.");
    } finally {
      setBusy(false);
    }
  }
  async function turnOff() {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await savePush({ endpoint: sub.endpoint }, true); await sub.unsubscribe(); }
    setState("off");
    setMsg("Notifications are off on this device.");
    setBusy(false);
  }

  // Space is kept while the browser is asked, so nothing below jumps.
  if (state === "loading") return <div className="h-[4.5rem] rounded-2xl border border-line bg-card/60" aria-hidden />;
  if (state === "unsupported") return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pine/10 text-pine">{state === "on" ? <Bell className="size-5" aria-hidden /> : state === "ios" ? <Smartphone className="size-5" aria-hidden /> : <BellOff className="size-5" aria-hidden />}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{state === "on" ? "Phone notifications are on" : state === "ios" ? "Get notifications on your iPhone" : state === "blocked" ? "Notifications are blocked" : "Get a notification when we reply"}</p>
        <p className="text-xs text-muted">{state === "ios" ? "Tap Share, then 'Add to Home Screen', open My trip from there and switch notifications on." : state === "blocked" ? "Allow notifications for this site in your browser settings, then reload." : msg || "Replies from our office, new documents, trip photos and reminders."}</p>
      </div>
      {state === "off" ? <button type="button" disabled={busy} onClick={turnOn} className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{busy ? "One moment…" : "Turn on"}</button> : null}
      {state === "on" ? <button type="button" disabled={busy} onClick={turnOff} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine hover:text-pine">Turn off</button> : null}
    </div>
  );
}
