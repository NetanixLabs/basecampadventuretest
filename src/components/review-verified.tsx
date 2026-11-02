import { BadgeCheck } from "lucide-react";

/** Verified-review seal at the end of reviewer rows: a filled check badge with a short label. */
export function ReviewVerified() {
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600/10 py-0.5 pr-2 pl-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:text-emerald-300" title="Verified review: this traveller booked and travelled with us">
      <BadgeCheck className="size-3.5 fill-emerald-600 text-white dark:text-pine-night" aria-hidden />
      Verified
    </span>
  );
}
