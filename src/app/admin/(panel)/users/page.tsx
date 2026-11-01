import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/admin/db";
import { requireUser } from "@/lib/admin/guards";
import { UserManager } from "./manager";

export const metadata = { title: "Team accounts" };

export default async function Users() {
  const { user } = await requireUser("users");
  const users = await db.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }], select: { id: true, name: true, email: true, role: true, status: true, totpEnabled: true, lastLoginAt: true } });
  return (
    <>
      <PageHeader title="Team accounts" description="Who can sign in, and what they can do." info="Every account uses two-step sign-in. Suspending someone signs them out at once. If someone loses their phone, use Reset 2FA and they set it up again at their next sign-in." />
      <UserManager me={{ id: user.id, role: user.role }} users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }))} />
    </>
  );
}
