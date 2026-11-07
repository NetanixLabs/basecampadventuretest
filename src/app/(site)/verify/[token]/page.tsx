import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, CircleAlert, CircleX } from "lucide-react";
import { isGenuine, receiptByToken } from "@/lib/server/receipts";
import { site } from "@/lib/site";
import { headers } from "next/headers";
import { clientIpFrom } from "@/lib/ip";
import { rateLimited } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check a receipt", robots: { index: false, follow: false } };

const mask = (name: string) => name.split(/\s+/).map((w, i) => (i === 0 ? w : `${w[0] ?? ""}.`)).join(" ");
const fmt = (n: number, cur: string) => `${cur} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Anyone with the QR code can confirm a receipt or bill is genuine. Shows only what's printed on it, with the surname shortened. */
export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limited = rateLimited(`verify:${clientIpFrom(await headers())}`, 30);
  const r = limited ? null : await receiptByToken(token).catch(() => null);
  const ok = r ? isGenuine(r) : false;
  const state = !r ? "missing" : !ok ? "tampered" : r.voidedAt ? "void" : "genuine";
  const look = {
    genuine: { Icon: BadgeCheck, tone: "text-moss bg-moss/12", title: "Genuine", text: `This ${r?.kind === "bill" ? "bill" : r?.kind === "credit" ? "credit note" : "receipt"} was issued by ${site.legalName} and has not been changed.` },
    void: { Icon: CircleAlert, tone: "text-amber-700 bg-amber-100", title: "Cancelled", text: "This document was issued by us but has since been cancelled." },
    tampered: { Icon: CircleX, tone: "text-crimson bg-crimson/10", title: "Not valid", text: "The details of this document do not match our records. Please contact us." },
    missing: { Icon: CircleX, tone: "text-crimson bg-crimson/10", title: "Not found", text: "We have no receipt or bill with this code. Please check the link or contact us." },
  }[state];
  return (
    <section className="bg-snow-2 grid min-h-[80dvh] place-items-center px-4 pt-32 pb-20">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <span className={`grid size-16 place-items-center rounded-full ${look.tone}`}><look.Icon className="size-8" aria-hidden /></span>
        <h1 className="font-display mt-5 text-4xl font-black">{look.title}</h1>
        <p className="mt-3 text-ink-soft">{look.text}</p>
        {r && (state === "genuine" || state === "void") ? (
          <>
          <dl className="mt-6 grid grid-cols-[9rem_1fr] gap-y-2 border-t border-ink/10 pt-5 text-sm">
            <dt className="text-ink-soft">{r.kind === "bill" ? "Bill" : r.kind === "credit" ? "Credit note" : "Receipt"} no.</dt><dd className="font-mono font-semibold">{r.number}</dd>
            <dt className="text-ink-soft">Issued</dt><dd>{r.issuedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" })}</dd>
            <dt className="text-ink-soft">{r.kind === "bill" ? "Billed to" : r.kind === "credit" ? "Refunded to" : "Received from"}</dt><dd>{mask(r.customerName)}</dd>
            <dt className="text-ink-soft">{r.kind === "bill" ? "Amount due" : r.kind === "credit" ? "Amount refunded" : "Amount"}</dt><dd className="font-semibold">{fmt(Number(r.total), r.currency)}</dd>
            <dt className="text-ink-soft">Verification code</dt><dd className="font-mono text-sm tracking-widest">{r.code}</dd>
            <dt className="text-ink-soft">Fingerprint</dt><dd className="font-mono text-xs leading-5 tracking-wider">{r.signature.slice(0, 20).toUpperCase().replace(/(.{4})(?=.)/g, "$1 ")}</dd>
          </dl>
          <p className="mt-3 text-xs text-ink-soft">The fingerprint printed on your document must match exactly. It is calculated from every amount, name and date on the document with a secret key only we hold, so any change makes it fail.</p>
          </>
        ) : null}
        <Link href="/verify/" className="mt-6 inline-block text-sm font-semibold text-pine hover:underline">Check another document</Link>
        <p className="mt-4 text-xs text-ink-soft">Questions? {site.email} · {site.mobile}</p>
      </div>
    </section>
  );
}
