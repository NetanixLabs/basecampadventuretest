import "server-only";
import { db } from "@/lib/admin/db";
import { Denied } from "@/lib/admin/guards";
import type { Auth } from "@/lib/admin/session";
import { STEP_UP_SECONDS, type StepUpPurpose } from "@/lib/admin/step-up-purposes";

/**
 * Step-up confirmation ("are you really you?") for sensitive changes.
 *
 * Signing in isn't enough for these: the change only goes through if, in the
 * last 2 minutes, this same session confirmed this kind of change with the
 * current authenticator code. The confirmation is used up by the change, so
 * every change needs its own code. Checked here on the server; the dialog in
 * the browser is only the way to give the code.
 */
export async function assertStepUp(auth: Auth, purpose: StepUpPurpose) {
  // Atomic: only one change can use a confirmation.
  const used = await db.session.updateMany({
    where: { id: auth.sessionId, stepUpFor: purpose, stepUpAt: { gte: new Date(Date.now() - STEP_UP_SECONDS * 1000) } },
    data: { stepUpAt: null, stepUpFor: null },
  });
  if (used.count !== 1) throw new Denied("Confirm this change with your authenticator code first.");
}
