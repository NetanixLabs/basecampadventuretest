"use client";

import { useState, useTransition } from "react";
import { Card, inputClass, Label } from "@/components/admin/ui";
import { saveCompany } from "../system-actions";

type V = Record<"contactPerson" | "phone" | "mobile" | "whatsapp" | "email" | "street" | "city" | "poBox" | "facebook" | "instagram" | "x" | "tripadvisor" | "legalName" | "govReg" | "vat" | "ntbLicence" | "nma" | "taan" | "googleReview", string>;

const FIELDS: { k: keyof V; l: string; info?: string; type?: string; group: "contact" | "address" | "social" | "legal" }[] = [
  { k: "legalName", l: "Registered company name", info: "As on the company registration. Printed on receipts and bills.", group: "legal", type: "text" },
  { k: "vat", l: "VAT / PAN number", info: "Printed on every receipt and bill, and in the website footer.", group: "legal", type: "text" },
  { k: "govReg", l: "Government registration no.", group: "legal", type: "text" },
  { k: "ntbLicence", l: "Tourism licence no. (NTB)", info: "Your trekking agency licence from the Department of Tourism / Nepal Tourism Board.", group: "legal", type: "text" },
  { k: "nma", l: "NMA membership no.", group: "legal", type: "text" },
  { k: "taan", l: "TAAN membership no.", group: "legal", type: "text" },
  { k: "contactPerson", l: "Contact person", info: "Shown in the website header (\"Available now\"), on the booking page and as the signature in newsletters.", group: "contact" },
  { k: "mobile", l: "Mobile (24/7)", info: "Shown in the header and booking page, with a call link.", group: "contact" },
  { k: "whatsapp", l: "WhatsApp number", info: "Numbers only with country code, e.g. 9779851029616. Used by every WhatsApp button.", group: "contact" },
  { k: "phone", l: "Office phone", group: "contact" },
  { k: "email", l: "Public email", type: "email", info: "Shown on the website and in email footers. Office alerts go to the office email in Connections.", group: "contact" },
  { k: "street", l: "Street", group: "address" },
  { k: "city", l: "City", group: "address" },
  { k: "poBox", l: "P.O. Box", group: "address" },
  { k: "facebook", l: "Facebook", group: "social" },
  { k: "instagram", l: "Instagram", group: "social" },
  { k: "x", l: "X (Twitter)", group: "social" },
  { k: "tripadvisor", l: "Tripadvisor", group: "social" },
  { k: "googleReview", l: "Google: \"write a review\" link", info: "From your Google Business Profile: Ask for reviews → copy link. Used by the \"Review us on Google\" buttons.", group: "social" },
];

export function CompanyForm({ initial }: { initial: V }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const group = (g: string) => FIELDS.filter((f) => f.group === g).map((f) => (
    <div key={f.k}>
      <Label htmlFor={`co-${f.k}`} info={f.info}>{f.l}</Label>
      <input id={`co-${f.k}`} type={f.type ?? (f.group === "social" ? "url" : "text")} value={v[f.k]} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} className={inputClass} placeholder={f.group === "social" ? "https://…" : undefined} />
    </div>
  ));
  return (
    <Card title="Company & contact" info="These details appear across the whole website (header, footer, contact page, booking page, Google's business information) and in every email. Saving updates everything at once.">
      <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveCompany(v); setMsg(r.ok ? r.message ?? "Saved." : r.error); }); }} className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Contact</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group("contact")}</div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Office address</p>
          <div className="grid gap-4 sm:grid-cols-3">{group("address")}</div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Registration (receipts, bills and footer)</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group("legal")}</div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Social media</p>
          <div className="grid gap-4 sm:grid-cols-2">{group("social")}</div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save company details"}</button>
          {msg ? <p role="status" className="text-sm">{msg}</p> : null}
        </div>
      </form>
    </Card>
  );
}
