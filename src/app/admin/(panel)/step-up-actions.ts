"use server";

import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { Denied, assertUser } from "@/lib/admin/guards";
import { verifyPassword } from "@/lib/admin/password";
import { RULES, clearLimit, limit, waitText } from "@/lib/admin/rate-limit";
import { revokeSession } from "@/lib/admin/session";
import { STEP_UP, type StepUpPurpose } from "@/lib/admin/step-up-purposes";
import { checkUserCode, consumeBackupCode } from "@/lib/admin/totp";

/**
 * Confirms a sensitive change with the current authenticator code (or a
 * backup code). Wrong codes count towards the same lock-out as at sign-in;
 * too many and this session is signed out.
 */
export async function verifyStepUpAction(code: string, purpose: StepUpPurpose): Promise<{ ok: true } | { ok: false; error: string; signedOut?: boolean }> {
  try {
    const auth = await assertUser();
    if (!(purpose in STEP_UP)) return { ok: false, error: "Unknown change." };
    const value = String(code ?? "").trim();
    if (!value) return { ok: false, error: auth.user.totpEnabled ? "Enter the 6-digit code from your authenticator app." : "Enter your password." };

    const r = await limit(`totp:${auth.user.id}`, RULES.totp);
    if (!r.ok) {
      await revokeSession(auth.sessionId);
      await audit(auth.user.id, "stepup.locked", "user", auth.user.id, purpose);
      return { ok: false, signedOut: true, error: `Too many wrong codes. You've been signed out; sign in again in ${waitText(r.retryAfter)}.` };
    }

    let ok: boolean;
    if (auth.user.totpEnabled) {
      const digits = value.replace(/\s/g, "");
      ok = /^\d{6}$/.test(digits) ? await checkUserCode(auth.user.id, digits) : await consumeBackupCode(auth.user.id, value);
    } else {
      // Only possible where two-step sign-in isn't required (development): the password instead.
      const me = await db.user.findUniqueOrThrow({ where: { id: auth.user.id }, select: { passwordHash: true } });
      ok = await verifyPassword(value, me.passwordHash);
    }
    if (!ok) {
      await audit(auth.user.id, "stepup.failed", "user", auth.user.id, purpose);
      return { ok: false, error: auth.user.totpEnabled ? "That code didn't work. Codes change every 30 seconds; try the newest one." : "That password isn't right." };
    }
    await clearLimit(`totp:${auth.user.id}`);
    await db.session.update({ where: { id: auth.sessionId }, data: { stepUpAt: new Date(), stepUpFor: purpose } });
    await audit(auth.user.id, "stepup.ok", "user", auth.user.id, STEP_UP[purpose]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Denied ? e.message : "Couldn't check the code. Please try again." };
  }
}
