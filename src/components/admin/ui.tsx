import Link from "next/link";
import { Children, cloneElement, isValidElement, type ReactElement } from "react";
import { Info } from "@/components/admin/info";
import { cn } from "@/lib/utils";

/** Small, consistent building blocks for every admin screen. */

export function PageHeader({ title, description, actions, back, info }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string }; info?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-pine hover:underline">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
          {info ? <Info label={`About ${title}`}>{info}</Info> : null}
        </h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className, title, description, actions, info }: { children: React.ReactNode; className?: string; title?: string; description?: string; actions?: React.ReactNode; info?: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(0,40,50,0.04)] sm:p-6", className)}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-base font-bold text-ink">{title}{info ? <Info label={`About ${title}`}>{info}</Info> : null}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const variants = {
  primary: "bg-pine text-white hover:bg-pine-deep shadow-sm",
  secondary: "border border-line bg-card text-ink hover:border-pine hover:text-pine",
  ghost: "text-ink-soft hover:bg-pine/8 hover:text-pine",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
} as const;

export const buttonClass = (variant: keyof typeof variants = "primary", size: "sm" | "md" = "md") =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
    size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
    variants[variant],
  );

export function Button({ variant = "primary", size = "md", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; size?: "sm" | "md" }) {
  return <button {...props} className={cn(buttonClass(variant, size), className)} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: React.ComponentProps<typeof Link> & { variant?: keyof typeof variants; size?: "sm" | "md" }) {
  return <Link {...props} className={cn(buttonClass(variant, size), className)} />;
}

export const inputClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-pine focus:outline-none focus:ring-3 focus:ring-pine/15 disabled:opacity-60";

export function Label({ children, htmlFor, hint, info }: { children: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; info?: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between gap-3 text-sm font-semibold text-ink">
      <span className="flex items-center gap-1.5">
        {children}
        {info ? <Info>{info}</Info> : null}
      </span>
      {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-muted">{children}</p>;
}

const tones = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300",
  gray: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
  pine: "bg-pine/10 text-pine ring-pine/20",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap", tones[tone])}>{children}</span>;
}

export function Alert({ children, tone = "blue" }: { children: React.ReactNode; tone?: "green" | "red" | "amber" | "blue" }) {
  return <div role={tone === "red" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-sm ring-1 ring-inset", tones[tone])}>{children}</div>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  // Each cell carries its column name, shown as a small label on phones.
  const labelled = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;
    const r = row as ReactElement<{ children?: React.ReactNode }>;
    let i = 0;
    return cloneElement(r, {
      children: Children.map(r.props.children, (cell) => {
        if (!isValidElement(cell)) return cell;
        const label = head[i++];
        return typeof label === "string" && label ? cloneElement(cell as ReactElement<Record<string, unknown>>, { "data-label": label }) : cell;
      }),
    });
  });
  return (
    // On phones each row becomes a small stacked card; from tablet size up it's a normal table.
    <div className="min-w-0 overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="admin-table w-full text-left text-sm sm:min-w-[640px]">
        <thead className="hidden border-b border-line bg-pine/[0.03] text-xs font-semibold tracking-wide text-muted uppercase sm:table-header-group">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="block divide-y divide-line sm:table-row-group [&_td]:block [&_td]:px-4 [&_td]:py-0.5 [&_td:empty]:hidden [&_td:first-child]:pt-3 [&_td:last-child]:pb-3 sm:[&_td]:table-cell sm:[&_td]:py-3 [&_td]:text-left sm:[&_td]:text-inherit [&_tr]:block sm:[&_tr]:table-row [&_tr:hover]:bg-pine/[0.025]">{labelled}</tbody>
      </table>
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="font-display mt-2 text-3xl font-bold text-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-card p-5 transition-colors";
  return href ? <Link href={href} className={cn(cls, "hover:border-pine")}>{body}</Link> : <div className={cls}>{body}</div>;
}

export const money = (n: number | string | { toString(): string }, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n.toString()));

export const when = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" }) : "—";

export const day = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
