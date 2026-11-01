"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ExternalLink, History, MoreHorizontal, Trash2, EyeOff, Check } from "lucide-react";
import type { CollectionDef, Option, OptionSource } from "@/lib/admin/collections";
import { Fields } from "@/components/admin/form/fields";
import { Badge, Button } from "@/components/admin/ui";
import { deleteAction, revisionAction, saveAction, unpublishAction } from "@/app/admin/(panel)/c/actions";
import { cn } from "@/lib/utils";

type Data = Record<string, unknown>;
type Revision = { id: string; note: string | null; at: string; by: string | null };

const slugify = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

export function EntryEditor({
  def, id, initial, status: initialStatus, dirty: initialDirty, options, siteUrl, canPublish, revisions,
}: {
  def: CollectionDef; id: string | null; initial: Data; status: string; dirty: boolean;
  options: Partial<Record<OptionSource, Option[]>>; siteUrl: string; canPublish: boolean; revisions: Revision[];
}) {
  const router = useRouter();
  const [data, setData] = useState<Data>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [status, setStatus] = useState(initialStatus);
  const [liveBehind, setLiveBehind] = useState(initialDirty);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const [history, setHistory] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [section, setSection] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const slugField = def.slugField ?? "slug";
  const titleField = def.titleField ?? "title";
  const unsaved = JSON.stringify(data) !== saved;
  const title = String(data[titleField] ?? "") || `New ${def.singular}`;
  const slug = String(data[slugField] ?? "");
  const publicUrl = def.url && slug ? `${siteUrl}${def.url.replace("{slug}", slug)}` : null;

  const change = useCallback(
    (next: Data) => {
      // New items get their web address from the title until it is edited by hand.
      if (!slugTouched && slugField === "slug" && next[titleField] !== data[titleField]) next = { ...next, slug: slugify(String(next[titleField] ?? "")) };
      if (next[slugField] !== data[slugField] && next[titleField] === data[titleField]) setSlugTouched(true);
      setData(next);
    },
    [data, slugTouched, slugField, titleField],
  );

  const save = useCallback(
    (publish: boolean) =>
      start(async () => {
        setMessage(null);
        const r = await saveAction(def.key, id, data, publish);
        if (!r.ok) {
          setMessage({ tone: "red", text: r.error });
          return;
        }
        setSaved(JSON.stringify(data));
        setStatus(r.value.status);
        setLiveBehind(!publish && r.value.status === "published");
        setMessage({ tone: "green", text: publish ? "Published. The website is updated." : r.value.status === "published" ? "Saved. Press Publish to put these changes live." : "Draft saved." });
        if (!id) router.replace(`/c/${def.key}/${r.value.id}`);
        else router.refresh();
      }),
    [data, def.key, id, router],
  );

  // Ctrl/Cmd+S saves; leaving with unsaved changes asks first.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pending) save(false);
      }
    };
    const leave = (e: BeforeUnloadEvent) => {
      if (unsaved) e.preventDefault();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", leave);
    };
  }, [save, unsaved, pending]);

  useEffect(() => {
    const els = sectionRefs.current.filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setSection(Number((top.target as HTMLElement).dataset.index));
    }, { rootMargin: "-120px 0px -60% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const ctx = useMemo(() => ({ options, data, siteUrl, urlPattern: def.url }), [options, data, siteUrl, def.url]);

  const badge =
    status === "published" ? (unsaved ? <Badge tone="amber">Live · unsaved edits</Badge> : liveBehind ? <Badge tone="amber">Live · changes not published</Badge> : <Badge tone="green"><Check className="size-3" /> Live</Badge>)
    : status === "archived" ? <Badge>Archived</Badge> : <Badge>{unsaved ? "Draft · unsaved" : "Draft"}</Badge>;

  return (
    <div>
      <div className="mb-2">
        <Link href={`/c/${def.key}`} className="text-sm font-semibold text-pine hover:underline">← {def.label}</Link>
      </div>

      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-line bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              {badge}
              {publicUrl && status === "published" ? (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-pine hover:underline">
                  View on website <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={pending || (!unsaved && Boolean(id))} onClick={() => save(false)} title="Ctrl+S">
              {pending ? "Saving…" : status === "published" ? "Save" : "Save draft"}
            </Button>
            {canPublish ? (
              <Button disabled={pending || (!unsaved && !liveBehind && status === "published")} onClick={() => save(true)}>
                {status === "published" ? "Publish changes" : "Publish"}
              </Button>
            ) : null}
            {id ? (
              <div className="relative">
                <button type="button" onClick={() => setMenu((m) => !m)} className="grid size-10 place-items-center rounded-full border border-line hover:border-pine" aria-label="More actions" aria-expanded={menu}>
                  <MoreHorizontal className="size-4" />
                </button>
                {menu ? (
                  <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-line bg-card p-1.5 shadow-xl" onMouseLeave={() => setMenu(false)}>
                    <MenuItem icon={<History className="size-4" />} onClick={() => { setHistory(true); setMenu(false); }}>Version history</MenuItem>
                    {canPublish && status === "published" ? (
                      <MenuItem icon={<EyeOff className="size-4" />} onClick={() => start(async () => {
                        if (!confirm(`Take this ${def.singular} off the website? It stays here as a draft.`)) return;
                        const r = await unpublishAction(def.key, id);
                        if (r.ok) { setStatus("draft"); setMessage({ tone: "green", text: "Taken off the website. It's a draft now." }); router.refresh(); } else setMessage({ tone: "red", text: r.error });
                        setMenu(false);
                      })}>Unpublish</MenuItem>
                    ) : null}
                    {canPublish ? (
                      <MenuItem danger icon={<Trash2 className="size-4" />} onClick={() => start(async () => {
                        if (!confirm(`Delete "${title}" for good? This can't be undone.${status === "published" ? " It will disappear from the website." : ""}`)) return;
                        const r = await deleteAction(def.key, id);
                        if (r.ok) router.push(`/c/${def.key}`); else setMessage({ tone: "red", text: r.error });
                      })}>Delete</MenuItem>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {message ? (
          <p role="status" className={cn("mt-2 rounded-lg px-3 py-2 text-sm", message.tone === "green" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200")}>
            {message.text}
          </p>
        ) : null}
      </div>

      <div className="grid gap-8 xl:grid-cols-[11rem_1fr]">
        <nav className="hidden xl:block" aria-label="Sections">
          <ul className="sticky top-28 space-y-0.5 text-sm">
            {def.sections.map((s, i) => (
              <li key={s.title}>
                <button type="button" onClick={() => sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })} className={cn("w-full rounded-lg px-3 py-1.5 text-left font-medium", section === i ? "bg-pine/10 text-pine" : "text-ink-soft hover:text-pine")}>
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          {def.sections.map((s, i) => (
            <section key={s.title} ref={(el) => { sectionRefs.current[i] = el; }} data-index={i} className="scroll-mt-32 rounded-2xl border border-line bg-card p-5 sm:p-6">
              <h2 className="text-base font-bold">{s.title}</h2>
              {s.description ? <p className="mt-0.5 text-sm text-muted">{s.description}</p> : null}
              <div className="mt-5">
                <Fields fields={s.fields} value={data} onChange={change} ctx={ctx} />
              </div>
            </section>
          ))}
        </div>
      </div>

      {history ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="Version history" onClick={() => setHistory(false)}>
          <div className="h-full w-full max-w-sm overflow-y-auto bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Version history</h2>
              <button type="button" onClick={() => setHistory(false)} className="text-sm font-semibold text-pine">Close</button>
            </div>
            <p className="mt-1 text-sm text-muted">Open an older version to look at it or bring it back. Nothing changes until you save.</p>
            <ul className="mt-4 space-y-2">
              {revisions.length ? revisions.map((r) => (
                <li key={r.id} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-semibold">{r.note ?? "Saved"}</p>
                  <p className="text-xs text-muted">{new Date(r.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{r.by ? ` · ${r.by}` : ""}</p>
                  <button type="button" disabled={pending} className="mt-2 text-xs font-semibold text-pine hover:underline" onClick={() => start(async () => {
                    const res = await revisionAction(r.id);
                    if (res.ok) { setData(res.value); setHistory(false); setMessage({ tone: "green", text: "Older version loaded. Save or publish to keep it." }); } else setMessage({ tone: "red", text: res.error });
                  })}>Open this version</button>
                </li>
              )) : <li className="text-sm text-muted">No earlier versions yet. Imported content starts its history with the first save.</li>}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ children, icon, onClick, danger }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium", danger ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40" : "hover:bg-pine/8")}>
      {icon}
      {children}
    </button>
  );
}
