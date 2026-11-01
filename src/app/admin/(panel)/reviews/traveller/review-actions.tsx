"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideReview } from "./actions";

export function ReviewActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (d: "approve" | "reject" | "delete", ask?: string) => start(async () => {
    if (ask && !confirm(ask)) return;
    const r = await decideReview(id, d);
    setMsg(r.message);
    router.refresh();
  });
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
      {status !== "approved" ? <button disabled={pending} onClick={() => run("approve")} className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve and publish</button> : null}
      {status === "pending" ? <button disabled={pending} onClick={() => run("reject")} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-pine disabled:opacity-50">Reject</button> : null}
      <button disabled={pending} onClick={() => run("delete", status === "approved" ? "Delete this record? (It stays on the trip page; remove it there under Traveller reviews.)" : "Delete this review?")} className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:text-red-600 disabled:opacity-50">Delete</button>
      {msg ? <span role="status" className="text-sm text-pine">{msg}</span> : null}
    </div>
  );
}
