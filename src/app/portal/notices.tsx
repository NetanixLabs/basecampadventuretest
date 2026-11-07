"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CreditCard, FileText, Images, MessageCircle, Mountain, Users } from "lucide-react";
import { readNotices } from "./actions";

type N = { id: string; kind: string; title: string; body: string; href: string | null; read: boolean; at: string };
const ICON: Record<string, typeof Bell> = { message: MessageCircle, document: FileText, payment: CreditCard, photos: Images, reminder: Bell, group: Users, trip: Mountain };

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** The bell in the header: news from the office about the traveller's trips. */
export function NoticeBell({ notices }: { notices: N[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(notices.filter((n) => !n.read).length);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" aria-expanded={open} aria-label={`Notifications${unread ? `, ${unread} new` : ""}`} onClick={() => { setOpen((o) => !o); if (unread) { setUnread(0); void readNotices(); } }} className="relative grid size-9 place-items-center rounded-full border border-line hover:border-pine hover:text-pine">
        <Bell className="size-4.5" aria-hidden />
        {unread ? <span className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full bg-crimson px-1 text-[10px] leading-4.5 font-bold text-white">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
          <p className="border-b border-line px-4 py-3 text-sm font-bold">Notifications</p>
          {notices.length ? (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {notices.map((n) => {
                const Icon = ICON[n.kind] ?? Bell;
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => { setOpen(false); if (n.href) router.push(n.href); }} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-glacier-soft ${n.read ? "" : "bg-pine/5"}`}>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pine/10 text-pine"><Icon className="size-4" aria-hidden /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{n.title}</span><span className="block text-xs leading-snug text-muted">{n.body}</span><span className="mt-0.5 block text-[11px] text-muted">{ago(n.at)}</span></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="px-4 py-6 text-center text-sm text-muted">Nothing new yet. We&apos;ll let you know when there&apos;s news about your trip.</p>}
        </div>
      ) : null}
    </div>
  );
}
