import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Check a receipt or bill", robots: { index: false, follow: true } };

async function go(form: FormData) {
  "use server";
  const code = String(form.get("code") ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 10);
  redirect(`/verify/${code || "0"}/`);
}

/** Type the verification code printed on a receipt or bill. */
export default function VerifyStart() {
  return (
    <section className="bg-snow-2 grid min-h-[80dvh] place-items-center px-4 pt-32 pb-20">
      <form action={go} className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <span className="bg-pine/10 text-pine grid size-16 place-items-center rounded-full"><ShieldCheck className="size-8" aria-hidden /></span>
        <h1 className="font-display mt-5 text-4xl font-black">Check a receipt or bill</h1>
        <p className="mt-3 text-ink-soft">Enter the 10-character verification code printed next to the QR code on your document.</p>
        <label htmlFor="code" className="mt-6 block text-sm font-semibold">Verification code</label>
        <input id="code" name="code" required maxLength={12} autoComplete="off" placeholder="e.g. E6Z6PY2V9X" className="mt-1.5 w-full rounded-xl border border-ink/15 px-4 py-3 font-mono text-lg tracking-[0.2em] uppercase outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
        <button className="bg-pine mt-5 w-full rounded-full px-6 py-3.5 font-semibold text-white">Check</button>
      </form>
    </section>
  );
}
