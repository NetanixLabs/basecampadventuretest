import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { getAuth, type Auth } from "@/lib/admin/session";

/**
 * What each role may do. Checked on the server for every page and action;
 * hiding a button is never the only protection.
 */
export type Permission = "content" | "publish" | "media" | "sales" | "settings" | "users" | "email";

const GRANTS: Record<Role, Permission[]> = {
  owner: ["content", "publish", "media", "sales", "settings", "users", "email"],
  admin: ["content", "publish", "media", "sales", "settings", "users", "email"],
  editor: ["content", "publish", "media"],
  sales: ["sales", "email"],
};

export const can = (role: Role, p: Permission) => GRANTS[role].includes(p);

/** For pages: sends people to sign in, to 2FA, or home, as needed. */
export async function requireUser(permission?: Permission): Promise<Auth> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (!auth.mfaDone) redirect(auth.user.totpEnabled ? "/login/verify" : "/login/setup-2fa");
  if (permission && !can(auth.user.role, permission)) redirect("/?denied=1");
  return auth;
}

export class Denied extends Error {}

/** For server actions and API routes: throws instead of redirecting. */
export async function assertUser(permission?: Permission): Promise<Auth> {
  const auth = await getAuth();
  if (!auth || !auth.mfaDone) throw new Denied("Please sign in again.");
  if (permission && !can(auth.user.role, permission)) throw new Denied("Your role can't do that.");
  return auth;
}
