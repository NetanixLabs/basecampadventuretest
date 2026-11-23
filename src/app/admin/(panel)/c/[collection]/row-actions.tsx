"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteAction, showAction, unpublishAction } from "../actions";
import { useStepUp } from "@/components/admin/step-up";

/** Hide / show / delete, straight from the list. */
export function RowActions({ collection, id, title, status, singular }: { collection: string; id: string; title: string; status: string; singular: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const stepUp = useStepUp();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ask: string, code = false) =>
    start(async () => {
      if (code ? !(await stepUp({ purpose: "delete", title: `Delete “${title}” for good`, detail: "Permanent. Use Hide to keep it offline instead.", action: "Delete for good", danger: true })) : !confirm(ask)) return;
      const r = await fn();
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  const btn = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-40";
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {status === "published" ? (
        <button type="button" disabled={pending} className={`${btn} text-ink-soft hover:bg-pine/8 hover:text-pine`} title={`Hide this ${singular} from the website`}
          onClick={() => run(() => unpublishAction(collection, id), `Hide "${title}" from the website?\n\nIt stays here as a draft and you can show it again any time. Its page will show "not found" while hidden; if people find it on Google, add a redirect to a similar page.`)}>
          <EyeOff className="size-3.5" aria-hidden /> Hide
        </button>
      ) : (
        <button type="button" disabled={pending} className={`${btn} text-pine hover:bg-pine/8`} title={`Show this ${singular} on the website`}
          onClick={() => run(() => showAction(collection, id), `Show "${title}" on the website?`)}>
          <Eye className="size-3.5" aria-hidden /> Show
        </button>
      )}
      <button type="button" disabled={pending} className={`${btn} text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40`} title={`Delete this ${singular}`}
        onClick={() => run(() => deleteAction(collection, id), "", true)}>
        <Trash2 className="size-3.5" aria-hidden /> Delete
      </button>
    </span>
  );
}
