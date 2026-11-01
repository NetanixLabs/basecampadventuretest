import { db } from "@/lib/admin/db";
import { adminConfigured } from "@/lib/admin/env";

/** One-click unsubscribe from the link in every newsletter email. */
async function unsubscribe(token: string | null) {
  if (!token || !adminConfigured()) return false;
  const r = await db.subscriber.updateMany({ where: { token }, data: { status: "unsubscribed", unsubscribedAt: new Date() } });
  return r.count > 0;
}

const page = (ok: boolean) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Unsubscribed</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f3f7f8;color:#242a2c"><div style="max-width:28rem;padding:2rem;text-align:center"><h1 style="font-size:1.6rem">${ok ? "You're unsubscribed" : "This link has expired"}</h1><p>${ok ? "You won't receive our newsletter any more. Booking emails are not affected." : "You may already be unsubscribed."}</p><p><a href="/" style="color:#00788a;font-weight:700">Back to Base Camp Adventure</a></p></div>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

export async function GET(req: Request) {
  return page(await unsubscribe(new URL(req.url).searchParams.get("t")));
}

/** RFC 8058 one-click unsubscribe (Gmail and Apple Mail's button). */
export async function POST(req: Request) {
  await unsubscribe(new URL(req.url).searchParams.get("t"));
  return new Response(null, { status: 204 });
}
