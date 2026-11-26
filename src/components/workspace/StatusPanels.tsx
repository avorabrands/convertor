"use client";

import { CircleCheck, Download, FileArchive, Info, LoaderCircle, RotateCcw, Share2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FileSheet } from "@/components/ui/FileSheet";
import { Progress } from "@/components/ui/Progress";
import type { OutputFile } from "@/lib/conversion";
import { extOf, formatBytes, saveBlob, toneFor } from "@/lib/files";
import { handOff } from "@/lib/handoff";
import { toolHref } from "@/config/site";
import { getTool } from "@/lib/tools/registry";

/** Moves focus to the new state so keyboard and screen reader users land on it. */
function FocusPanel({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ block: "nearest" }); }, []);
  return <div ref={ref} tabIndex={-1} className={`rounded-card border bg-surface p-5 shadow-card outline-none sm:p-7 ${className}`}>{children}</div>;
}

export function ProcessingPanel({ progress, message, count, onCancel }: { progress: number; message: string; count: number; onCancel: () => void }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-7">
      <div className="flex items-center gap-3">
        <LoaderCircle className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
        <p className="min-w-0 flex-1 truncate font-semibold" role="status">{message || "Getting started"}</p>
        <p className="text-lg font-semibold tabular-nums">{pct}%</p>
      </div>
      <Progress value={progress} label={count > 1 ? `Converting ${count} files` : "Converting"} className="mt-4" />
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">Keep this tab open until it's done.</p>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function SuccessPanel({ files, notes, isDemo, originalSize, failedCount, onReset, onEdit, onShare }: {
  files: OutputFile[]; notes: string[]; isDemo: boolean; originalSize?: number; failedCount: number;
  onReset: () => void; onEdit: () => void; onShare: () => void;
}) {
  const [zipping, setZipping] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const total = files.reduce((s, f) => s + f.blob.size, 0);
  const saved = originalSize && total < originalSize ? Math.round((1 - total / originalSize) * 100) : 0;
  const single = files.length === 1 ? files[0] : null;
  const shown = showAll ? files : files.slice(0, 6);

  const downloadAll = async () => {
    setZipping(true);
    try {
      const { packFiles } = await import("@/lib/conversion/engines/zip");
      saveBlob(await packFiles(files), "converted-files.zip");
    } finally { setZipping(false); }
  };

  return (
    <FocusPanel className={isDemo ? "border-line-strong" : "border-success/40"}>
      <div className="flex items-start gap-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${isDemo ? "bg-sunken text-muted" : "bg-success-soft text-success"}`}>
          {isDemo ? <Info className="size-6" aria-hidden /> : <CircleCheck className="size-6" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">{isDemo ? "Demo finished" : single ? "Your file is ready" : `${files.length} files are ready`}</h2>
          <p className="mt-0.5 text-[0.9375rem] break-words text-muted">
            {single ? `${single.name}, ${formatBytes(single.blob.size)}` : `${formatBytes(total)} in total`}
            {saved > 0 && !isDemo && <span className="font-semibold text-success"> ({saved}% smaller)</span>}
          </p>
        </div>
      </div>

      {failedCount > 0 && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm">{failedCount} {failedCount === 1 ? "file" : "files"} couldn't be converted. Details are below.</p>}
      {notes.length > 0 && (
        <ul className="mt-4 space-y-1.5 rounded-xl bg-violet-soft px-4 py-3 text-sm leading-relaxed">
          {notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {single ? (
          <Button size="lg" onClick={() => saveBlob(single.blob, single.name)}><Download className="size-5" aria-hidden />{isDemo ? "Download placeholder" : "Download"}</Button>
        ) : (
          <Button size="lg" onClick={downloadAll} disabled={zipping}><FileArchive className="size-5" aria-hidden />{zipping ? "Packing files" : "Download all (ZIP)"}</Button>
        )}
        <Button size="lg" variant="secondary" onClick={onReset}>Convert another file</Button>
      </div>

      {!single && (
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
          {shown.map((f, i) => (
            <li key={`${f.path ?? f.name}-${i}`} className="flex items-center gap-3 py-2 pr-2 pl-3">
              <FileSheet label={extOf(f.name).slice(0, 4).toUpperCase() || "FILE"} tone={toneFor(extOf(f.name))} size="sm" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]" title={f.path ?? f.name}>{f.path ?? f.name}</span>
              <span className="text-sm text-muted tabular-nums">{formatBytes(f.blob.size)}</span>
              <button type="button" aria-label={`Download ${f.name}`} onClick={() => saveBlob(f.blob, f.name)} className="grid size-10 place-items-center rounded-lg text-primary-ink hover:bg-primary-soft"><Download className="size-4.5" aria-hidden /></button>
            </li>
          ))}
          {files.length > 6 && (
            <li><button type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} className="w-full rounded-b-2xl py-3 text-sm font-semibold text-primary-ink hover:bg-primary-soft">{showAll ? "Show fewer" : `Show all ${files.length} files`}</button></li>
          )}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-x-2 gap-y-1 border-t border-line pt-4">
        <Button variant="ghost" size="sm" onClick={onShare}><Share2 className="size-4" aria-hidden />Share link</Button>
        <Button variant="ghost" size="sm" onClick={onEdit}><RotateCcw className="size-4" aria-hidden />Change settings</Button>
      </div>
    </FocusPanel>
  );
}

export function FailurePanel({ failures, partial, onRetry, onReset }: {
  failures: { name?: string; error: string; suggestTool?: string; files: File[] }[]; /** Other files in the batch succeeded. */ partial: boolean; onRetry: () => void; onReset: () => void;
}) {
  const first = failures[0];
  const suggestion = failures.length === 1 && first.suggestTool ? getTool(first.suggestTool) : undefined;
  return (
    <FocusPanel className="border-danger/40">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"><TriangleAlert className="size-6" aria-hidden /></span>
        <div className="min-w-0 flex-1" role="alert">
          <h2 className="text-xl font-semibold">{failures.length > 1 ? "These files weren't converted" : partial ? "One file wasn't converted" : "That didn't work"}</h2>
          <ul className="mt-1 space-y-2 leading-relaxed text-muted">
            {failures.map((f, i) => <li key={i}>{f.name && (partial || failures.length > 1) && <strong className="font-semibold break-words text-ink">{f.name}: </strong>}{f.error}</li>)}
          </ul>
          <p className="mt-2 text-sm text-muted">Your original {failures.length > 1 ? "files are" : "file is"} unchanged.</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {suggestion && <ButtonLink href={toolHref(suggestion.slug)} onClick={() => handOff(suggestion.slug, first.files)}>Open in {suggestion.name}</ButtonLink>}
        <Button variant={suggestion ? "secondary" : "primary"} onClick={onRetry}><RotateCcw className="size-4" aria-hidden />Try again</Button>
        {!partial && <Button variant="ghost" onClick={onReset}>Choose a different file</Button>}
      </div>
    </FocusPanel>
  );
}
