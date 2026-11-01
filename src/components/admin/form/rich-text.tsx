"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Mark, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold, Code2, Heading2, Heading3, Heading4, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Table as TableIcon, Underline, Undo2, Clapperboard as YoutubeIcon,
} from "lucide-react";
import { MediaPicker } from "@/components/admin/form/media-field";
import { cn } from "@/lib/utils";

/** Keeps altitude markup from the old site (<span class="measurement" data-meters>) so feet are still added. */
const Measurement = Mark.create({
  name: "measurement",
  addAttributes: () => ({ meters: { default: null, parseHTML: (el) => el.getAttribute("data-meters"), renderHTML: (a) => (a.meters ? { "data-meters": a.meters } : {}) } }),
  parseHTML: () => [{ tag: "span.measurement" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes({ class: "measurement" }, HTMLAttributes), 0],
});

/**
 * The writing editor used for blogs, pages and trip text. It feels like a
 * word processor, and produces clean HTML that matches the site's styles.
 */
export function RichText({ value, onChange, minimal }: { value: string; onChange: (html: string) => void; minimal?: boolean }) {
  const [source, setSource] = useState(false);
  const [picker, setPicker] = useState(false);
  const last = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: minimal ? "Write here…" : "Start writing. Use headings (H2) to break it into sections." }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ nocookie: true, modestBranding: true, width: 720, height: 405 }),
      Measurement,
    ],
    content: value,
    editorProps: { attributes: { class: cn("prose-admin min-h-40 px-4 py-3 focus:outline-none", !minimal && "min-h-72") } },
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      last.current = html;
      onChange(html);
    },
  });

  // When the value changes from outside (e.g. an older version restored), show it.
  useEffect(() => {
    if (editor && value !== last.current) {
      last.current = value;
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const words = useEditorState({ editor, selector: (s) => (s.editor ? s.editor.getText().split(/\s+/).filter(Boolean).length : 0) }) ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card focus-within:border-pine">
      {editor ? <Toolbar editor={editor} minimal={minimal} source={source} setSource={setSource} onImage={() => setPicker(true)} /> : <div className="h-11 border-b border-line" />}
      {source ? (
        <textarea
          value={value}
          onChange={(e) => { last.current = e.target.value; onChange(e.target.value); }}
          spellCheck={false}
          rows={18}
          className="block w-full resize-y bg-card px-4 py-3 font-mono text-xs leading-relaxed focus:outline-none"
          aria-label="HTML source"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      {!minimal ? <div className="border-t border-line px-4 py-1.5 text-right text-xs text-muted">{words.toLocaleString()} words · about {Math.max(1, Math.round(words / 220))} min read</div> : null}
      {picker && editor ? (
        <MediaPicker
          onClose={() => setPicker(false)}
          onPick={(items) => {
            items.forEach((m) => editor.chain().focus().setImage({ src: m.src, alt: m.alt, width: m.width || undefined, height: m.height || undefined } as never).run());
            setPicker(false);
          }}
          multiple
        />
      ) : null}
    </div>
  );
}

function Toolbar({ editor, minimal, source, setSource, onImage }: { editor: Editor; minimal?: boolean; source: boolean; setSource: (b: boolean) => void; onImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      table: e.isActive("table"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const link = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = prompt("Link address (e.g. /trip/everest-base-camp-trek/ or https://…). Leave empty to remove.", prev ?? "");
    if (url === null) return;
    if (!url) c().extendMarkRange("link").unsetLink().run();
    else c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const youtube = () => {
    const url = prompt("YouTube link");
    if (url) c().setYoutubeVideo({ src: url }).run();
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-pine/[0.03] px-2 py-1.5" role="toolbar" aria-label="Formatting">
      {!minimal ? (
        <>
          <Btn on={s.h2} label="Heading" onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 /></Btn>
          <Btn on={s.h3} label="Sub-heading" onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 /></Btn>
          <Btn on={s.h4} label="Small heading" onClick={() => c().toggleHeading({ level: 4 }).run()}><Heading4 /></Btn>
          <Sep />
        </>
      ) : null}
      <Btn on={s.bold} label="Bold (Ctrl+B)" onClick={() => c().toggleBold().run()}><Bold /></Btn>
      <Btn on={s.italic} label="Italic (Ctrl+I)" onClick={() => c().toggleItalic().run()}><Italic /></Btn>
      <Btn on={s.underline} label="Underline (Ctrl+U)" onClick={() => c().toggleUnderline().run()}><Underline /></Btn>
      <Btn on={s.link} label="Link" onClick={link}><Link2 /></Btn>
      <Sep />
      <Btn on={s.bullet} label="Bullet list" onClick={() => c().toggleBulletList().run()}><List /></Btn>
      <Btn on={s.ordered} label="Numbered list" onClick={() => c().toggleOrderedList().run()}><ListOrdered /></Btn>
      <Btn on={s.quote} label="Quote" onClick={() => c().toggleBlockquote().run()}><Quote /></Btn>
      {!minimal ? (
        <>
          <Sep />
          <Btn label="Photo" onClick={onImage}><ImagePlus /></Btn>
          <Btn label="YouTube video" onClick={youtube}><YoutubeIcon /></Btn>
          <Btn on={s.table} label="Table" onClick={() => (s.table ? undefined : c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}><TableIcon /></Btn>
          <Btn label="Divider" onClick={() => c().setHorizontalRule().run()}><Minus /></Btn>
          {s.table ? (
            <span className="ml-1 flex flex-wrap gap-1 text-xs">
              {[
                ["+ row", () => c().addRowAfter().run()],
                ["+ column", () => c().addColumnAfter().run()],
                ["− row", () => c().deleteRow().run()],
                ["− column", () => c().deleteColumn().run()],
                ["Delete table", () => c().deleteTable().run()],
              ].map(([l, fn]) => (
                <button key={l as string} type="button" onClick={fn as () => void} className="rounded-md border border-line bg-card px-2 py-1 font-semibold hover:border-pine">{l as string}</button>
              ))}
            </span>
          ) : null}
        </>
      ) : null}
      <span className="ml-auto flex items-center gap-0.5">
        <Btn label="Undo (Ctrl+Z)" disabled={!s.undo} onClick={() => c().undo().run()}><Undo2 /></Btn>
        <Btn label="Redo" disabled={!s.redo} onClick={() => c().redo().run()}><Redo2 /></Btn>
        <Btn on={source} label={source ? "Back to the editor" : "Edit HTML"} onClick={() => setSource(!source)}><Code2 /></Btn>
      </span>
    </div>
  );
}

function Btn({ on, label, onClick, disabled, children }: { on?: boolean; label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn("grid size-8 place-items-center rounded-lg [&_svg]:size-4", on ? "bg-pine text-white" : "text-ink-soft hover:bg-pine/10 hover:text-pine", disabled && "opacity-30")}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-line" aria-hidden />;
