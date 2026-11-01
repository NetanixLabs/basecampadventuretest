"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Card, inputClass, Label, Table, when } from "@/components/admin/ui";
import { inviteUser, updateUser } from "../system-actions";
import type { Role } from "@/generated/prisma/browser";

type U = { id: string; name: string; email: string; role: Role; status: "active" | "suspended"; totpEnabled: boolean; lastLoginAt: string | null };
const ROLES: { v: Role; l: string; d: string }[] = [
  { v: "owner", l: "Owner", d: "Everything, including team accounts" },
  { v: "admin", l: "Admin", d: "Everything, including settings" },
  { v: "editor", l: "Editor", d: "Trips, blog, pages, photos" },
  { v: "sales", l: "Sales", d: "Enquiries, bookings, discounts, newsletter" },
];

export function UserManager({ me, users }: { me: { id: string; role: Role }; users: U[] }) {
  const router = useRouter();
  const [inv, setInv] = useState({ name: "", email: "", role: "editor" as Role });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, ask?: string) => start(async () => {
    if (ask && !confirm(ask)) return;
    const r = await fn();
    setMsg(r.ok ? r.message ?? "Done." : r.error ?? "Failed.");
    router.refresh();
  });
  return (
    <div className="space-y-6">
      {msg ? <p role="status" className="rounded-xl bg-pine/8 px-4 py-2.5 text-sm text-pine">{msg}</p> : null}
      <Table head={["Person", "Role", "Two-step", "Last sign-in", ""]}>
        {users.map((u) => (
          <tr key={u.id}>
            <td><p className="font-semibold">{u.name}{u.id === me.id ? " (you)" : ""}</p><p className="text-xs text-muted">{u.email}</p></td>
            <td>
              {u.id === me.id ? <Badge tone="pine">{u.role}</Badge> : (
                <select value={u.role} onChange={(e) => run(() => updateUser(u.id, { role: e.target.value as Role }))} className="rounded-lg border border-line bg-card px-2 py-1 text-sm" aria-label={`Role of ${u.name}`}>
                  {ROLES.filter((r) => r.v !== "owner" || me.role === "owner").map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
              )}
            </td>
            <td>{u.totpEnabled ? <Badge tone="green">On</Badge> : <Badge tone="amber">Not set up</Badge>}</td>
            <td className="text-ink-soft">{u.status === "suspended" ? <Badge tone="red">Suspended</Badge> : when(u.lastLoginAt)}</td>
            <td className="whitespace-nowrap text-right">
              {u.id !== me.id ? (
                <span className="flex justify-end gap-3 text-xs font-semibold">
                  {u.totpEnabled ? <button type="button" className="text-pine hover:underline" onClick={() => run(() => updateUser(u.id, { resetTwoFactor: true }), `Reset ${u.name}'s two-step sign-in? Do this if they lost their phone.`)}>Reset 2FA</button> : null}
                  <button type="button" className={u.status === "active" ? "text-red-700 hover:underline" : "text-pine hover:underline"} onClick={() => run(() => updateUser(u.id, { status: u.status === "active" ? "suspended" : "active" }), u.status === "active" ? `Suspend ${u.name}? They're signed out immediately.` : undefined)}>{u.status === "active" ? "Suspend" : "Re-activate"}</button>
                </span>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
      <Card title="Invite someone" description="They get an email to choose a password (link valid 3 days), then set up two-step sign-in.">
        <form className="grid gap-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); run(() => inviteUser(inv)); setInv({ name: "", email: "", role: "editor" }); }}>
          <div><Label htmlFor="in">Name</Label><input id="in" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} className={inputClass} required /></div>
          <div><Label htmlFor="ie">Email</Label><input id="ie" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} className={inputClass} required /></div>
          <div><Label htmlFor="ir">Role</Label><select id="ir" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Role })} className={inputClass}>{ROLES.filter((r) => r.v !== "owner" || me.role === "owner").map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          <button type="submit" disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Send invitation</button>
        </form>
        <ul className="mt-4 grid gap-1 text-xs text-muted sm:grid-cols-2">{ROLES.map((r) => <li key={r.v}><strong className="text-ink">{r.l}:</strong> {r.d}</li>)}</ul>
      </Card>
    </div>
  );
}
