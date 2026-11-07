import "server-only";
import webpush from "web-push";
import { db } from "@/lib/admin/db";
import { decrypt, encrypt } from "@/lib/admin/crypto";
import { features } from "@/lib/admin/features";

/**
 * Notifications for travellers: a notice on their trip page, and (when they
 * allowed it) a phone notification through Web Push. Push messages are
 * end-to-end encrypted to the traveller's browser by the Web Push standard;
 * the keys for signing them (VAPID) are made once and kept encrypted.
 */
type Vapid = { publicKey: string; privateKey: string };
let cached: Vapid | null = null;

export async function vapid(): Promise<Vapid> {
  if (cached) return cached;
  const row = await db.setting.findUnique({ where: { key: "vapid" } });
  const v = row?.value as { publicKey?: string; privateEnc?: string } | null;
  if (v?.publicKey && v.privateEnc) {
    cached = { publicKey: v.publicKey, privateKey: decrypt(v.privateEnc) };
    return cached;
  }
  const keys = webpush.generateVAPIDKeys();
  // Two servers starting at once: the first one written wins.
  await db.setting.upsert({ where: { key: "vapid" }, create: { key: "vapid", value: { publicKey: keys.publicKey, privateEnc: encrypt(keys.privateKey) }, public: false }, update: {} });
  cached = null;
  return vapid();
}

export type Notice = { kind: "message" | "document" | "payment" | "photos" | "reminder" | "group" | "trip"; title: string; body: string; href?: string };

const portal = () => (process.env.PORTAL_URL ?? "https://my.basecampadventure.com").replace(/\/$/, "");

/** Everyone who can open a booking: the lead traveller and the group. */
async function people(bookingId: string) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, select: { travellerId: true, access: { select: { travellerId: true } } } });
  if (!b) return [];
  return [...new Set([b.travellerId, ...b.access.map((a) => a.travellerId)].filter(Boolean) as string[])];
}

/** Sends one notice to everyone on a booking (or only some of them). Never throws. */
export async function notifyBooking(bookingId: string, n: Notice, only?: string[]) {
  try {
    const ids = (await people(bookingId)).filter((id) => !only || only.includes(id));
    if (!ids.length) return 0;
    const href = n.href ?? `/trip/${bookingId}/`;
    await db.notification.createMany({ data: ids.map((travellerId) => ({ travellerId, bookingId, kind: n.kind, title: n.title.slice(0, 120), body: n.body.slice(0, 300), href })) });
    if (!(await features()).push.enabled) return ids.length;
    const subs = await db.pushSubscription.findMany({ where: { travellerId: { in: ids } } });
    if (!subs.length) return ids.length;
    const keys = await vapid();
    const payload = JSON.stringify({ title: n.title, body: n.body, url: `${portal()}${href}`, tag: `${n.kind}-${bookingId}` });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { vapidDetails: { subject: "mailto:info@basecampadventure.com", publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 86_400, urgency: n.kind === "message" ? "high" : "normal", timeout: 10_000 });
          await db.pushSubscription.update({ where: { id: s.id }, data: { lastUsedAt: new Date() } });
        } catch (e) {
          // The phone unsubscribed or the browser was reset: forget it.
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
          else console.error("[push] failed", code ?? (e as Error).message);
        }
      }),
    );
    return ids.length;
  } catch (e) {
    console.error("[push] notify failed", e);
    return 0;
  }
}

/** Only https push services run by the browser makers are accepted. */
export function validEndpoint(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|notify\.windows\.com|push\.apple\.com)$/.test(url.hostname) && u.length < 1000;
  } catch {
    return false;
  }
}
