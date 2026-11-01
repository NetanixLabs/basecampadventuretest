import "server-only";
import { cfg } from "@/lib/admin/config";

/**
 * WeTravel Partner API: payment links.
 *
 *   POST {base}/payment_links   header X-Api-Key
 *   production https://api.wetravel.com/v2
 *   sandbox    https://api.demo.wetravel.to/v2
 *
 * The key lives on the server only (WETRAVEL_API_KEY). The admin's
 * Integrations screen will own it later. Without a key the site runs in
 * "request" mode: the booking is recorded and the office sends the link.
 */

const base = async () => ((await cfg("WETRAVEL_ENV")) === "production" ? "https://api.wetravel.com/v2" : "https://api.demo.wetravel.to/v2");

export const wetravelEnabled = async () => Boolean(await cfg("WETRAVEL_API_KEY"));

export async function createPaymentLink(input: {
  reference: string;
  title: string;
  startDate: string;
  days: number;
  amount: number;
  deposit?: number;
}): Promise<{ url: string; id: string | null } | { error: string }> {
  const key = await cfg("WETRAVEL_API_KEY");
  if (!key) return { error: "WeTravel is not configured" };

  const start = new Date(`${input.startDate}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + Math.max(0, input.days - 1));

  const body = {
    data: {
      trip: {
        title: `${input.title} · ${input.reference}`,
        trip_id: input.reference,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        currency: "USD",
        participant_fees: "none",
      },
      pricing: {
        price: Math.round(input.amount * 100) / 100,
        ...(input.deposit ? { payment_plan: { deposit: Math.round(input.deposit * 100) / 100, allow_partial_payment: true } } : {}),
      },
    },
  };

  try {
    const res = await fetch(`${await base()}/payment_links?publish_immediately=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Api-Key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { error: `WeTravel ${res.status}` };
    const data = (json.data ?? json) as Record<string, unknown>;
    const trip = data.trip as Record<string, unknown> | undefined;
    const url = (data.url ?? data.link ?? trip?.url) as string | undefined;
    // Kept on the booking so WeTravel's payment notifications can be matched to it.
    const id = (data.uuid ?? trip?.uuid ?? null) as string | null;
    return url ? { url, id } : { error: "WeTravel returned no link" };
  } catch {
    return { error: "WeTravel could not be reached" };
  }
}
