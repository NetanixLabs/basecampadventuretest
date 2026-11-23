"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Badge, inputClass, type Tone } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { addBacklinksAction, checkAllAction, checkBacklinkAction, deleteBacklinkAction, fixMissingAction, ignoreMissingAction } from "./actions";
import { useStepUp } from "@/components/admin/step-up";

type Note = { tone: "green" | "red"; text: string } | null;
const NoteLine = ({ note }: { note: Note }) =>
  note ? <p role="status" className={cn("mt-3 rounded-xl px-3 py-2 text-sm", note.tone === "green" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200")}>{note.text}</p> : null;
const ago = (iso: string) => {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

/* ------------------------------------------------------- broken addresses */

type Missing = { path: string; hits: number; lastSeen: string; referrers: { url: string; n: number; own: boolean }[]; suggestion: { path: string; title: string } | null };

export function MissingList({ rows }: { rows: Missing[] }) {
  if (!rows.length) return <p className="text-sm text-muted">No broken addresses.</p>;
  return <ul className="divide-y divide-line">{rows.map((r) => <MissingRow key={r.path} row={r} />)}</ul>;
}

function MissingRow({ row }: { row: Missing }) {
  const router = useRouter();
  const stepUp = useStepUp();
  const [to, setTo] = useState(row.suggestion?.path ?? "");
  const [note, setNote] = useState<Note>(null);
  const [pending, start] = useTransition();
  const external = row.referrers.filter((r) => !r.own);
  const internal = row.referrers.filter((r) => r.own);
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold break-all">{row.path}</span>
        <Badge tone={external.length ? "red" : "amber"}>{row.hits} {row.hits === 1 ? "visit" : "visits"}</Badge>
        {external.length ? <Badge tone="red">Linked from {external.length} other {external.length === 1 ? "website" : "websites"}</Badge> : null}
        {internal.length ? <Badge tone="amber">Broken link on our own site</Badge> : null}
        <span className="text-xs text-muted">last {ago(row.lastSeen)}</span>
      </div>
      {row.referrers.length ? (
        <ul className="mt-2 space-y-0.5 text-xs text-muted">
          {row.referrers.slice(0, 5).map((r) => (
            <li key={r.url} className="flex items-center gap-1.5">
              <span>Linked from</span>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="max-w-[36rem] truncate font-medium text-pine hover:underline">{r.url}</a>
              <span>· {r.n}×</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-1.5 text-xs text-muted">No referring page.</p>}
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); start(async () => { if (!(await stepUp({ purpose: "redirect", title: `Send ${row.path} to ${to}`, detail: "Permanent redirect, live immediately.", action: "Add redirect" }))) return; const r = await fixMissingAction(row.path, to); setNote(r.ok ? { tone: "green", text: r.message ?? "Fixed." } : { tone: "red", text: r.error }); if (r.ok) router.refresh(); }); }}
      >
        <ArrowRight className="size-4 text-muted" />
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="/trip/the-right-page/" aria-label={`Send ${row.path} to`} className={cn(inputClass, "max-w-md flex-1 py-2 font-mono text-[13px]")} required />
        <button type="submit" disabled={pending || !to} className="inline-flex items-center gap-1.5 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Fix with a redirect</button>
        <button type="button" disabled={pending} onClick={() => start(async () => { const r = await ignoreMissingAction(row.path); if (r.ok) router.refresh(); else setNote({ tone: "red", text: r.error }); })} className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-ink">Ignore</button>
        {row.suggestion ? <span className="w-full pl-6 text-xs text-muted">Suggested: <span className="font-medium text-ink-soft">{row.suggestion.title}</span></span> : null}
      </form>
      <NoteLine note={note} />
    </li>
  );
}

/* --------------------------------------------------------------- backlinks */

export function AddBacklinks() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState<Note>(null);
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addBacklinksAction(text, label); setNote(r.ok ? { tone: "green", text: r.message ?? "Added." } : { tone: "red", text: r.error }); if (r.ok) { setText(""); setLabel(""); router.refresh(); } }); }}>
      <label htmlFor="bl-urls" className="text-sm font-semibold">Linking pages</label>
      <textarea id="bl-urls" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={"https://www.lonelyplanet.com/nepal/…\nhttps://partner-agency.com/our-partners/"} className={cn(inputClass, "mt-1.5 font-mono text-[13px]")} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="bl-note" className="text-sm font-semibold">Note (optional)</label>
          <input id="bl-note" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Partner agency" className={cn(inputClass, "mt-1.5")} />
        </div>
        <button type="submit" disabled={pending || !text.trim()} className="inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : null} Add and check</button>
      </div>
      <NoteLine note={note} />
    </form>
  );
}

