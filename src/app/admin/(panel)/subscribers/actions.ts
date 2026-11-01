"use server";

import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { db } from "@/lib/admin/db";
import { couponFor } from "@/lib/admin/email/coupon-data";
import { newsletterText, renderNewsletter, type Newsletter, type NewsletterTrip } from "@/lib/admin/email/newsletter";
import { officeEmail, sendHtml } from "@/lib/admin/email/send";
import { Denied, assertUser } from "@/lib/admin/guards";

const schema = z.object({
  subject: z.string().trim().min(3, "Add a subject").max(150),
  preheader: z.string().trim().max(160).default(""),
  heading: z.string().trim().min(2, "Add a heading").max(150),
  body: z.string().trim().min(10, "Write the message").max(10000),
  hero: z.string().trim().max(300).default(""),
  heroAlt: z.string().trim().max(200).default(""),
  offerCode: z.string().trim().toUpperCase().max(30).default(""),
  offerHeadline: z.string().trim().max(80).default(""),
  offerNote: z.string().trim().max(200).default(""),
  trips: z.array(z.string()).max(4).default([]),
  button: z.string().trim().max(40).default(""),
  buttonUrl: z.union([z.url(), z.literal("")]).default(""),
});
export type CampaignInput = z.input<typeof schema>;

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampadventure.com").replace(/\/$/, "");

async function build(input: unknown, unsubscribeUrl: string): Promise<{ n: Newsletter; c: z.infer<typeof schema> } | { error: string }> {
  const p = schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form" };
  const c = p.data;
  const coupon = c.offerCode ? await couponFor(c.offerCode) : null;
  if (c.offerCode && !coupon) return { error: `The code ${c.offerCode} doesn't exist yet. Create it under Discount codes first.` };
  const rows = c.trips.length ? await db.entry.findMany({ where: { collection: "trips", slug: { in: c.trips }, status: "published" }, select: { slug: true, live: true } }) : [];
  const terms = await db.entry.findMany({ where: { collection: "destinations" }, select: { slug: true, title: true } });
  const trips: NewsletterTrip[] = c.trips
    .map((slug) => rows.find((r) => r.slug === slug))
    .filter(Boolean)
    .map((r) => {
      const t = r!.live as { slug: string; title: string; days: number; destinations: string[]; price: { amount: number; regular: number | null } | null; cover: { src: string } | null };
      return { slug: t.slug, title: t.title, days: t.days, region: terms.find((x) => x.slug === t.destinations?.[0])?.title ?? null, price: t.price?.amount ?? null, regular: t.price?.regular ?? null, image: t.cover?.src ?? null };
    });
  return {
    c,
    n: {
      preheader: c.preheader || c.heading,
      heading: c.heading,
      body: c.body,
      hero: c.hero || null,
      heroAlt: c.heroAlt,
      offer: coupon ? { ...coupon, label: c.offerHeadline || coupon.label } : null,
      trips,
      button: c.button || null,
      buttonUrl: c.buttonUrl || null,
      unsubscribeUrl,
    },
  };
}

export async function previewCampaign(input: unknown): Promise<string> {
  await assertUser("email");
  const r = await build(input, `${site()}/api/newsletter/unsubscribe/?t=preview`);
  return "error" in r ? "" : renderNewsletter(r.n, { base: "" });
}

/** Sends the newsletter (or a test to yourself). Each subscriber gets their own unsubscribe link. */
export async function sendCampaign(input: unknown, test: boolean): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const { user } = await assertUser("email");
    if (test) {
      const r = await build(input, `${site()}/api/newsletter/unsubscribe/?t=test`);
      if ("error" in r) return { ok: false, error: r.error };
      const s = await sendHtml(user.email, `[Test] ${r.c.subject}`, renderNewsletter(r.n), newsletterText(r.n), "campaign-test");
      return s.ok ? { ok: true, message: `Test sent to ${user.email}.` } : { ok: false, error: s.error ?? "Send failed" };
    }
    const subs = await db.subscriber.findMany({ where: { status: "subscribed" }, select: { email: true, token: true } });
    if (!subs.length) return { ok: false, error: "There are no subscribers yet." };
    const first = await build(input, "");
    if ("error" in first) return { ok: false, error: first.error };
    const c = first.c;
    const campaign = await db.campaign.create({
      data: { subject: c.subject, heading: c.heading, body: c.body, button: c.button || null, buttonUrl: c.buttonUrl || null, extra: { preheader: c.preheader, hero: c.hero, heroAlt: c.heroAlt, offerCode: c.offerCode, offerHeadline: c.offerHeadline, offerNote: c.offerNote, trips: c.trips }, status: "sending", recipients: subs.length },
    });
    let sent = 0;
    for (const s of subs) {
      const n = { ...first.n, unsubscribeUrl: `${site()}/api/newsletter/unsubscribe/?t=${s.token}` };
      const r = await sendHtml(s.email, c.subject, renderNewsletter(n), newsletterText(n), `campaign:${campaign.id}`, { replyTo: officeEmail(), unsubscribeUrl: n.unsubscribeUrl });
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
