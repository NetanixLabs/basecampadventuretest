"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Card } from "@/components/admin/ui";

/** Photos the office shares with everyone on this departure (shown on their trip page). */
export function DeparturePhotos({ depKey, photos }: { depKey: string; photos: string[] }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function upload(files: FileList) {
    setBusy(true);
    const body = new FormData();
    body.set("key", depKey);
    for (const f of Array.from(files).slice(0, 30)) body.append("files", f);
    const r = await fetch("/api/trip-photos/", { method: "POST", body }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setMsg(r?.ok ? `${j.added} photo${j.added === 1 ? "" : "s"} added. Travellers on this trip can see them now.` : j.error ?? "Upload failed.");
    if (ref.current) ref.current.value = "";
    router.refresh();
  }
  return (
    <Card title={`Trip photos (${photos.length})`} info="Upload photos from the trek; everyone with a paid booking on this departure sees and downloads them on their trip page. Photos stay private (not on the public website) and are deleted with the traveller accounts after the trip.">
      <input ref={ref} type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      <button disabled={busy} onClick={() => ref.current?.click()} className="w-full rounded-full border border-dashed border-line px-4 py-2.5 text-sm font-semibold hover:border-pine disabled:opacity-50">{busy ? "Uploading…" : "Upload photos (up to 30 at once)"}</button>
      {msg ? <p role="status" className="mt-2 text-sm">{msg}</p> : null}
      {photos.length ? (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((id) => (
            <li key={id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/trip-photos/?id=${id}`} alt="" className="aspect-square w-full rounded-lg object-cover" loading="lazy" />
              <button onClick={async () => { if (!confirm("Delete this photo?")) return; await fetch(`/api/trip-photos/?id=${id}`, { method: "DELETE" }); router.refresh(); }} className="absolute top-1 right-1 rounded-full bg-white/90 px-2 text-xs font-semibold text-red-700 opacity-0 group-hover:opacity-100 focus:opacity-100">Delete</button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
