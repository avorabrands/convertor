"use client";

import { FileText } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { extOf } from "@/lib/files";

/** A large text box that also accepts .txt, .docx and .pdf files, read on this device. */
export function TextInput({ value, onChange, label, placeholder, rows = 10, files = true }: { value: string; onChange: (v: string) => void; label: string; placeholder: string; rows?: number; files?: boolean }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  const load = async (file: File) => {
    setError("");
    const ext = extOf(file.name);
    setBusy(true);
    try {
      if (ext === "txt" || ext === "md" || ext === "csv") onChange(await file.text());
      else if (ext === "docx") {
        const mammoth = (await import("mammoth/mammoth.browser.js")).default;
        onChange((await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim());
      } else if (ext === "pdf") {
        const { pdfPlainText } = await import("@/lib/conversion/engines/pdf-read");
        onChange((await pdfPlainText(file)).trim());
      } else setError("Use a .txt, .docx or .pdf file, or paste your text.");
    } catch {
      setError("We couldn't read that file. Try copying the text and pasting it here.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        {files && <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-soft has-[:focus-visible]:outline-[2.5px] has-[:focus-visible]:outline-primary">
          <FileText className="size-4" aria-hidden />{busy ? "Reading…" : "Open a file"}
          <input type="file" accept=".txt,.md,.docx,.pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void load(f); }} />
        </label>}
      </div>
      <textarea
        id={id} value={value} rows={rows} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void load(f); }}
        className={cn("w-full resize-y rounded-2xl border bg-surface p-4 text-[0.9375rem] leading-relaxed", over ? "border-primary bg-primary-soft" : "border-control")}
      />
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