export function CheckAll() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="flex items-center gap-2">
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await checkAllAction(); setMsg(r.ok ? r.message ?? "" : r.error); router.refresh(); })} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold hover:border-pine disabled:opacity-50">
        <RefreshCw className={cn("size-3.5", pending && "animate-spin")} /> {pending ? "Checking…" : "Check all now"}
      </button>
    </span>
  );
}

type Link = { id: string; sourceUrl: string; target: string | null; anchor: string | null; status: string; rel: string | null; note: string | null; lastChecked: string | null; lastError: string | null };
const STATUS: Record<string, { tone: Tone; label: string; help: string }> = {
  live: { tone: "green", label: "Live", help: "Links to you and passes ranking value" },
  nofollow: { tone: "blue", label: "Nofollow", help: "Links to you, but asks Google not to pass value (still brings visitors)" },
  missing: { tone: "red", label: "Link removed", help: "The page no longer links to you. Ask the website to put it back" },
  error: { tone: "red", label: "Page down", help: "The page couldn't be opened" },
  unchecked: { tone: "gray", label: "Not checked yet", help: "Checked within the hour" },
};

export function BacklinkList({ rows, siteUrl }: { rows: Link[]; siteUrl: string }) {
  const [filter, setFilter] = useState("");
  if (!rows.length) return <p className="text-sm text-muted">No backlinks yet.</p>;
  const shown = filter ? rows.filter((r) => r.status === filter) : rows;
  const domains = new Set(rows.map((r) => host(r.sourceUrl))).size;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-2 text-muted">{rows.length} links from {domains} {domains === 1 ? "website" : "websites"}</span>
        {["", "live", "nofollow", "missing", "error"].map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} className={cn("rounded-full border px-3 py-1 font-semibold", filter === s ? "border-pine bg-pine/10 text-pine" : "border-line hover:border-pine")}>{s ? STATUS[s].label : "All"}</button>
        ))}
      </div>
      <ul className="divide-y divide-line">{shown.map((r) => <BacklinkRow key={r.id} row={r} siteUrl={siteUrl} />)}</ul>
    </>
  );
}

function BacklinkRow({ row, siteUrl }: { row: Link; siteUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const s = STATUS[row.status] ?? STATUS.unchecked;
  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{host(row.sourceUrl)}</span>
          <span title={s.help}><Badge tone={s.tone}>{s.label}</Badge></span>
          {row.note ? <Badge>{row.note}</Badge> : null}
        </div>
        <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-pine hover:underline"><span className="truncate">{row.sourceUrl}</span><ExternalLink className="size-3 shrink-0" /></a>
        <p className="mt-1 text-xs text-muted">
          {row.target ? <>Points to <a href={`${siteUrl}${row.target}`} target="_blank" rel="noopener noreferrer" className="font-mono text-ink-soft hover:text-pine">{row.target}</a></> : null}
          {row.anchor ? <> with the words <span className="font-medium text-ink-soft">“{row.anchor}”</span></> : null}
          {row.rel ? <> · rel="{row.rel}"</> : null}
          {row.lastError ? <span className="text-red-700 dark:text-red-300"> {row.lastError}</span> : null}
          {row.lastChecked ? <> · checked {ago(row.lastChecked)}</> : null}
        </p>
        {msg ? <p className="mt-1 text-xs">{msg}</p> : null}
      </div>
      <span className="flex items-center gap-1">
        <button type="button" disabled={pending} onClick={() => start(async () => { const r = await checkBacklinkAction(row.id); setMsg(r.ok ? r.message ?? "" : r.error); router.refresh(); })} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-pine disabled:opacity-50"><RefreshCw className={cn("size-3", pending && "animate-spin")} /> Check</button>
        <button type="button" disabled={pending} onClick={() => start(async () => { if (!confirm(`Stop tracking ${host(row.sourceUrl)}?`)) return; await deleteBacklinkAction(row.id); router.refresh(); })} className="grid size-8 place-items-center rounded-full text-muted hover:text-red-700" aria-label="Remove"><Trash2 className="size-4" /></button>
      </span>
    </li>
  );
}
