"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, Empty, inputClass, Label, Table, when } from "@/components/admin/ui";
import { deleteRedirect, saveRedirect } from "../system-actions";

export function RedirectManager({ rows }: { rows: { id: string; from: string; to: string; note: string | null; createdAt: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ from: "", to: "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <Card title="Add a redirect">
        <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveRedirect(v.from, v.to); setMsg(r.ok ? r.message ?? "" : r.error); if (r.ok) { setV({ from: "", to: "" }); router.refresh(); } }); }}>
          <div><Label htmlFor="rf">Old address</Label><input id="rf" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} placeholder="/old-trip-name/" className={`${inputClass} font-mono text-[13px]`} required /></div>
          <div><Label htmlFor="rt">New address</Label><input id="rt" value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} placeholder="/trip/new-trip-name/" className={`${inputClass} font-mono text-[13px]`} required /></div>
          <button type="submit" disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Add</button>
        </form>
        {msg ? <p role="status" className="mt-3 text-sm">{msg}</p> : null}
      </Card>
      {rows.length ? (
        <Table head={["Old address", "Goes to", "Why", "Added", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="font-mono text-xs">{r.from}</td><td className="font-mono text-xs">{r.to}</td><td className="text-ink-soft">{r.note ?? "—"}</td><td className="whitespace-nowrap text-ink-soft">{when(r.createdAt)}</td>
              <td className="text-right"><button type="button" disabled={pending} onClick={() => start(async () => { if (!confirm(`Remove the redirect from ${r.from}?`)) return; await deleteRedirect(r.id); router.refresh(); })} className="text-xs font-semibold text-red-700 hover:underline">Remove</button></td>
            </tr>
          ))}
        </Table>
      ) : <Empty title="No redirects added yet." />}
    </div>
  );
}
