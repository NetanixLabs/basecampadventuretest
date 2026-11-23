"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Card, inputClass, Label, Table, when } from "@/components/admin/ui";
import { useStepUp, type StepUpRequest } from "@/components/admin/step-up";
import { inviteUser, updateUser } from "../system-actions";
import { PERMISSIONS } from "@/lib/admin/permissions";
import type { Role } from "@/generated/prisma/browser";

type U = { id: string; name: string; email: string; role: Role; status: "active" | "suspended"; totpEnabled: boolean; lastLoginAt: string | null; permissions: string[]; phone: string | null };
const ROLES: { v: Role; l: string; d: string }[] = [
  { v: "admin", l: "Main admin", d: "Full access, including settings, keys and team accounts." },
  { v: "editor", l: "Editor", d: "Website content, photos, SEO and redirects." },
  { v: "sales", l: "Sales & operations", d: "Bookings, customers, receipts, departures and guides." },
];
const label = (r: Role) => (r === "owner" ? "Main admin (owner)" : r === "admin" ? "Main admin" : r === "editor" ? "Editor" : "Sales");

export function UserManager({ me, users }: { me: { id: string; role: Role }; users: U[] }) {
  const router = useRouter();
  const [inv, setInv] = useState({ name: "", email: "", role: "editor" as Role });
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const stepUp = useStepUp();
  // Every change to a team account is confirmed with the authenticator code (checked again on the server).
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, ask: Omit<StepUpRequest, "purpose">) => start(async () => {
    if (!(await stepUp({ purpose: "users", ...ask }))) { router.refresh(); return; }
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
                <select value={u.role} onChange={(e) => { const role = e.target.value as Role; run(() => updateUser(u.id, { role }), { title: `Make ${u.name} ${label(role)}`, detail: "They are signed out and sign in with the new rights.", action: "Change role" }); }} className="rounded-lg border border-line bg-card px-2 py-1 text-sm" aria-label={`Role of ${u.name}`}>
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
                  {u.totpEnabled ? <button type="button" className="text-pine hover:underline" onClick={() => run(() => updateUser(u.id, { resetTwoFactor: true }), { title: `Reset ${u.name}'s two-step sign-in`, detail: "They set it up again at next sign-in.", action: "Reset two-step sign-in", danger: true })}>Reset 2FA</button> : null}
                  <button type="button" className={u.status === "active" ? "text-red-700 hover:underline" : "text-pine hover:underline"} onClick={() => run(() => updateUser(u.id, { status: u.status === "active" ? "suspended" : "active" }), u.status === "active" ? { title: `Suspend ${u.name}`, detail: "Signs them out immediately.", action: "Suspend", danger: true } : { title: `Re-activate ${u.name}`, action: "Re-activate" })}>{u.status === "active" ? "Suspend" : "Re-activate"}</button>
                </span>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
      {editing ? <PermissionEditor key={editing} user={users.find((u) => u.id === editing)!} onSave={(perms) => run(() => updateUser(editing, { permissions: perms }), { title: `Change what ${users.find((u) => u.id === editing)?.name} can do`, detail: perms.length ? <>{perms.map((k) => PERMISSIONS.find((p) => p.key === k)?.label ?? k).join(", ")}. They are signed out.</> : "Resets to role defaults. They are signed out.", action: "Save permissions" })} onClose={() => setEditing(null)} pending={pending} /> : null}
      <Card title="Invite someone" info="They receive an email to set a password (valid 3 days), then set up two-step sign-in.">
        <form className="grid gap-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); const v = inv; run(async () => { const r = await inviteUser(v); if (r.ok) setInv({ name: "", email: "", role: "editor" }); return r; }, { title: `Invite ${v.name || v.email} as ${label(v.role)}`, detail: <>Invitation sent to <strong>{v.email}</strong>.</>, action: "Send invitation" }); }}>
          <div><Label htmlFor="in">Name</Label><input id="in" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} className={inputClass} required /></div>
          <div><Label htmlFor="ie">Email</Label><input id="ie" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} className={inputClass} required /></div>
          <div><Label htmlFor="ir" info={<span className="grid gap-1.5">{ROLES.map((r) => <span key={r.v}><strong>{r.l}:</strong> {r.d}</span>)}</span>}>Role</Label><select id="ir" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Role })} className={inputClass}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          <button type="submit" disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Send invitation</button>
        </form>
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
