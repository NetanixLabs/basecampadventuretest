"use server";

import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { sendRaw } from "@/lib/admin/email/send";
import { Denied, assertUser } from "@/lib/admin/guards";

const schema = z.object({
  subject: z.string().trim().min(3, "Add a subject").max(150),
  heading: z.string().trim().min(2, "Add a heading").max(150),
  body: z.string().trim().min(10, "Write the message").max(10000),
  button: z.string().trim().max(40).optional(),
  buttonUrl: z.union([z.url(), z.literal("")]).optional(),
  test: z.boolean(),
});

/** Sends a campaign (or a test to yourself). Each subscriber gets their own unsubscribe link. */
export async function sendCampaign(input: unknown): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const { user } = await assertUser("email");
    const p = schema.safeParse(input);
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the form" };
    const c = p.data;
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, "");
    const content = (unsubscribeUrl?: string) => ({
      preview: c.subject,
      heading: c.heading,
      blocks: [{ kind: "text" as const, text: c.body }, ...(c.button && c.buttonUrl ? [{ kind: "button" as const, label: c.button, href: c.buttonUrl }] : [])],
      unsubscribeUrl,
    });
    if (c.test) {
      const r = await sendRaw(user.email, `[Test] ${c.subject}`, content(`${site}/api/newsletter/unsubscribe/?t=test`), "campaign-test");
      return r.ok ? { ok: true, message: `Test sent to ${user.email}.` } : { ok: false, error: r.error ?? "Send failed" };
    }
    const subs = await db.subscriber.findMany({ where: { status: "subscribed" }, select: { email: true, token: true } });
    if (!subs.length) return { ok: false, error: "There are no subscribers yet." };
    const campaign = await db.campaign.create({ data: { subject: c.subject, heading: c.heading, body: c.body, button: c.button || null, buttonUrl: c.buttonUrl || null, status: "sending", recipients: subs.length } });
    let sent = 0;
    for (const s of subs) {
      const r = await sendRaw(s.email, c.subject, content(`${site}/api/newsletter/unsubscribe/?t=${s.token}`), `campaign:${campaign.id}`);
      if (r.ok) sent++;
      await new Promise((res) => setTimeout(res, 120)); // gentle on the mail server
    }
    await db.campaign.update({ where: { id: campaign.id }, data: { status: "sent", sentAt: new Date() } });
    await audit(user.id, "campaign.send", "campaign", campaign.id, `${c.subject} → ${sent}/${subs.length}`);
    return { ok: true, message: `Sent to ${sent} of ${subs.length} subscribers.` };
  } catch (e) {
    return { ok: false, error: e instanceof Denied ? e.message : "Sending failed. Check the email settings." };
  }
}
