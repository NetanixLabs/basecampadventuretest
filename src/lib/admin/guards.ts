import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { getAuth, type Auth } from "@/lib/admin/session";

/**
 * What each role may do. Checked on the server for every page and action;
 * hiding a button is never the only protection.
 */
export { PERMISSIONS, type Permission } from "@/lib/admin/permissions";
import { PERMISSIONS, type Permission } from "@/lib/admin/permissions";

export const GRANTS: Record<Role, Permission[]> = {
  owner: PERMISSIONS.map((p) => p.key),
  admin: PERMISSIONS.map((p) => p.key),
  editor: ["content", "publish", "media"],
  sales: ["sales", "customers", "receipts", "operations", "email"],
};

type Who = Role | { role: Role; permissions?: string[] };

/**
 * The owner can do everything. Anyone else gets their role's defaults, unless
 * the owner ticked custom permissions for them (then exactly those).
 */
export function can(who: Who, p: Permission) {
  const role = typeof who === "string" ? who : who.role;
  if (role === "owner") return true;
  const custom = typeof who === "string" ? [] : (who.permissions ?? []).filter((x) => PERMISSIONS.some((q) => q.key === x));
  return custom.length ? custom.includes(p) : GRANTS[role].includes(p);
}

/** For pages: sends people to sign in, to 2FA, or home, as needed. */
export async function requireUser(permission?: Permission): Promise<Auth> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (!auth.mfaDone) redirect(auth.user.totpEnabled ? "/login/verify" : "/login/setup-2fa");
  if (permission && !can(auth.user, permission)) redirect("/?denied=1");
  return auth;
}

export class Denied extends Error {}

/** For server actions and API routes: throws instead of redirecting. */
export async function assertUser(permission?: Permission): Promise<Auth> {
  const auth = await getAuth();
  if (!auth || !auth.mfaDone) throw new Denied("Please sign in again.");
  if (permission && !can(auth.user, permission)) throw new Denied("You don't have permission for that. Ask the main admin.");
  return auth;
}
