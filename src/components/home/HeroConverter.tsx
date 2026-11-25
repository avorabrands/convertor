"use client";

import { ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ToolGlyph } from "@/components/tools/ToolGlyph";
import { FileSheet } from "@/components/ui/FileSheet";
import { Modal } from "@/components/ui/Modal";
import { SupportBadge } from "@/components/ui/SupportBadge";
import { ErrorList } from "@/components/workspace/ErrorList";
import { UploadZone } from "@/components/workspace/UploadZone";
import { cn } from "@/lib/cn";
import { extOf, toneFor, unsupportedMessage } from "@/lib/files";
import { handOff } from "@/lib/handoff";
import { getTool, toolsForExtensions } from "@/lib/tools/registry";

const formats: { label: string; to: string; tools: string[] }[] = [
  { label: "PDF", to: "DOCX", tools: ["pdf-to-word", "pdf-to-jpg", "compress-pdf", "merge-pdf", "split-pdf"] },
  { label: "DOCX", to: "PDF", tools: ["word-to-pdf", "word-to-text", "file-size-reducer"] },
  { label: "PPTX", to: "PDF", tools: ["ppt-to-pdf", "file-size-reducer"] },
  { label: "JPG", to: "PDF", tools: ["jpg-to-pdf", "image-converter", "ocr"] },
  { label: "PNG", to: "JPG", tools: ["image-converter", "jpg-to-pdf", "ocr"] },
  { label: "XLSX", to: "CSV", tools: ["spreadsheet-converter", "excel-to-pdf", "file-size-reducer"] },
  { label: "MP3", to: "WAV", tools: ["audio-converter", "file-size-reducer"] },
  { label: "MP4", to: "MP3", tools: ["video-converter"] },
  { label: "ZIP", to: "FILES", tools: ["zip-extractor"] },
];

export function HeroConverter() {
  const router = useRouter();
  const [format, setFormat] = useState(formats[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const exts = [...new Set(files.map((f) => extOf(f.name)))];
  const options = files.length ? toolsForExtensions(files.length > 1 && exts.length === 1 ? [exts[0], exts[0]] : exts) : [];

  const receive = (list: File[]) => {
    const unknown = list.filter((f) => !toolsForExtensions([extOf(f.name)]).some((t) => !t.accept.includes("*")));
    setErrors(unknown.map((f) => unsupportedMessage(f.name)));
    const usable = list.filter((f) => !unknown.includes(f));
    if (usable.length) setFiles(usable);
  };
  const open = (slug: string) => {
    handOff(slug, files);
    setFiles([]);
    router.push(`/convert/${slug}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[20px] border border-line bg-surface p-3 shadow-lift sm:p-5">
        <UploadZone
          onFiles={receive}
          visual={
            <div aria-hidden className="flex items-center justify-center gap-4">
              <FileSheet label={format.label} tone="slate" size="lg" />
              <ArrowRight className="size-5 text-primary" />
              <span key={format.label} className="sheet-out flex"><FileSheet label={format.to} tone={toneFor(format.to.toLowerCase())} size="lg" /></span>
            </div>
          }
        />
        {errors.length > 0 && <div className="mt-3"><ErrorList errors={errors} onDismiss={() => setErrors([])} /></div>}
        <div className="px-1 pt-5 pb-1 sm:px-2">
          <div role="group" aria-label="See what each format converts to" className="flex flex-wrap justify-center gap-2">
            {formats.map((f) => (
              <button key={f.label} type="button" aria-pressed={f === format} onClick={() => setFormat(f)}
                className={cn("h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors", f === format ? "border-primary bg-primary-soft text-primary-ink" : "border-line-strong text-muted hover:border-primary hover:text-primary-ink")}>
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-3 flex min-h-12 flex-wrap items-center justify-center gap-x-1 text-sm text-muted sm:min-h-10" aria-live="polite">
            <span className="mr-1">{format.label} tools:</span>
            {format.tools.map((slug) => (
              <Link key={slug} href={`/convert/${slug}`} className="rounded-md px-2 py-1.5 font-semibold text-primary-ink underline-offset-4 hover:underline">{getTool(slug)!.name}</Link>
            ))}
          </p>
        </div>
      </div>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-[0.9375rem] text-muted">
        <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
        Your files are automatically deleted after conversion.
      </p>

      <Modal open={files.length > 0} onClose={() => setFiles([])} title="What do you want to do?"
        description={<span className="break-words">{files.length === 1 ? files[0].name : `${files.length} files selected`}</span>}>
        {errors.length > 0 && <div className="mb-4"><ErrorList errors={errors} onDismiss={() => setErrors([])} /></div>}
        {exts.length > 1 && !options.some((t) => !t.accept.includes("*")) && (
          <p className="mb-3 text-sm leading-relaxed text-muted">These are different file types. To convert them, add one type at a time.</p>
        )}
        <ul className="-mx-2">
          {options.map((t) => (
            <li key={t.slug}>
              <button type="button" onClick={() => open(t.slug)} className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-primary-soft">
                <ToolGlyph tool={t} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">{t.name}<SupportBadge level={t.support} /></span>
                  <span className="mt-0.5 block text-sm text-muted">{t.summary}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
