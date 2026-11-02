"use client";

import { CreditCard, Landmark } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export type PayMethod = "wetravel" | "hbl";
type W = Window & { __BCA_PAY__?: { methods: PayMethod[]; preferred: PayMethod } };

const DEFAULT = { methods: ["wetravel"] as PayMethod[], preferred: "wetravel" as PayMethod };
const noop = () => () => undefined;

/** The office's payment options (Admin → Settings → Features → Payments), set in the page head. */
export function usePayMethods() {
  return useSyncExternalStore(noop, () => ((window as W).__BCA_PAY__?.methods?.length ? (window as W).__BCA_PAY__! : DEFAULT), () => DEFAULT);
}

/** Only shown when there is a real choice; matches the booking form's option cards. */
export function PayMethodChoice({ value, onChange, methods }: { value: PayMethod; onChange: (m: PayMethod) => void; methods: PayMethod[] }) {
  if (methods.length < 2) return null;
  const opts = { wetravel: { Icon: CreditCard, title: "Card via WeTravel", text: "Visa, Mastercard, Amex, bank transfer" }, hbl: { Icon: Landmark, title: "Card via Himalayan Bank", text: "Visa, Mastercard, UnionPay" } } as const;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Pay with</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {methods.map((m) => {
          const { Icon, title, text } = opts[m];
          return (
            <label key={m} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-colors", value === m ? "border-pine bg-pine/5" : "border-line hover:border-pine/50")}>
              <input type="radio" name="pay-method" value={m} checked={value === m} onChange={() => onChange(m)} className="accent-[var(--pine)]" />
              <Icon className="text-pine size-5 shrink-0" aria-hidden />
              <span><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-muted">{text}</span></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
