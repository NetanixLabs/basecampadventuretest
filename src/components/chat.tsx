"use client";

import { Check, CheckCheck, FileText, Loader2, Lock, Paperclip, SendHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/server/messages";

const MAX = 4000;
const POLL_MS = 15_000;

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const size = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
const isImage = (mime: string) => /^image\/(jpeg|png|webp)$/.test(mime);

/**
 * One conversation between a traveller and the office, used on both the trip
 * page and the admin booking page. Refreshes itself while the tab is open.
 */
export function Chat({ bookingId, side, initial, endpoint = "/api/messages/", fileBase = "/api/message-file/", placeholder = "Write a message…", empty }: { bookingId: string; side: "traveller" | "office"; initial: ChatMessage[]; endpoint?: string; fileBase?: string; placeholder?: string; empty?: string }) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const mine = (m: ChatMessage) => (side === "office" ? m.fromOffice : !m.fromOffice);

  const load = useCallback(async () => {
    const r = await fetch(`${endpoint}?booking=${encodeURIComponent(bookingId)}`, { cache: "no-store" }).catch(() => null);
    if (r?.ok) setMessages((await r.json()).messages);
  }, [bookingId, endpoint]);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") void load(); };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [load]);

  // Stay at the newest message unless the reader has scrolled up to read older ones.
  const stick = useRef(true);
  const toBottom = () => { const el = list.current; if (el && stick.current) el.scrollTop = el.scrollHeight; };
  const count = messages.length;
  useLayoutEffect(() => {
    stick.current = true;
    toBottom();
  }, [count]);

  const grow = () => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  async function send() {
    if (busy || (!text.trim() && !file)) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("booking", bookingId);
    body.set("body", text);
    if (file) body.set("file", file);
    const r = await fetch(endpoint, { method: "POST", body }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setError(j.error ?? "Could not send. Check your connection and try again.");
    setMessages(j.messages);
    setNote(j.note ?? "");
    setText("");
    setFile(null);
    requestAnimationFrame(() => { if (input.current) input.current.style.height = "auto"; });
  }

  const days = messages.map((m) => dayLabel(m.at));
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-snow-2/60">
      <p className="flex items-center gap-1.5 border-b border-line bg-card/70 px-4 py-2 text-[11px] text-muted">
        <Lock className="size-3 text-pine" aria-hidden /> {side === "traveller" ? "Encrypted. Only you and our office team can read these messages." : "Encrypted. Only your team and this traveller can read these messages."}
      </p>
      <div ref={list} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }} className="max-h-[min(60vh,32rem)] min-h-40 space-y-2 overflow-y-auto px-3 py-4 sm:px-4" aria-live="polite" aria-label="Messages">
        {!messages.length ? <p className="py-10 text-center text-sm text-muted">{empty ?? "No messages yet."}</p> : null}
        {messages.map((m, i) => {
          const day = days[i];
          const showDay = i === 0 || day !== days[i - 1];
          const me = mine(m);
          return (
            <div key={m.id}>
              {showDay ? <p className="my-3 text-center"><span className="rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-muted shadow-sm">{day}</span></p> : null}
              <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[75%] ${me ? "rounded-br-md bg-pine text-white" : "rounded-bl-md bg-card text-ink"}`}>
                  {!me ? <p className="mb-0.5 text-[11px] font-bold text-pine">{m.fromOffice ? `${m.authorName} · Base Camp Adventure` : m.authorName}</p> : null}
                  {m.file ? (
                    isImage(m.file.mime) ? (
                      <a href={`${fileBase}${m.id}/?view=1`} target="_blank" rel="noopener" className="mb-1 block overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${fileBase}${m.id}/?view=1`} alt={m.file.name} onLoad={toBottom} className="max-h-60 w-full object-cover" />
                      </a>
                    ) : (
                      <a href={`${fileBase}${m.id}/`} className={`mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2 ${me ? "bg-white/15 hover:bg-white/25" : "bg-snow-2 hover:bg-pine/10"}`}>
                        <FileText className="size-5 shrink-0" aria-hidden />
                        <span className="min-w-0"><span className="block truncate font-semibold">{m.file.name}</span><span className={`text-[11px] ${me ? "text-white/75" : "text-muted"}`}>{size(m.file.size)} · Download</span></span>
                      </a>
                    )
                  ) : null}
                  {m.body ? <p className="break-words whitespace-pre-wrap">{m.body}</p> : null}
                  <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${me ? "text-white/75" : "text-muted"}`}>
                    {time(m.at)}
                    {me ? (m.readAt ? <><CheckCheck className="size-3.5" aria-hidden /><span className="sr-only">Seen</span></> : <><Check className="size-3.5" aria-hidden /><span className="sr-only">Sent</span></>) : null}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="border-t border-line bg-card p-2.5 sm:p-3">
        {file ? (
          <p className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full bg-pine/10 py-1 pr-1 pl-3 text-xs font-semibold text-pine">
            <Paperclip className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{file.name}</span><span className="text-muted">{size(file.size)}</span>
            <button type="button" onClick={() => setFile(null)} className="rounded-full p-1 hover:bg-pine/15" aria-label="Remove attachment"><X className="size-3.5" aria-hidden /></button>
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <input ref={picker} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.heic" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 10 * 1024 * 1024) setError("Files can be up to 10 MB."); else { setError(""); setFile(f); } } e.target.value = ""; }} />
          <button type="button" onClick={() => picker.current?.click()} className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-snow-2 hover:text-pine" aria-label="Attach a file (PDF or photo, up to 10 MB)" title="Attach a file (PDF or photo, up to 10 MB)"><Paperclip className="size-5" aria-hidden /></button>
          <textarea
            ref={input}
            rows={1}
            maxLength={MAX}
            value={text}
            onChange={(e) => { setText(e.target.value); grow(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); void send(); } }}
            aria-label={side === "office" ? "Message" : "Your message"}
            placeholder={placeholder}
            className="max-h-44 min-h-10 flex-1 resize-none rounded-2xl border border-line bg-snow-2/50 px-4 py-2.5 text-sm outline-none focus:border-pine focus:bg-card"
          />
          <button disabled={busy || (!text.trim() && !file)} className="grid size-10 shrink-0 place-items-center rounded-full bg-pine text-white transition-opacity disabled:opacity-40" aria-label="Send">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <SendHorizontal className="size-4" aria-hidden />}
          </button>
        </div>
        <div className="mt-1 flex justify-between gap-3 px-1 text-[11px] text-muted">
          <span role="alert" className="text-crimson">{error}</span>
          <span>{note || (text.length > MAX - 300 ? `${MAX - text.length} characters left` : <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line</span>)}</span>
        </div>
      </form>
    </div>
  );
}
