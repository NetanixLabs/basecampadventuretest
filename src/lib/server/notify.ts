import "server-only";
import { cfg } from "@/lib/admin/config";
import { features } from "@/lib/admin/features";

/**
 * WhatsApp alerts to the office. Two ways to send:
 * - CallMeBot: free, for a personal number (one key per phone).
 * - WhatsApp Business Cloud API (Meta): the official way for a business
 *   number; uses an approved template with one text variable.
 * Failures are logged and never block the booking or enquiry.
 */
export type OfficeEvent = "booking" | "enquiry" | "payment";

const phones = (s: string) => s.split(",").map((p) => p.replace(/[^0-9]/g, "")).filter((p) => p.length >= 8);

export async function notifyOffice(event: OfficeEvent, text: string): Promise<void> {
  try {
    const f = (await features()).whatsapp;
    if (!f.enabled || !f[event]) return;
    const to = phones(f.recipients);
    if (!to.length) return;
    const body = text.slice(0, 900);
    if (f.provider === "callmebot") {
      const keys = ((await cfg("CALLMEBOT_KEYS")) ?? "").split(",").map((k) => k.trim());
      await Promise.allSettled(
        to.map(async (phone, i) => {
          const key = keys[i] ?? keys[0];
          if (!key) return;
          const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(body)}&apikey=${encodeURIComponent(key)}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!r.ok) console.error("[whatsapp] callmebot", phone, r.status);
        }),
      );
    } else {
      const [token, phoneId] = await Promise.all([cfg("WHATSAPP_TOKEN"), cfg("WHATSAPP_PHONE_ID")]);
      if (!token || !phoneId) return;
      await Promise.allSettled(
        to.map(async (phone) => {
          const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "template",
              template: { name: f.template, language: { code: f.language }, components: [{ type: "body", parameters: [{ type: "text", text: body.replace(/\s*\n\s*/g, " · ") }] }] },
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) console.error("[whatsapp] meta", phone, r.status, (await r.text()).slice(0, 200));
        }),
      );
    }
  } catch (e) {
    console.error("[whatsapp] failed", e instanceof Error ? e.message : e);
  }
}
