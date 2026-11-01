import { Card, PageHeader, when } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { AccountForms } from "./forms";

export const metadata = { title: "My account" };

export default async function Account() {
  const { user, sessionId } = await requireUser();
  const [sessions, codes] = await Promise.all([
    db.session.findMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    db.backupCode.count({ where: { userId: user.id, usedAt: null } }),
  ]);
  const device = (ua: string | null) => (!ua ? "Unknown device" : `${/iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Computer"} · ${/Edg\//.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser"}`);
  return (
    <>
      <PageHeader title="My account" description={`${user.name} · ${user.email} · ${user.role === "editor" ? "Editor" : "Main admin"}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountForms totp={user.totpEnabled} />
        <Card title="Where you're signed in">
          <ul className="divide-y divide-line text-sm">
            {sessions.map((s) => <li key={s.id} className="py-2.5"><p className="font-semibold">{device(s.userAgent)}{s.id === sessionId ? " · this device" : ""}</p><p className="text-xs text-muted">{s.ipAddress ?? "unknown IP"} · last active {when(s.lastSeenAt)}</p></li>)}
          </ul>
          <p className="mt-4 text-sm text-muted">Two-step sign-in: <strong className="text-ink">{user.totpEnabled ? "on" : "off"}</strong>{user.totpEnabled ? ` · ${codes} backup codes left` : ""}. If you change phones, ask the owner to reset it, then set it up again at your next sign-in.</p>
        </Card>
      </div>
    </>
  );
}
