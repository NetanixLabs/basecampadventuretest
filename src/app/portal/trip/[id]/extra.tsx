"use client";

import { FileText, Images, MessageCircle, Mountain, UserRound } from "lucide-react";
import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { inputClass } from "@/components/admin/ui";
import { writePortalReview } from "../../actions";
import { ShareElsewhere } from "@/app/(site)/review/form";

export function PortalReview({ bookingId, country, links }: { bookingId: string; country: string; links?: { tripadvisor: string; google: string } }) {
  const [v, setV] = useState({ rating: 0, title: "", body: "", consent: false, country });
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <div className="mt-4 rounded-xl bg-pine/8 p-4 text-center text-sm text-pine"><p>{msg}</p><ShareElsewhere links={links} /></div>;
  return (
    <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await writePortalReview(bookingId, v); setMsg(r.message); if (r.ok) setDone(true); }); }}>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={v.rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setV({ ...v, rating: n })} className="p-1"><Star className={`size-8 ${n <= v.rating ? "fill-marigold text-marigold" : "text-line"}`} /></button>
        ))}
      </div>
      <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={120} className={inputClass} placeholder="Title (optional)" aria-label="Title" />
      <textarea rows={4} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} maxLength={4000} className={inputClass} placeholder="What did you enjoy most? How were your guide and porters?" aria-label="Your review" />
      <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} className="mt-0.5 size-4 accent-[var(--pine)]" /> Base Camp Adventure may show my review, first name and country on its website.</label>
      <button disabled={pending} className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Send my review</button>
      {msg ? <p role="status" className="text-sm text-crimson">{msg}</p> : null}
    </form>
  );
}

/** App-style tab bar on phones. */
export function BottomNav({ photos, unread = 0 }: { photos: boolean; unread?: number }) {
  const items = [
    { href: "#trip", label: "Trip", Icon: Mountain },
    { href: "#documents", label: "Documents", Icon: FileText },
    { href: "#details", label: "Details", Icon: UserRound },
    { href: "#messages", label: "Messages", Icon: MessageCircle },
    ...(photos ? [{ href: "#photos", label: "Photos", Icon: Images }] : []),
  ];
  return (
    <>
      <div className="h-20 lg:hidden" aria-hidden />
      <nav aria-label="Trip sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-lg justify-around">
          {items.map(({ href, label, Icon }) => (
            <li key={href}>
              <a href={href} onClick={href === "#messages" ? (e) => { if (window.matchMedia("(max-width: 639px)").matches) { e.preventDefault(); window.dispatchEvent(new Event("bca-open-chat")); } } : undefined} className="relative flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-semibold text-muted hover:text-pine">
                <Icon className="size-5" aria-hidden />{label}
                {href === "#messages" && unread ? <span className="absolute top-1 right-2 grid min-w-4 place-items-center rounded-full bg-crimson px-1 text-[10px] leading-4 text-white">{unread}<span className="sr-only"> new</span></span> : null}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
