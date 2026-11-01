"use client";

import { useId, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, GripVertical, Plus, Trash2, X } from "lucide-react";
import type { Field, Option, OptionSource } from "@/lib/admin/collections";
import { getPath, setPath } from "@/lib/admin/paths";
import { inputClass, Label } from "@/components/admin/ui";
import { Info } from "@/components/admin/info";
import { ImageField, GalleryField } from "@/components/admin/form/media-field";
import { RichText } from "@/components/admin/form/rich-text";
import { SeoField } from "@/components/admin/form/seo-field";
import { cn } from "@/lib/utils";

type Data = Record<string, unknown>;
export type Ctx = { options: Partial<Record<OptionSource, Option[]>>; data: Data; siteUrl: string; urlPattern: string | null };

export function Fields({ fields, value, onChange, ctx }: { fields: Field[]; value: Data; onChange: (v: Data) => void; ctx: Ctx }) {
  return (
    <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name} className={cn("min-w-0", f.wide || ["richtext", "repeater", "gallery", "group", "seo", "json", "strings", "textarea"].includes(f.type) ? "sm:col-span-2" : "")}>
          <FieldView field={f} value={getPath(value, f.name)} onChange={(v) => onChange(setPath(value, f.name, v))} ctx={ctx} />
        </div>
      ))}
    </div>
  );
}

export function FieldView({ field: f, value, onChange, ctx }: { field: Field; value: unknown; onChange: (v: unknown) => void; ctx: Ctx }) {
  const id = useId();
  const label = (
    <Label htmlFor={id} info={f.help} hint={f.type === "textarea" && f.max ? `${String(value ?? "").length}/${f.max}` : undefined}>
      {f.label}
      {f.required ? <span className="text-red-600"> *</span> : null}
    </Label>
  );

  switch (f.type) {
    case "text":
      return (
        <div>
          {label}
          <input id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} maxLength={f.max} required={f.required} className={cn(inputClass, f.mono && "font-mono text-[13px]")} />
        </div>
      );
    case "textarea":
      return (
        <div>
          {label}
          <textarea id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={f.rows ?? 4} maxLength={f.max ? f.max + 200 : undefined} className={cn(inputClass, "resize-y leading-relaxed")} />
        </div>
      );
    case "number":
      return (
        <div>
          {label}
          <div className="relative">
            <input
              id={id}
              type="number"
              inputMode="decimal"
              value={value === null || value === undefined ? "" : String(value)}
              onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
              min={f.min}
              max={f.max}
              step={f.step ?? 1}
              className={cn(inputClass, f.suffix && "pr-16")}
            />
            {f.suffix ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted">{f.suffix}</span> : null}
          </div>
        </div>
      );
    case "date":
      return (
        <div>
          {label}
          <input id={id} type="date" value={typeof value === "string" ? value.slice(0, 10) : ""} onChange={(e) => onChange(e.target.value || null)} className={inputClass} />
        </div>
      );
    case "toggle":
      return (
        <div className="flex items-start gap-3 pt-6">
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(value)}
            id={id}
            onClick={() => onChange(!value)}
            className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", value ? "bg-pine" : "bg-line")}
          >
            <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", Boolean(value) && "translate-x-5")} />
          </button>
          <div>
            <span className="flex items-center gap-1.5">
              <label htmlFor={id} className="text-sm font-semibold">{f.label}</label>
              {f.help ? <Info>{f.help}</Info> : null}
            </span>
          </div>
        </div>
      );
    case "select": {
      const opts = f.options ?? ctx.options[f.source!] ?? [];
      return (
        <div>
          {label}
          <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)} className={inputClass}>
            {f.allowEmpty !== false ? <option value="">—</option> : null}
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    case "multiselect":
      return (
        <div>
          {label}
          <MultiSelect value={(value as string[]) ?? []} onChange={onChange} options={f.options ?? ctx.options[f.source!] ?? []} ordered={f.ordered} />
        </div>
      );
    case "strings":
      return (
        <div>
          {label}
          <StringList value={(value as string[]) ?? []} onChange={onChange} itemLabel={f.itemLabel ?? "item"} placeholder={f.placeholder} />
        </div>
      );
    case "richtext":
      return (
        <div>
          {label}
          <RichText value={String(value ?? "")} onChange={onChange} minimal={f.minimal} />
        </div>
      );
    case "image":
      return (
        <div>
          {label}
          <ImageField value={(value as never) ?? null} onChange={onChange} folder={f.folder} />
        </div>
      );
    case "gallery":
      return (
        <div>
          {label}
          <GalleryField value={(value as never[]) ?? []} onChange={onChange} folder={f.folder} />
        </div>
      );
    case "repeater":
      return (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">{f.label}{f.help ? <Info>{f.help}</Info> : null}</p>
          <Repeater field={f} value={(value as Data[]) ?? []} onChange={onChange} ctx={ctx} />
        </div>
      );
    case "group":
      return (
        <fieldset className="rounded-2xl border border-line p-4 sm:p-5">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold">{f.label}{f.help ? <Info>{f.help}</Info> : null}</legend>
          <Fields fields={f.fields} value={(value as Data) ?? {}} onChange={onChange} ctx={ctx} />
        </fieldset>
      );
    case "seo":
      return <SeoField value={(value as never) ?? {}} onChange={onChange} ctx={ctx} />;
    case "json":
      return <JsonField label={label} id={id} value={value} onChange={onChange} rows={f.rows} />;
  }
}

