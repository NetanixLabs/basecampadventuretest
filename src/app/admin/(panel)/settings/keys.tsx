"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Card, inputClass, Label } from "@/components/admin/ui";
import { saveKeys, testEmail } from "./keys-actions";
import type { ConfigKey } from "@/lib/admin/config";

type Status = Record<ConfigKey, { fromAdmin: boolean; set: boolean; value: string | null }>;

const GROUPS: { title: string; info: string; keys: { k: ConfigKey; l: string; secret?: boolean; placeholder?: string; info?: string }[] }[] = [
  {
    title: "WeTravel payments",
    info: "From WeTravel → Profile → API. With the API key, every booking gets its own WeTravel checkout with the exact price. The webhook secret lets WeTravel tell the website when a payment is made (address: https://basecampadventure.com/api/webhooks/wetravel).",
    keys: [
      { k: "WETRAVEL_API_KEY", l: "API key", secret: true },
      { k: "WETRAVEL_ENV", l: "Mode", placeholder: "production or sandbox", info: "Use sandbox for testing with WeTravel's demo site, production for real payments." },
      { k: "WETRAVEL_WEBHOOK_SECRET", l: "Webhook signing secret", secret: true, placeholder: "whsec_…" },
    ],
  },
  {
    title: "Email sending (SMTP)",
    info: "Your email provider's SMTP details. Google Workspace: smtp.gmail.com, port 587, the mailbox address and an app password. Zoho: smtp.zoho.com, port 465.",
    keys: [
      { k: "SMTP_HOST", l: "Server", placeholder: "smtp.gmail.com" },
      { k: "SMTP_PORT", l: "Port", placeholder: "587" },
      { k: "SMTP_USER", l: "Username", placeholder: "info@basecampadventure.com" },
      { k: "SMTP_PASS", l: "Password / app password", secret: true },
      { k: "EMAIL_FROM", l: "Send emails from", placeholder: "Base Camp Adventure <info@basecampadventure.com>" },
      { k: "OFFICE_EMAIL", l: "Office alerts go to", placeholder: "info@basecampadventure.com", info: "New enquiries, bookings and payments are emailed here." },
    ],
  },
];

export function KeysForm({ status }: { status: Status }) {
  const router = useRouter();
  const [v, setV] = useState<Partial<Record<ConfigKey, string>>>(() => Object.fromEntries(Object.entries(status).filter(([, s]) => s.value !== null).map(([k, s]) => [k, s.value ?? ""])));
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title="Keys & email" info="Keys are encrypted before they're saved and are never shown again; type a new value to replace one. Anything left empty uses the server's own settings file. Only main admins can see this.">
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveKeys(v); setMsg(r.message); if (r.ok) { setV((o) => Object.fromEntries(Object.entries(o).filter(([k]) => !GROUPS.flatMap((g) => g.keys).find((x) => x.k === k)?.secret))); router.refresh(); } }); }}>
        {GROUPS.map((g) => (
          <fieldset key={g.title} className="rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold">{g.title}</legend>
            <p className="mb-3 -mt-1 text-xs text-muted">{g.info}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.keys.map((f) => {
                const s = status[f.k];
                return (
                  <div key={f.k}>
                    <Label htmlFor={`k-${f.k}`} info={f.info} hint={s.set ? <Badge tone="green">{s.fromAdmin ? "Set here" : "Set on server"}</Badge> : <Badge tone="amber">Not set</Badge>}>{f.l}</Label>
                    <div className="flex gap-2">
                      <input
                        id={`k-${f.k}`}
                        type={f.secret ? "password" : "text"}
                        autoComplete="off"
                        value={v[f.k] ?? ""}
                        onChange={(e) => setV({ ...v, [f.k]: e.target.value })}
                        placeholder={f.secret && s.set ? "•••••••• saved (type to replace)" : f.placeholder}
                        className={`${inputClass} font-mono text-[13px]`}
                      />
                      {s.fromAdmin ? (
                        <button type="button" title="Remove and use the server's setting" disabled={pending} onClick={() => start(async () => { if (!confirm(`Remove ${f.l}?`)) return; const r = await saveKeys({ [f.k]: null }); setMsg(r.message); router.refresh(); })} className="shrink-0 rounded-full border border-line px-3 text-xs font-semibold hover:border-red-300 hover:text-red-700">Remove</button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save keys"}</button>
          <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await testEmail()).message))} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-pine">Send a test email</button>
          {msg ? <p role="status" className="text-sm">{msg}</p> : null}
        </div>
      </form>
    </Card>
  );
}
