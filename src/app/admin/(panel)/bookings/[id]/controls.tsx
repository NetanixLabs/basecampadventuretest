"use client";

import { useState, useTransition } from "react";
import { Card, inputClass } from "@/components/admin/ui";
import { emailTraveller, recordPayment, setPaymentLink, updateBooking } from "../../sales-actions";
import type { BookingStatus } from "@/generated/prisma/browser";

const STATUSES: { v: BookingStatus; l: string }[] = [
  { v: "requested", l: "Requested" }, { v: "awaiting_payment", l: "Awaiting payment" }, { v: "deposit_paid", l: "Deposit paid" }, { v: "paid", l: "Paid in full" },
  { v: "confirmed", l: "Confirmed" }, { v: "cancelled", l: "Cancelled" }, { v: "refunded", l: "Refunded" },
];

export function BookingControls({ id, status: s0, notes: n0, paymentUrl: u0, balance }: { id: string; status: BookingStatus; notes: string; paymentUrl: string; balance: number }) {
  const [status, setStatus] = useState(s0);
  const [notes, setNotes] = useState(n0);
  const [url, setUrl] = useState(u0);
  const [amount, setAmount] = useState(balance ? String(balance) : "");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, ask?: string) => start(async () => {
    if (ask && !confirm(ask)) return;
    const r = await fn();
    setMsg(r.ok ? r.message ?? "Done." : r.error ?? "Failed.");
  });
  const btn = "w-full rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine disabled:opacity-50";
  return (
    <div className="space-y-6">
      {msg ? <p role="status" className="rounded-xl bg-pine/8 px-4 py-2.5 text-sm text-pine">{msg}</p> : null}
      <Card title="Email the traveller" info="Each button sends a branded email to the lead traveller straight away. Send confirmation also marks the booking Confirmed. Change the wording under Email templates.">
        <div className="grid gap-2">
          <button className={btn} disabled={pending} onClick={() => run(() => emailTraveller(id, "booking-confirmed"), "Send the booking confirmation and mark the booking confirmed?")}>Send confirmation</button>
          <button className={btn} disabled={pending} onClick={() => run(() => emailTraveller(id, "payment-reminder"), "Send a payment reminder with the payment link?")}>Send payment reminder</button>
          <button className={btn} disabled={pending} onClick={() => run(() => emailTraveller(id, "booking-received"), "Resend the booking email with the payment link?")}>Resend payment link</button>
          <button className={btn} disabled={pending} onClick={() => run(() => emailTraveller(id, "review-request"), "Ask for a review? (After the trip.)")}>Ask for a review</button>
        </div>
      </Card>
      <Card title="Status & notes">
        <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)} className={inputClass} aria-label="Status">{STATUSES.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</select>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={`${inputClass} mt-3`} placeholder="Private notes: flights, room sharing, guide assigned…" aria-label="Private notes" />
        <button className="mt-3 w-full rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} onClick={() => run(() => updateBooking(id, status, notes))}>Save</button>
      </Card>
      <Card title="WeTravel payment link" info="The link the traveller pays with. It is created automatically when they book; paste a different one here if you create it in WeTravel yourself.">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.wetravel.com/…" className={`${inputClass} font-mono text-xs`} aria-label="Payment link" />
        <button className={`${btn} mt-2`} disabled={pending} onClick={() => run(() => setPaymentLink(id, url))}>Save link</button>
      </Card>
      <Card title="Record a payment" info="For bank transfers or cash paid in the office. Payments made on WeTravel are added automatically.">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount in USD" className={inputClass} aria-label="Amount" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer 12 March" className={`${inputClass} mt-2`} aria-label="Note" />
        <button className={`${btn} mt-2`} disabled={pending} onClick={() => run(() => recordPayment(id, Number(amount), note), `Record a payment of $${amount}?`)}>Record payment</button>
      </Card>
    </div>
  );
}
