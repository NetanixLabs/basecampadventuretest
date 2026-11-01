"use client";

import { useId } from "react";
import { Help, inputClass, Label } from "@/components/admin/ui";
import type { Ctx } from "@/components/admin/form/fields";
import { cn } from "@/lib/utils";

type Seo = { title?: string | null; description?: string | null; ogImage?: string | null; noindex?: boolean };

const strip = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Title, description and sharing image, with a live Google preview and length guidance. */
export function SeoField({ value, onChange, ctx }: { value: Seo; onChange: (v: Seo) => void; ctx: Ctx }) {
  const id = useId();
  const set = (k: keyof Seo, v: unknown) => onChange({ ...value, [k]: v });
  const d = ctx.data;
  const fallbackTitle = `${String(d.title ?? d.name ?? "")} | Base Camp Adventure`;
  const fallbackDesc = strip(d.summary ?? d.excerpt ?? d.description ?? d.html ?? d.overview).slice(0, 160);
  const title = value.title || fallbackTitle;
  const desc = value.description || fallbackDesc;
  const slug = String(d.slug ?? "");
  const url = ctx.urlPattern ? `${ctx.siteUrl.replace(/^https?:\/\//, "")}${ctx.urlPattern.replace("{slug}", slug)}` : ctx.siteUrl.replace(/^https?:\/\//, "");

  const meter = (n: number, good: [number, number], max: number) => (
    <span className={cn("text-xs font-semibold", n === 0 ? "text-muted" : n < good[0] ? "text-amber-600" : n <= good[1] ? "text-emerald-600" : n <= max ? "text-amber-600" : "text-red-600")}>
      {n} characters {n === 0 ? "" : n < good[0] ? "· a bit short" : n <= good[1] ? "· good" : n <= max ? "· may be cut off" : "· too long"}
    </span>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
      <div className="space-y-5">
        <div>
          <Label htmlFor={`${id}t`} hint={meter((value.title ?? "").length, [35, 60], 65)}>Title in Google</Label>
          <input id={`${id}t`} value={value.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder={fallbackTitle} className={inputClass} />
          <Help>Put the main search phrase first, e.g. "Everest Base Camp Trek 14 Days: Cost & Itinerary".</Help>
        </div>
        <div>
          <Label htmlFor={`${id}d`} hint={meter((value.description ?? "").length, [120, 160], 170)}>Description in Google</Label>
          <textarea id={`${id}d`} value={value.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder={fallbackDesc} rows={3} className={inputClass} />
          <Help>A sentence or two that makes people want to click. Mention what's unique.</Help>
        </div>
        <div>
          <Label htmlFor={`${id}o`}>Sharing image (optional)</Label>
          <input id={`${id}o`} value={value.ogImage ?? ""} onChange={(e) => set("ogImage", e.target.value)} placeholder="Uses the main photo" className={cn(inputClass, "font-mono text-[13px]")} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(value.noindex)} onChange={(e) => set("noindex", e.target.checked)} className="size-4 accent-[var(--pine)]" />
          Hide this page from Google (noindex)
        </label>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Google preview</p>
        <div className="rounded-2xl border border-line bg-white p-4 text-left font-[arial,sans-serif] dark:bg-[#202124]">
          <p className="truncate text-xs text-[#4d5156] dark:text-[#bdc1c6]">{url}</p>
          <p className="mt-1 line-clamp-2 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{title.length > 62 ? `${title.slice(0, 60)}…` : title}</p>
          <p className="mt-1 line-clamp-3 text-sm leading-snug text-[#4d5156] dark:text-[#bdc1c6]">{desc.length > 162 ? `${desc.slice(0, 158)}…` : desc || "Add a description so Google doesn't pick a random sentence."}</p>
        </div>
        {value.noindex ? <p className="mt-2 text-xs font-semibold text-red-600">Hidden from search engines.</p> : null}
      </div>
    </div>
  );
}
