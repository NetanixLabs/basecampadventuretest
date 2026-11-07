"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Check, Upload } from "lucide-react";
import { inputClass, Label } from "@/components/admin/ui";
import { saveTravellerDetails } from "../../actions";

type Field = { key: string; label: string; group: string; type?: string };

export function DetailsForm({ bookingId, initial, fields }: { bookingId: string; initial: Record<string, string>; fields: Field[] }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const groups = [...new Set(fields.map((f) => f.group))];
  return (
    <form className="mt-6 space-y-8" onSubmit={(e) => { e.preventDefault(); start(async () => setMsg((await saveTravellerDetails(bookingId, v)).message)); }}>
      {groups.map((g) => (
        <fieldset key={g}>
          <legend className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{g}</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.filter((f) => f.group === g).map((f) => (
              <div key={f.key} className={f.key === "medical" || f.key === "notes" ? "sm:col-span-2 lg:col-span-3" : ""}>
                <Label htmlFor={`d-${f.key}`}>{f.label}</Label>
                {f.key === "medical" || f.key === "notes" ? (
                  <textarea id={`d-${f.key}`} rows={2} maxLength={1000} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className={inputClass} />
                ) : (
                  <input id={`d-${f.key}`} type={f.type ?? "text"} maxLength={200} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className={inputClass} autoComplete="off" />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{pending ? "Saving…" : "Save my details"}</button>
        {msg ? <p role="status" className="text-sm font-semibold text-pine">{msg}</p> : null}
      </div>
    </form>
  );
}

type FileRow = { id: string; name: string; kind: string; bytes: number; fromOffice: boolean; date: string };
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

type DocItem = { key: string; label: string; hint: string; kind: string; have: number; need: number; done: boolean; byOffice: boolean };

export function Documents({ bookingId, files, checklist = [] }: { bookingId: string; files: FileRow[]; checklist?: DocItem[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKindState] = useState("passport");
  // The kind is read when the file arrives, after the picker closes.
  const kindRef = useRef("passport");
  const setKind = (k: string) => { kindRef.current = k; setKindState(k); };
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) return setMsg("Files can be up to 10 MB.");
    setBusy(true);
    setMsg("");
    const body = new FormData();
    body.set("booking", bookingId);
    body.set("kind", kindRef.current);
    body.set("file", file);
    const r = await fetch("/api/upload/", { method: "POST", body }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setMsg(r?.ok ? "Uploaded. Thank you!" : j.error ?? "Upload failed. Please try again.");
    if (r?.ok) router.refresh();
    if (input.current) input.current.value = "";
  }

  async function remove(id: string) {
    if (!confirm("Delete this file?")) return;
    const r = await fetch(`/api/file/${id}/`, { method: "DELETE" });
    if (r.ok) router.refresh();
  }

  const office = files.filter((f) => f.fromOffice);
  const mine = files.filter((f) => !f.fromOffice);
  const Row = ({ f, canDelete }: { f: FileRow; canDelete: boolean }) => (
    <li className="flex items-center justify-between gap-3 py-3">
      <a href={`/api/file/${f.id}/`} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold hover:text-pine">{f.name}</span>
        <span className="text-xs text-muted">{f.kind} · {size(f.bytes)} · {new Date(f.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
      </a>
      <div className="flex shrink-0 gap-2">
        <a href={`/api/file/${f.id}/`} className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-pine hover:text-pine">Download</a>
        {canDelete ? <button type="button" onClick={() => remove(f.id)} className="rounded-full px-2 py-1 text-xs font-semibold text-muted hover:text-red-600">Delete</button> : null}
      </div>
    </li>
  );

  const ready = checklist.filter((c) => c.done).length;
  return (
    <div className="mt-4 space-y-6">
      {checklist.length ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">What we need from you</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ready === checklist.length ? "bg-pine/10 text-pine" : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"}`}>{ready} of {checklist.length} done</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-pine transition-all" style={{ width: `${Math.round((ready / checklist.length) * 100)}%` }} /></div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.key} className={`flex items-start gap-3 rounded-xl border p-3 ${c.done ? "border-pine/30 bg-pine/5" : "border-line"}`}>
                <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${c.done ? "bg-pine text-white" : "border-2 border-amber-400"}`} aria-hidden>{c.done ? <Check className="size-3.5" strokeWidth={3} /> : null}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{c.label}<span className="sr-only">{c.done ? ": done" : ": missing"}</span></span>
                  <span className="block text-xs leading-snug text-muted">{c.byOffice ? "Received by our office." : c.need > 1 ? `${c.have} of ${c.need} travellers. ${c.hint}` : c.hint}</span>
                </span>
                {!c.done ? <button type="button" disabled={busy} onClick={() => { setKind(c.kind); input.current?.click(); }} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:border-pine hover:text-pine"><Upload className="size-3" aria-hidden />Upload</button> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">From our office</p>
        {office.length ? <ul className="divide-y divide-line">{office.map((f) => <Row key={f.id} f={f} canDelete={false} />)}</ul> : <p className="mt-2 text-sm text-muted">Your vouchers, permits and final itinerary will appear here.</p>}
      </div>
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">From you</p>
        {mine.length ? <ul className="divide-y divide-line">{mine.map((f) => <Row key={f.id} f={f} canDelete />)}</ul> : <p className="mt-2 text-sm text-muted">Please upload a copy of your passport, insurance and flight tickets.</p>}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select aria-label="Type of document" value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputClass} sm:w-48`}>
            <option value="passport">Passport</option><option value="insurance">Insurance</option><option value="flight">Flight ticket</option><option value="photo">Passport photo</option><option value="other">Other</option>
          </select>
          <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:bg-pine-deep disabled:opacity-50">{busy ? "Uploading…" : "Upload a document"}</button>
        </div>
        {msg ? <p role="status" className="mt-2 text-sm font-semibold">{msg}</p> : null}
      </div>
    </div>
  );
}
