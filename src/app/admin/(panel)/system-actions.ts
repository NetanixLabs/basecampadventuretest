"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { sendTemplate } from "@/lib/admin/email/send";
import { addRedirect } from "@/lib/admin/entries";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { Denied, assertUser } from "@/lib/admin/guards";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/admin/password";
import { refreshSite, writeRedirects, writeSettings } from "@/lib/admin/publish";
import { issueResetLink } from "@/lib/admin/reset";
import { revokeAll } from "@/lib/admin/session";
import { checkUserCode } from "@/lib/admin/totp";
import type { Role } from "@/generated/prisma/client";

type R = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof Denied ? e.message : e instanceof Error && e.message.startsWith("!") ? e.message.slice(1) : "Something went wrong." });

/* --------------------------------------------------------------- settings */

const settingsSchema = z.object({
  tawkProperty: z.string().trim().regex(/^[a-f0-9]{0,40}$/i, "The tawk.to Property ID is letters and numbers only."),
  tawkWidget: z.string().trim().regex(/^[a-z0-9]{0,40}$/i, "The Widget ID is letters and numbers only."),
  ga4: z.string().trim().regex(/^(G-[A-Z0-9]{4,20})?$/, "A GA4 ID looks like G-XXXXXXX."),
});

export async function saveSettings(input: unknown): Promise<R> {
  try {
    const { user } = await assertUser("settings");
    const p = settingsSchema.safeParse(input);
    if (!p.success) throw new Error(`!${p.error.issues[0]?.message}`);
    for (const [key, value] of Object.entries(p.data)) await db.setting.upsert({ where: { key }, create: { key, value, public: true }, update: { value } });
    await writeSettings();
    refreshSite();
    await audit(user.id, "settings.update", "settings", null);
    return { ok: true, message: "Saved. The website uses these now." };
  } catch (e) {
    return fail(e);
  }
}

const url = z.union([z.url("Links must start with https://"), z.literal("")]);
const companySchema = z.object({
  contactPerson: z.string().trim().max(80),
  phone: z.string().trim().max(40),
  mobile: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40),
  email: z.union([z.email("Enter a valid email"), z.literal("")]),
  street: z.string().trim().max(120),
  city: z.string().trim().max(80),
  poBox: z.string().trim().max(40),
  facebook: url,
  instagram: url,
  x: url,
  tripadvisor: url,
  legalName: z.string().trim().max(120).optional().default(""),
  govReg: z.string().trim().max(60).optional().default(""),
  vat: z.string().trim().max(60).optional().default(""),
  ntbLicence: z.string().trim().max(60).optional().default(""),
  nma: z.string().trim().max(60).optional().default(""),
  taan: z.string().trim().max(60).optional().default(""),
  googleReview: url.optional().default(""),
});

