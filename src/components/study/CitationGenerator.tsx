"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { Fragment, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { fieldClass, SelectField } from "@/components/workspace/OptionField";
import { formatCitation, type Source, type SourceType, type Style } from "./citation";

const empty: Source = { type: "website", authors: "", title: "", year: "", month: "", day: "", container: "", publisher: "", volume: "", issue: "", pages: "", edition: "", url: "", accessed: "", place: "" };

/** Turns *italic* marks into elements, and into HTML for pasting into Word or Google Docs. */
const rich = (s: string): ReactNode[] => s.split(/(\*[^*]+\*)/).map((p, i) => (p.startsWith("*") && p.endsWith("*") ? <i key={i}>{p.slice(1, -1)}</i> : <Fragment key={i}>{p}</Fragment>));
const html = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!).replace(/\*([^*]+)\*/g, "<i>$1</i>");
const plain = (s: string) => s.replace(/\*([^*]+)\*/g, "$1");

function Field({ label, value, onChange, placeholder, hint, area }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; area?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {area
        ? <textarea id={id} rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} h-auto py-2.5`} />
        : <input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={fieldClass} autoComplete="off" />}
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function CitationGenerator() {
  const [style, setStyle] = useState<Style>("apa");
  const [src, setSrc] = useState<Source>(empty);
  const [list, setList] = useState<Source[]>([]);
  const toast = useToast();
  const set = (k: keyof Source) => (v: string) => setSrc((s) => ({ ...s, [k]: v }));

  // The reference list stays on this device between visits.
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem("citations") ?? "[]")); } catch { /* ignore */ } }, []);
  useEffect(() => { try { localStorage.setItem("citations", JSON.stringify(list)); } catch { /* private mode */ } }, [list]);

  const preview = useMemo(() => (src.title.trim() ? formatCitation(src, style) : ""), [src, style]);
  const all = useMemo(() => list.map((s) => formatCitation(s, style)).sort((a, b) => plain(a).localeCompare(plain(b))), [list, style]);

  const copy = async (items: string[]) => {
    try {
      const text = items.map(plain).join("\n");
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([items.map((i) => `<p>${html(i)}</p>`).join("")], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
      } else await navigator.clipboard.writeText(text);
      toast(items.length > 1 ? "Reference list copied, with italics." : "Reference copied, with italics.", "success");
    } catch {
      toast("Your browser blocked copying. Select the reference and copy it yourself.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-card border border-line bg-surface p-5 shadow-card sm:grid-cols-2 sm:p-6">
        <SelectField label="Style" value={style} onChange={(v) => setStyle(v as Style)} choices={[{ value: "apa", label: "APA 7th edition" }, { value: "mla", label: "MLA 9th edition" }, { value: "harvard", label: "Harvard" }]} />
        <SelectField label="Source type" value={src.type} onChange={(v) => setSrc((s) => ({ ...s, type: v as SourceType }))} choices={[{ value: "website", label: "Website or web page" }, { value: "book", label: "Book" }, { value: "journal", label: "Journal article" }]} />
        <div className="sm:col-span-2"><Field label="Authors" area value={src.authors} onChange={set("authors")} placeholder={"Asha Rao\nKumar, Ravi"} hint="One per line. Leave empty for organisations' web pages." /></div>
        <div className="sm:col-span-2"><Field label={src.type === "journal" ? "Article title" : src.type === "book" ? "Book title" : "Page title"} value={src.title} onChange={set("title")} /></div>
        <Field label="Year" value={src.year} onChange={set("year")} placeholder="2026" />
        {src.type === "website" && <div className="grid grid-cols-2 gap-3"><Field label="Month" value={src.month} onChange={set("month")} placeholder="3" /><Field label="Day" value={src.day} onChange={set("day")} placeholder="14" /></div>}
        {src.type === "book" && <Field label="Edition" value={src.edition} onChange={set("edition")} placeholder="2nd" />}
        {src.type === "journal" && <div className="grid grid-cols-3 gap-3"><Field label="Volume" value={src.volume} onChange={set("volume")} /><Field label="Issue" value={src.issue} onChange={set("issue")} /><Field label="Pages" value={src.pages} onChange={set("pages")} placeholder="12-30" /></div>}
        <Field label={src.type === "journal" ? "Journal" : src.type === "book" ? "Publisher" : "Website name"} value={src.type === "book" ? src.publisher : src.container} onChange={set(src.type === "book" ? "publisher" : "container")} />
        {src.type === "book" && style === "harvard" && <Field label="Place of publication" value={src.place} onChange={set("place")} placeholder="New Delhi" />}
        <Field label={src.type === "website" ? "URL" : "DOI or URL"} value={src.url} onChange={set("url")} placeholder={src.type === "website" ? "https://" : "10.1000/xyz123"} />
        {src.type === "website" && style !== "apa" && <Field label="Date you read it" value={src.accessed} onChange={set("accessed")} placeholder="Today" hint="Leave empty for today." />}
      </div>

      <section aria-live="polite" className="rounded-card border border-primary/40 bg-primary-soft/50 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-primary-ink">Your reference</h2>
        <p className="mt-2 min-h-12 pl-8 -indent-8 leading-relaxed">{preview ? rich(preview) : <span className="text-muted">Fill in a title to see it here.</span>}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button disabled={!preview} onClick={() => copy([preview])}><Copy className="size-4" aria-hidden />Copy</Button>
          <Button variant="secondary" disabled={!preview} onClick={() => { setList((l) => [...l, src]); setSrc({ ...empty, type: src.type }); toast("Added to your list."); }}><Plus className="size-4" aria-hidden />Add to list</Button>
        </div>
      </section>

      {all.length > 0 && (
        <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">{style === "mla" ? "Works cited" : "Reference list"} ({all.length})</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => copy(all)}><Copy className="size-4" aria-hidden />Copy all</Button>
              <Button size="sm" variant="danger" onClick={() => setList([])}><Trash2 className="size-4" aria-hidden />Clear</Button>
            </div>
          </div>
          <ol className="mt-4 space-y-3">{all.map((c, i) => <li key={i} className="pl-8 -indent-8 leading-relaxed">{rich(c)}</li>)}</ol>
          <p className="mt-4 text-sm text-muted">Sorted A to Z, as the styles require. Your list is saved in this browser only.</p>
        </section>
      )}
    </div>
  );
}
