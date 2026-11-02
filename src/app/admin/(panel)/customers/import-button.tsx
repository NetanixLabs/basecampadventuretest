"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { importCustomersAction } from "./actions";

export function ImportButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => { const r = await importCustomersAction(); alert(r.message); router.refresh(); })} className="rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold hover:border-pine disabled:opacity-50">
      {pending ? "Filling…" : "Fill from bookings"}
    </button>
  );
}
