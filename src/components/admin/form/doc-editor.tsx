"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Option, OptionSource, SingletonDef } from "@/lib/admin/collections";
import { Fields } from "@/components/admin/form/fields";
import { Button, PageHeader } from "@/components/admin/ui";
import { saveSingletonAction } from "@/app/admin/(panel)/singles/actions";

/** Editor for one-off content (homepage rows, menu, About page…). Saving publishes. */
export function DocEditor({ def, initial, options, siteUrl }: { def: SingletonDef; initial: Record<string, unknown>; options: Partial<Record<OptionSource, Option[]>>; siteUrl: string }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const unsaved = JSON.stringify(data) !== saved;
  const ctx = useMemo(() => ({ options, data, siteUrl, urlPattern: null }), [options, data, siteUrl]);

  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => { if (unsaved) e.preventDefault(); };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [unsaved]);

  return (
    <>
      <PageHeader
        title={def.label}
        description={def.description}
        back={{ href: "/more", label: "More content" }}
        actions={
          <Button disabled={pending || !unsaved} onClick={() => start(async () => {
            const r = await saveSingletonAction(def.key, data);
            if (r.ok) { setSaved(JSON.stringify(data)); setMsg({ ok: true, text: "Published. The website is updated." }); router.refresh(); }
            else setMsg({ ok: false, text: r.error });
          })}>
            {pending ? "Publishing…" : unsaved ? "Publish changes" : "Published"}
          </Button>
        }
      />
      {msg ? <p role="status" className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p> : null}
      <div className="space-y-6">
        {def.sections.map((s) => (
          <section key={s.title} className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <h2 className="text-base font-bold">{s.title}</h2>
            {s.description ? <p className="mt-0.5 text-sm text-muted">{s.description}</p> : null}
            <div className="mt-5"><Fields fields={s.fields} value={data} onChange={setData} ctx={ctx} /></div>
          </section>
        ))}
      </div>
    </>
  );
}