/* --------------------------------------------------------------- pieces */

function MultiSelect({ value, onChange, options, ordered }: { value: string[]; onChange: (v: string[]) => void; options: Option[]; ordered?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const labelOf = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const matches = options.filter((o) => !value.includes(o.value) && (!q || o.label.toLowerCase().includes(q.toLowerCase()) || o.value.includes(q.toLowerCase()))).slice(0, 50);
  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="rounded-xl border border-line bg-card p-2 focus-within:border-pine">
      {value.length ? (
        <ul className={cn("mb-2 flex gap-1.5", ordered ? "flex-col" : "flex-wrap")}>
          {value.map((v, i) => (
            <li key={v} className={cn("flex items-center gap-1 rounded-lg bg-pine/8 py-1 pr-1 pl-2.5 text-sm", ordered && "justify-between")}>
              <span className="truncate">{ordered ? <span className="mr-2 text-xs font-bold text-muted">{i + 1}</span> : null}{String(labelOf.get(v) ?? v)}</span>
              <span className="flex shrink-0">
                {ordered ? (
                  <>
                    <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-3.5" /></IconBtn>
                    <IconBtn label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-3.5" /></IconBtn>
                  </>
                ) : null}
                <IconBtn label={`Remove ${labelOf.get(v) ?? v}`} onClick={() => onChange(value.filter((x) => x !== v))}><X className="size-3.5" /></IconBtn>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={options.length ? "Type to add…" : "Nothing to choose from yet"}
          className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none"
        />
        {open && matches.length ? (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-card p-1 shadow-lg">
            {matches.map((o) => (
              <li key={o.value}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange([...value, o.value]); setQ(""); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-pine/8">
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function StringList({ value, onChange, itemLabel, placeholder }: { value: string[]; onChange: (v: string[]) => void; itemLabel: string; placeholder?: string }) {
  const set = (i: number, s: string) => onChange(value.map((x, j) => (j === i ? s : x)));
  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 w-6 shrink-0 text-right text-xs font-semibold text-muted">{i + 1}</span>
          <textarea
            value={s}
            rows={s.length > 90 ? 3 : 1}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const next = [...value];
                next.splice(i + 1, 0, "");
                onChange(next);
                requestAnimationFrame(() => (e.currentTarget.parentElement?.nextElementSibling?.querySelector("textarea") as HTMLTextAreaElement | null)?.focus());
              }
            }}
            placeholder={placeholder}
            className={cn(inputClass, "resize-y py-2")}
          />
          <div className="flex shrink-0 pt-1">
            <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></IconBtn>
            <IconBtn label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></IconBtn>
            <IconBtn label={`Remove ${itemLabel}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="size-4" /></IconBtn>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, ""])} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-sm font-semibold text-pine hover:border-pine">
        <Plus className="size-4" /> Add {itemLabel}
      </button>
    </div>
  );
}

function Repeater({ field, value, onChange, ctx }: { field: Extract<Field, { type: "repeater" }>; value: Data[]; onChange: (v: Data[]) => void; ctx: Ctx }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set(field.collapsed ? [] : value.map((_, i) => i)));
  const [drag, setDrag] = useState<number | null>(null);
  const toggle = (i: number) => setOpen((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setOpen((s) => new Set([...s].map((i) => (i === from ? to : from < to && i > from && i <= to ? i - 1 : from > to && i >= to && i < from ? i + 1 : i))));
  };
  const blank = (): Data => Object.fromEntries(field.fields.map((f) => [f.name, f.type === "repeater" || f.type === "gallery" || f.type === "strings" || f.type === "multiselect" ? [] : f.type === "number" ? null : f.type === "toggle" ? false : f.type === "image" ? null : ""]));
  const title = (row: Data, i: number) => {
    const t = field.titleField ? String(getPath(row, field.titleField) ?? "").replace(/<[^>]+>/g, "") : "";
    const dayNo = row.day ? `Day ${row.day}: ` : "";
    return t ? `${dayNo}${t}` : `${field.itemLabel[0].toUpperCase()}${field.itemLabel.slice(1)} ${i + 1}`;
  };
  return (
    <div className="mt-2 space-y-2">
      {value.map((row, i) => (
        <div
          key={i}
          draggable={drag === i}
          onDragOver={(e) => { if (drag !== null) e.preventDefault(); }}
          onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
          className={cn("rounded-2xl border border-line bg-card", open.has(i) && "shadow-sm")}
        >
          <div className="flex items-center gap-1 px-2 py-1.5">
            <span onMouseDown={() => setDrag(i)} onMouseUp={() => setDrag(null)} className="cursor-grab p-1 text-muted" title="Drag to reorder" aria-hidden>
              <GripVertical className="size-4" />
            </span>
            <button type="button" onClick={() => toggle(i)} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm font-semibold" aria-expanded={open.has(i)}>
              <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", !open.has(i) && "-rotate-90")} />
              <span className="truncate">{title(row, i)}</span>
            </button>
            <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp className="size-4" /></IconBtn>
            <IconBtn label="Move down" disabled={i === value.length - 1} onClick={() => move(i, i + 1)}><ArrowDown className="size-4" /></IconBtn>
            <IconBtn label={`Duplicate ${field.itemLabel}`} onClick={() => { const next = [...value]; next.splice(i + 1, 0, structuredClone(row)); onChange(next); }}><Copy className="size-4" /></IconBtn>
            <IconBtn label={`Remove ${field.itemLabel}`} onClick={() => { if (confirm(`Remove this ${field.itemLabel}?`)) onChange(value.filter((_, j) => j !== i)); }}><Trash2 className="size-4" /></IconBtn>
          </div>
          {open.has(i) ? (
            <div className="border-t border-line p-4 sm:p-5">
              <Fields fields={field.fields} value={row} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} ctx={ctx} />
            </div>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const row = blank();
          if (field.fields.some((f) => f.name === "day")) row.day = value.length + 1;
          onChange([...value, row]);
          setOpen((s) => new Set([...s, value.length]));
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-sm font-semibold text-pine hover:border-pine"
      >
        <Plus className="size-4" /> Add {field.itemLabel}
      </button>
    </div>
  );
}

function JsonField({ label, id, value, onChange, rows }: { label: React.ReactNode; id: string; value: unknown; onChange: (v: unknown) => void; rows?: number }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      {label}
      <textarea
        id={id}
        value={text}
        rows={rows ?? 12}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setError(null);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        className={cn(inputClass, "font-mono text-xs leading-relaxed", error && "border-red-400")}
      />
      {error ? <p className="mt-1 text-xs text-red-600">Not valid yet: {error}</p> : null}
    </div>
  );
}

export function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-pine/8 hover:text-pine disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}
