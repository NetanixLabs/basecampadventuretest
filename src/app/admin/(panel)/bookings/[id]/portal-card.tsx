"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, Card, inputClass, Label } from "@/components/admin/ui";
import { deleteBookingFile, inviteTraveller, saveDetailsByOffice, setTravellerAccess } from "./portal-actions";

type Account = { email: string; status: string; expiresAt: string; lastLoginAt: string | null } | null;
type FileRow = { id: string; name: string; kind: string; bytes: number; fromOffice: boolean; date: string };
type Field = { key: string; label: string; group: string; type?: string };

const day = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const tone = { active: "green", invited: "amber", disabled: "gray", expired: "gray" } as const;

/** Traveller account, documents and details for one booking. */
export function PortalCard({ bookingId, enabled, eligible, account, files, details, fields }: { bookingId: string; enabled: boolean; eligible: boolean; account: Account; files: FileRow[]; details: Record<string, string>; fields: Field[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>, ask?: string) => start(async () => {
    if (ask && !confirm(ask)) return;
    const r = await fn();
    setMsg(r.message);
    router.refresh();
  });
  const btn = "rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine disabled:opacity-50";

  return (
    <>
      <Card title="Traveller account" info="A private page on my.basecampadventure.com where the traveller sees the trip and payments, enters passport and flight details, and uploads or downloads documents. It can be created only after WeTravel has received a deposit or full payment. It closes itself, and everything in it is deleted, after the trip (Settings → Features).">
        {msg ? <p role="status" className="mb-3 rounded-xl bg-pine/8 px-4 py-2.5 text-sm text-pine">{msg}</p> : null}
        {!enabled ? (
          <p className="text-sm text-muted">Traveller accounts are switched off in Settings → Features.</p>
        ) : account && account.status !== "expired" ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={tone[account.status as keyof typeof tone] ?? "gray"}>{account.status === "invited" ? "Invited, password not set yet" : account.status}</Badge><span className="text-muted">{account.email}</span></div>
            <p className="text-muted">Closes on {day(account.expiresAt)}{account.lastLoginAt ? ` · last signed in ${day(account.lastLoginAt)}` : ""}</p>
            <div className="flex flex-wrap gap-2">
              <button className={btn} disabled={pending} onClick={() => run(() => inviteTraveller(bookingId), "Send a new invitation link?")}>{account.status === "invited" ? "Resend invitation" : "Send a new password link"}</button>
              <button className={btn} disabled={pending} onClick={() => run(() => setTravellerAccess(bookingId, "extend"))}>Keep 30 days longer</button>
              {account.status === "disabled" ? (
                <button className={btn} disabled={pending} onClick={() => run(() => setTravellerAccess(bookingId, "enable"))}>Switch on</button>
              ) : (
                <button className={btn} disabled={pending} onClick={() => run(() => setTravellerAccess(bookingId, "disable"), "Switch this account off? The traveller is signed out straight away.")}>Switch off</button>
              )}
              <button className={`${btn} text-red-700`} disabled={pending} onClick={() => run(() => setTravellerAccess(bookingId, "close"), "Close the account now and delete the traveller's documents and details? This can't be undone.")}>Close and delete</button>
            </div>
          </div>
        ) : eligible ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted">Payment received. You can create the traveller's account now; they get an email to choose their own password.</p>
            <button className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} onClick={() => run(() => inviteTraveller(bookingId), "Create the account and email the traveller?")}>Create account and send invitation</button>
          </div>
        ) : (
          <p className="text-sm text-muted">Available once a deposit or full payment has been received.</p>
        )}
      </Card>
      <Card title="Documents" info="Files from the traveller and from the office, stored encrypted. Upload vouchers, permits or the final itinerary here and the traveller can download them from their trip page.">
        <OfficeUpload bookingId={bookingId} onDone={(m) => { setMsg(m); router.refresh(); }} />
        {files.length ? (
          <ul className="mt-4 divide-y divide-line text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                <a href={`/api/booking-file/${f.id}/`} className="min-w-0 flex-1"><span className="block truncate font-semibold hover:text-pine">{f.name}</span><span className="text-xs text-muted">{f.kind} · {size(f.bytes)} · {f.fromOffice ? "office" : "traveller"} · {day(f.date)}</span></a>
                <button className="text-xs font-semibold text-muted hover:text-red-600" disabled={pending} onClick={() => run(() => deleteBookingFile(bookingId, f.id), `Delete ${f.name}?`)}>Delete</button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted">No documents yet.</p>}
      </Card>
      <Card title="Traveller details" info="Passport, flights, insurance and emergency contact. The traveller fills these in on their trip page, or you can enter them here. Stored encrypted and deleted after the trip.">
        <DetailsEditor bookingId={bookingId} initial={details} fields={fields} />
      </Card>
    </>
  );
}

function OfficeUpload({ bookingId, onDone }: { bookingId: string; onDone: (m: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("voucher");
  const [busy, setBusy] = useState(false);
  async function send(file: File) {
    setBusy(true);
    const body = new FormData();
    body.set("booking", bookingId);
    body.set("kind", kind);
    body.set("file", file);
    const r = await fetch("/api/booking-file/", { method: "POST", body }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (ref.current) ref.current.value = "";
    onDone(r?.ok ? "Uploaded. The traveller can download it now." : j.error ?? "Upload failed.");
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputClass} sm:w-40`}>
        <option value="voucher">Voucher</option><option value="itinerary">Itinerary</option><option value="permit">Permit</option><option value="invoice">Invoice</option><option value="flight">Flight ticket</option><option value="other">Other</option>
      </select>
      <input ref={ref} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine disabled:opacity-50">{busy ? "Uploading…" : "Upload for the traveller"}</button>
    </div>
  );
}

function DetailsEditor({ bookingId, initial, fields }: { bookingId: string; initial: Record<string, string>; fields: Field[] }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const filled = fields.filter((f) => initial[f.key]);
  if (!open) return (
    <div className="text-sm">
      {filled.length ? (
        <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[12rem_1fr]">{filled.map((f) => <div key={f.key} className="contents"><dt className="text-muted">{f.label}</dt><dd className="whitespace-pre-wrap">{initial[f.key]}</dd></div>)}</dl>
      ) : <p className="text-muted">Nothing entered yet.</p>}
      <button className="mt-3 font-semibold text-pine hover:underline" onClick={() => setOpen(true)}>Edit details</button>
    </div>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveDetailsByOffice(bookingId, v); setMsg(r.message); if (r.ok) setOpen(false); }); }} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.key === "medical" || f.key === "notes" ? "sm:col-span-2" : ""}><Label htmlFor={`a-${f.key}`}>{f.label}</Label><input id={`a-${f.key}`} type={f.type ?? "text"} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className={inputClass} /></div>
        ))}
      </div>
      <div className="flex gap-2"><button disabled={pending} className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button><button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-muted">Cancel</button></div>
      {msg ? <p className="text-sm">{msg}</p> : null}
    </form>
  );
}
