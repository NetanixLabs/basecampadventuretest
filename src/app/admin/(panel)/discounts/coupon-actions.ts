"use server";

import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { couponFor } from "@/lib/admin/email/coupon-data";
import { couponText, renderCouponEmail } from "@/lib/admin/email/coupon";
import { officeEmail, sendHtml } from "@/lib/admin/email/send";
import { Denied, assertUser } from "@/lib/admin/guards";

const schema = z.object({
  code: z.string().trim().min(1, "Choose a code"),
  name: z.string().trim().max(80).default(""),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).default(""),
  message: z.string().trim().max(3000).default(""),
  photo: z.string().trim().max(200).default(""),
});

const DEFAULT_MESSAGE = "Thank you for being part of the Base Camp Adventure family. Here is a little something for your next journey to the Himalayas: use the code below when you book any of our treks or tours.";

async function build(input: unknown, base?: string) {
  const p = schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form" } as const;
  const c = await couponFor(p.data.code);
  if (!c) return { error: "That code doesn't exist." } as const;
  const data = { ...c, name: p.data.name, message: p.data.message || DEFAULT_MESSAGE, photo: p.data.photo || null };
  return { data, html: renderCouponEmail(data, base === undefined ? {} : { base }), text: couponText(data), input: p.data } as const;
}

export async function previewCoupon(input: unknown): Promise<string> {
  await assertUser("sales");
  const r = await build(input, "");
  return "error" in r ? "" : r.html;
}

export async function sendCoupon(input: unknown, test: boolean): Promise<{ ok: boolean; message: string }> {
  try {
    const { user } = await assertUser("sales");
    const r = await build(input);
    if ("error" in r) return { ok: false, message: r.error ?? "Check the form" };
    const to = test ? user.email : r.input.email;
    if (!to) return { ok: false, message: "Enter the traveller's email." };
    const subject = `${test ? "[Test] " : ""}${r.data.name ? `${r.data.name}, your` : "Your"} ${r.data.amount.toLowerCase()} Base Camp Adventure voucher`;
    const s = await sendHtml(to, subject, r.html, r.text, "coupon", { replyTo: officeEmail() });
    if (!test) await audit(user.id, "coupon.send", "discount", null, `${r.data.code} → ${to}`);
    return s.ok ? { ok: true, message: `Voucher sent to ${to}.` } : { ok: false, message: s.error ?? "Send failed" };
  } catch (e) {
    return { ok: false, message: e instanceof Denied ? e.message : "Sending failed. Check the email settings." };
  }
}