/** Company details shown across the website and in every email. */
export async function saveCompany(input: unknown): Promise<R> {
  try {
    const { user } = await assertUser("settings");
    const p = companySchema.safeParse(input);
    if (!p.success) throw new Error(`!${p.error.issues[0]?.message}`);
    await db.setting.upsert({ where: { key: "company" }, create: { key: "company", value: p.data, public: true }, update: { value: p.data } });
    await writeSettings();
    refreshSite();
    await audit(user.id, "settings.company", "settings", null);
    return { ok: true, message: "Saved. The website and emails use these details now." };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ users */

/** The two roles the office uses: main admin and editor (owner is the first main admin). */
const ROLES: Role[] = ["admin", "editor", "sales"];

export async function inviteUser(input: { email: string; name: string; role: Role }): Promise<R> {
  try {
    const { user } = await assertUser("users");
    const email = input.email.trim().toLowerCase();
    if (!z.email().safeParse(email).success) throw new Error("!Enter a valid email.");
    if (!input.name.trim()) throw new Error("!Enter their name.");
    if (!ROLES.includes(input.role)) throw new Error("!Choose a role.");
    if (await db.user.findUnique({ where: { email } })) throw new Error("!That email already has an account.");
    const u = await db.user.create({ data: { email, name: input.name.trim(), role: input.role, passwordHash: await hashPassword(randomBytes(32).toString("base64url")) } });
    const link = await issueResetLink(u.id, 3 * 24 * 3600_000);
    const r = await sendTemplate("user-invite", email, { name: u.name.split(" ")[0], inviter: user.name }, { buttonHref: link });
    await audit(user.id, "user.invite", "user", u.id, `${email} as ${input.role}`);
    revalidatePath("/admin/users");
    return { ok: true, message: r.ok ? `Invitation sent to ${email}.` : `Account created, but the email failed (${r.error}). Send them a reset from the sign-in page.` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateUser(id: string, change: { role?: Role; status?: "active" | "suspended"; resetTwoFactor?: boolean; permissions?: string[]; phone?: string }): Promise<R> {
  try {
    const { user } = await assertUser("users");
    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new Error("!User not found.");
    if (target.id === user.id && (change.role || change.status || change.permissions)) throw new Error("!You can't change your own role, permissions or suspend yourself.");
    if (change.permissions && target.role === "owner") throw new Error("!The owner always has every permission.");
    if (target.role === "owner" && user.role !== "owner") throw new Error("!Only the owner can change the owner's account.");
    if (change.role === "owner" && user.role !== "owner") throw new Error("!Only the owner can make someone an owner.");
    if ((change.role && change.role !== "owner" && target.role === "owner") || (change.status === "suspended" && target.role === "owner")) {
      if ((await db.user.count({ where: { role: "owner", status: "active" } })) <= 1) throw new Error("!There must always be one active owner.");
    }
    await db.user.update({
      where: { id },
      data: {
        ...(change.role && ROLES.includes(change.role) && target.role !== "owner" ? { role: change.role } : {}),
        ...(change.status ? { status: change.status } : {}),
        ...(change.resetTwoFactor ? { totpEnabled: false, totpSecret: null } : {}),
        ...(change.permissions ? { permissions: [...new Set(change.permissions.filter((p) => PERMISSIONS.some((q) => q.key === p)))] } : {}),
        ...(change.phone !== undefined ? { phone: change.phone.replace(/[^0-9+ ()-]/g, "").slice(0, 30) || null } : {}),
      },
    });
    if (change.resetTwoFactor) await db.backupCode.deleteMany({ where: { userId: id } });
    // A change of rights takes effect at once: signed out, signs in again with the new rights.
    if (change.status === "suspended" || change.resetTwoFactor || change.permissions || change.role) await revokeAll(id);
    await audit(user.id, "user.update", "user", id, JSON.stringify(change));
    revalidatePath("/admin/users");
    return { ok: true, message: change.resetTwoFactor ? "Two-step sign-in reset. They'll set it up again at next sign-in." : "Saved." };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------------------------------------------- account */

export async function changePassword(input: { current: string; next: string; code: string }): Promise<R> {
  try {
    const { user, sessionId } = await assertUser();
    const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(input.current, me.passwordHash))) throw new Error("!Your current password isn't right.");
    if (me.totpEnabled && !(await checkUserCode(me.id, input.code))) throw new Error("!Enter the current code from your authenticator app.");
    const problem = passwordProblem(input.next, me.email);
    if (problem) throw new Error(`!${problem}`);
    await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(input.next) } });
    await revokeAll(me.id, sessionId);
    await audit(me.id, "password.change", "user", me.id);
    void sendTemplate("password-changed", me.email, { name: me.name, when: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }) }).catch(() => undefined);
    return { ok: true, message: "Password changed. Other devices were signed out." };
  } catch (e) {
    return fail(e);
  }
}

export async function signOutOthers(): Promise<R> {
  try {
    const { user, sessionId } = await assertUser();
    await revokeAll(user.id, sessionId);
    await audit(user.id, "sessions.revoke", "user", user.id);
    return { ok: true, message: "Signed out everywhere else." };
  } catch (e) {
    return fail(e);
  }
}

/* -------------------------------------------------------------- redirects */

export async function saveRedirect(from: string, to: string): Promise<R> {
  try {
    const { user } = await assertUser("content");
    const f = from.trim().replace(/^https?:\/\/[^/]+/, "");
    const t = to.trim().replace(/^https?:\/\/(www\.)?basecampadventure\.com/, "");
    if (!f.startsWith("/")) throw new Error("!The old address must start with /");
    if (!t.startsWith("/") && !/^https?:\/\//.test(t)) throw new Error("!The new address must start with / or https://");
    await addRedirect(f.endsWith("/") || /\.\w+$/.test(f) ? f : `${f}/`, t, "Added by hand");
    refreshSite();
    await audit(user.id, "redirect.save", "redirect", null, `${f} → ${t}`);
    return { ok: true, message: "Redirect saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRedirect(id: string): Promise<R> {
  try {
    const { user } = await assertUser("content");
    const r = await db.redirect.delete({ where: { id } });
    await writeRedirects();
    refreshSite();
    await audit(user.id, "redirect.delete", "redirect", id, r.from);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
