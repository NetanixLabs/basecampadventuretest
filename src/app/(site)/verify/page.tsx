import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/admin/db";
import { safeEqual } from "@/lib/admin/crypto";
import { clientIpFrom } from "@/lib/ip";
import { verifyToken } from "@/lib/server/receipts";
import { rateLimited } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check a receipt or bill", robots: { index: false, follow: true } };

/** Both the document number and its 10-character code are needed, so codes can't be guessed on their own. */
async function check(form: FormData) {
  "use server";
  const number = String(form.get("number") ?? "").trim().toUpperCase().slice(0, 30);
  const code = String(form.get("code") ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 10);
  if (rateLimited(`verify-form:${clientIpFrom(await headers())}`, 10)) redirect("/verify/?e=wait");
  const r = number && code.length === 10 ? await db.receipt.findUnique({ where: { number } }).catch(() => null) : null;
  if (!r || !safeEqual(r.code, code)) redirect("/verify/?e=nomatch");
  redirect(`/verify/${verifyToken(r)}/`);
}

export default async function VerifyStart({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <section className="bg-snow-2 grid min-h-[80dvh] place-items-center px-4 pt-32 pb-20">
      <form action={check} className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <span className="bg-pine/10 text-pine grid size-16 place-items-center rounded-full"><ShieldCheck className="size-8" aria-hidden /></span>
        <h1 className="font-display mt-5 text-4xl font-black">Check a receipt or bill</h1>
        <p className="mt-3 text-ink-soft">The quickest way is to scan the QR code on the document. Or type its number and the 10-character verification code printed next to the QR code.</p>
        {e ? <p role="alert" className="mt-4 rounded-xl bg-crimson/10 px-4 py-3 text-sm text-crimson">{e === "wait" ? "Too many attempts. Please try again in a few minutes." : "These details don't match any document. Check the number and code and try again."}</p> : null}
        <label htmlFor="number" className="mt-6 block text-sm font-semibold">Receipt or bill number</label>
        <input id="number" name="number" required maxLength={30} autoComplete="off" placeholder="e.g. BCA-R-2026-0001" className="mt-1.5 w-full rounded-xl border border-ink/15 px-4 py-3 font-mono uppercase outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
        <label htmlFor="code" className="mt-4 block text-sm font-semibold">Verification code</label>
        <input id="code" name="code" required maxLength={12} autoComplete="off" placeholder="e.g. E6Z6PY2V9X" className="mt-1.5 w-full rounded-xl border border-ink/15 px-4 py-3 font-mono text-lg tracking-[0.2em] uppercase outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
        <button className="bg-pine mt-5 w-full rounded-full px-6 py-3.5 font-semibold text-white">Check</button>
      </form>
    </section>
  );
}
