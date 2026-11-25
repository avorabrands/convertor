"use client";

import { ArrowDown, ArrowUp, CircleCheck, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FileSheet } from "@/components/ui/FileSheet";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { extOf, formatBytes, toneFor } from "@/lib/files";
import type { Item } from "@/hooks/useConverter";

/** Page count helps students check they picked the right PDF. Undefined while loading. */
function usePageCount(file: File) {
  const isPdf = extOf(file.name) === "pdf";
  const [pages, setPages] = useState<number | null | undefined>(isPdf ? undefined : null);
  useEffect(() => {
    if (!isPdf) return;
    let alive = true;
    (async () => {
      try {
        const { openPdf } = await import("@/lib/conversion/engines/pdfjs");
        const doc = await openPdf(file);
        if (alive) setPages(doc.numPages);
        void doc.loadingTask.destroy();
      } catch {
        if (alive) setPages(null);
      }
    })();
    return () => { alive = false; };
  }, [file, isPdf]);
  return pages;
}

const PREVIEWABLE = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif"]);

/** Photos get a thumbnail, so students can put pages in the right order. */
function FileThumb({ file, ext }: { file: File; ext: string }) {
  const [url, setUrl] = useState<string>();
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const previewable = PREVIEWABLE.has(ext);
  useEffect(() => {
    if (!previewable) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file, previewable]);

  if (!previewable || state === "failed") {
    return <FileSheet label={ext.slice(0, 4).toUpperCase() || "FILE"} tone={toneFor(ext)} className="shrink-0" />;
  }
  return (
    <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-line">
      {state === "loading" && <Skeleton className="absolute inset-0" />}
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, nothing to optimise */}
      {url && <img src={url} alt="" onLoad={() => setState("ready")} onError={() => setState("failed")} className="size-full object-cover" />}
    </span>
  );
}

const iconButton = "grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

export function FileRow({
  item, locked, onRemove, onRetry, onMove, isFirst, isLast,
}: {
  item: Item; locked: boolean; onRemove: () => void; onRetry?: () => void;
  onMove?: (by: -1 | 1) => void; isFirst?: boolean; isLast?: boolean;
}) {
  const { file, job } = item;
  const ext = extOf(file.name);
  const pages = usePageCount(file);

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <FileThumb file={file} ext={ext} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={file.name}>{file.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
            <span>{formatBytes(file.size)}</span>
            {pages === undefined && <Skeleton className="h-3.5 w-14" />}
            {pages != null && <span>{pages} {pages === 1 ? "page" : "pages"}</span>}
            {job.status === "queued" && <span>Waiting</span>}
            {job.status === "done" && job.result?.isDemo && <span>Demo only</span>}
            {job.status === "done" && !job.result?.isDemo && <span className="inline-flex items-center gap-1 font-medium text-success"><CircleCheck className="size-4" aria-hidden />Done</span>}
            {job.status === "failed" && <span className="inline-flex items-center gap-1 font-medium text-danger"><TriangleAlert className="size-4" aria-hidden />Not converted</span>}
          </p>
        </div>
        {onMove && !locked && (
          <div className="flex">
            <button type="button" className={iconButton} aria-label={`Move ${file.name} up`} disabled={isFirst} onClick={() => onMove(-1)}><ArrowUp className="size-4.5" aria-hidden /></button>
            <button type="button" className={iconButton} aria-label={`Move ${file.name} down`} disabled={isLast} onClick={() => onMove(1)}><ArrowDown className="size-4.5" aria-hidden /></button>
          </div>
        )}
        {job.status === "failed" && onRetry && !locked && (
          <Button variant="secondary" size="sm" onClick={onRetry}><RotateCcw className="size-4" aria-hidden />Retry</Button>
        )}
        {!locked && <button type="button" className={cn(iconButton, "-mr-2")} aria-label={`Remove ${file.name}`} onClick={onRemove}><X className="size-5" aria-hidden /></button>}
      </div>
      {job.status === "working" && <Progress value={job.progress} label={`Converting ${file.name}`} className="mt-3 h-1.5" />}
    </li>
  );
}
