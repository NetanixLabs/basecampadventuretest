"use server";

import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { renderHtml } from "@/lib/admin/email/layout";
import { sendRaw } from "@/lib/admin/email/send";
import { fill, templateDef } from "@/lib/admin/email/templates";
import { Denied, assertUser } from "@/lib/admin/guards";

const schema = z.object({ subject: z.string().trim().min(2).max(200), heading: z.string().trim().min(2).max(200), body: z.string().trim().min(2).max(8000), button: z.string().trim().max(60).optional(), enabled: z.boolean() });

const SAMPLE: Record<string, string> = { name: "Emma", reference: "BCA-7KQ2PX", trip: "Everest Base Camp Trek", date: "12 October 2027", pax: "2 travellers", total: "$2,780.00", due: "$556.00", amount: "$556.00", balance: "$2,224.00", kind: "trip", email: "emma@example.com", phone: "+44 7700 900123", when: "1 Nov 2026, 14:05", inviter: "Shree" };

function build(key: string, v: z.infer<typeof schema>) {
  const def = templateDef(key)!;
  const blocks = [{ kind: "text" as const, text: fill(v.body, SAMPLE) }];
  if (["booking-received", "booking-request", "booking-office", "payment-received"].includes(key)) blocks.push({ kind: "details", rows: [["Reference", SAMPLE.reference], ["Trip", SAMPLE.trip], ["Starts", SAMPLE.date], ["Trip total", SAMPLE.total], ["Deposit due now", SAMPLE.due]] } as never);
  if (v.button) blocks.push({ kind: "button", label: fill(v.button, SAMPLE), href: "https://basecampadventure.com/" } as never);
  return { subject: fill(v.subject, SAMPLE), content: { preview: fill(v.subject, SAMPLE), heading: fill(v.heading, SAMPLE), blocks, unsubscribeUrl: def.to === "subscriber" ? "https://basecampadventure.com/" : undefined } };
}

export async function previewTemplate(key: string, input: unknown) {
  await assertUser("email");
  const p = schema.safeParse(input);
  if (!p.success || !templateDef(key)) return "";
  return renderHtml(build(key, p.data).content);
}

export async function saveTemplate(key: string, input: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("email");
    const p = schema.safeParse(input);
    if (!p.success || !templateDef(key)) return { ok: false, message: "Fill in subject, heading and text." };
    const d = { ...p.data, button: p.data.button || null };
    await db.emailTemplate.upsert({ where: { key }, create: { key, ...d }, update: d });
    await audit(user.id, "email.template", "email", key);
    return { ok: true, message: "Saved. Every email from now on uses this wording." };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't save." };
  }
}

export async function resetTemplate(key: string) {
  const { user } = await assertUser("email");
  await db.emailTemplate.deleteMany({ where: { key } });
  await audit(user.id, "email.template.reset", "email", key);
}

export async function testTemplate(key: string, input: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("email");
    const p = schema.safeParse(input);
    if (!p.success || !templateDef(key)) return { ok: false, message: "Fill in subject, heading and text." };
    const { subject, content } = build(key, p.data);
    const r = await sendRaw(user.email, `[Test] ${subject}`, content, `test:${key}`);
    return r.ok ? { ok: true, message: `Test sent to ${user.email}.` } : { ok: false, message: r.error ?? "Send failed" };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Couldn't send." };
  }
}
