"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Card, inputClass, Label, Table, when } from "@/components/admin/ui";
import { inviteUser, updateUser } from "../system-actions";
import { PERMISSIONS } from "@/lib/admin/permissions";
import type { Role } from "@/generated/prisma/browser";

type U = { id: string; name: string; email: string; role: Role; status: "active" | "suspended"; totpEnabled: boolean; lastLoginAt: string | null; permissions: string[]; phone: string | null };
const ROLES: { v: Role; l: string; d: string }[] = [
  { v: "admin", l: "Main admin", d: "Everything: bookings, payments, discounts, newsletter, settings, keys and team accounts, plus all website content." },
  { v: "editor", l: "Editor", d: "Website content only: trips, blog, pages, SEO, redirects, photos, reviews and team profiles. No bookings, payments or settings." },
  { v: "sales", l: "Sales & operations", d: "Bookings, enquiries, customers, receipts, departures, guides and agents. No website content or settings." },
];
const label = (r: Role) => (r === "owner" ? "Main admin (owner)" : r === "admin" ? "Main admin" : r === "editor" ? "Editor" : "Sales");

export function UserManager({ me, users }: { me: { id: string; role: Role }; users: U[] }) {
  const router = useRouter();
  const [inv, setInv] = useState({ name: "", email: "", role: "editor" as Role });
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
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
              {u.id === me.id || u.role === "owner" ? <Badge tone="pine">{label(u.role)}</Badge> : (
                <select value={u.role} onChange={(e) => run(() => updateUser(u.id, { role: e.target.value as Role }))} className="rounded-lg border border-line bg-card px-2 py-1 text-sm" aria-label={`Role of ${u.name}`}>
                  {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
              )}
            </td>
            <td>{u.totpEnabled ? <Badge tone="green">On</Badge> : <Badge tone="amber">Not set up</Badge>}</td>
            <td className="text-ink-soft">{u.status === "suspended" ? <Badge tone="red">Suspended</Badge> : when(u.lastLoginAt)}</td>
            <td className="whitespace-nowrap text-right">
              {u.id !== me.id ? (
                <span className="flex justify-end gap-3 text-xs font-semibold">
                  {u.role !== "owner" ? <button type="button" className="text-pine hover:underline" onClick={() => setEditing(editing === u.id ? null : u.id)}>Permissions{u.permissions.length ? " (custom)" : ""}</button> : null}
                  {u.totpEnabled ? <button type="button" className="text-pine hover:underline" onClick={() => run(() => updateUser(u.id, { resetTwoFactor: true }), `Reset ${u.name}'s two-step sign-in? Do this if they lost their phone.`)}>Reset 2FA</button> : null}
                  <button type="button" className={u.status === "active" ? "text-red-700 hover:underline" : "text-pine hover:underline"} onClick={() => run(() => updateUser(u.id, { status: u.status === "active" ? "suspended" : "active" }), u.status === "active" ? `Suspend ${u.name}? They're signed out immediately.` : undefined)}>{u.status === "active" ? "Suspend" : "Re-activate"}</button>
                </span>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
      {editing ? <PermissionEditor key={editing} user={users.find((u) => u.id === editing)!} onSave={(perms) => run(() => updateUser(editing, { permissions: perms }), "Save these permissions? They will be signed out and sign in again with the new rights.")} onClose={() => setEditing(null)} pending={pending} /> : null}
      <Card title="Invite someone" info="They receive an email to choose their password (the link works for 3 days), then set up two-step sign-in with an authenticator app on their phone.">
        <form className="grid gap-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); run(() => inviteUser(inv)); setInv({ name: "", email: "", role: "editor" }); }}>
          <div><Label htmlFor="in">Name</Label><input id="in" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} className={inputClass} required /></div>
          <div><Label htmlFor="ie">Email</Label><input id="ie" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} className={inputClass} required /></div>
          <div><Label htmlFor="ir">Role</Label><select id="ir" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Role })} className={inputClass}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          <button type="submit" disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Send invitation</button>
        </form>
        <ul className="mt-4 grid gap-1 text-xs text-muted sm:grid-cols-2">{ROLES.map((r) => <li key={r.v}><strong className="text-ink">{r.l}:</strong> {r.d}</li>)}</ul>
      </Card>
    </div>
  );
}

const ROLE_DEFAULTS: Record<Role, string[]> = {
  owner: PERMISSIONS.map((p) => p.key),
  admin: PERMISSIONS.map((p) => p.key),
  editor: ["content", "publish", "media"],
  sales: ["sales", "customers", "receipts", "operations", "email"],
};

/** Tick exactly what one person may see and do. Empty = back to the role's defaults. */
function PermissionEditor({ user, onSave, onClose, pending }: { user: U; onSave: (p: string[]) => void; onClose: () => void; pending: boolean }) {
  const [sel, setSel] = useState<string[]>(user.permissions.length ? user.permissions : ROLE_DEFAULTS[user.role]);
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  return (
    <Card title={`Permissions for ${user.name}`} info="Tick what this person may see and do. Pages and buttons for anything unticked disappear for them, and the server refuses it even if they try a direct link.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {PERMISSIONS.map((p) => (
          <li key={p.key}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:border-pine">
              <input type="checkbox" checked={sel.includes(p.key)} onChange={() => toggle(p.key)} className="mt-0.5 size-4 accent-[var(--pine)]" />
              <span><span className="block text-sm font-semibold">{p.label}</span><span className="block text-xs text-muted">{p.help}</span></span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={pending || !sel.length} onClick={() => onSave(sel)} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save permissions</button>
        <button type="button" disabled={pending} onClick={() => onSave([])} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-pine">Use role defaults</button>
        <button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted">Close</button>
      </div>
    </Card>
  );
}
