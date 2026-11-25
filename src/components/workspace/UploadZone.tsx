"use client";

import { Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Drag and drop plus file picker. The real control is the file input, so it works with any input method. */
export function UploadZone({
  onFiles, accept, multiple = true, guidance, visual, compact = false, label = "Choose files",
}: {
  onFiles: (files: File[]) => void; accept?: string; multiple?: boolean;
  guidance?: ReactNode; visual?: ReactNode; compact?: boolean; label?: string;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  // A near miss shouldn't make the browser open the file and lose the page.
  useEffect(() => {
    const block = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    addEventListener("dragover", block);
    addEventListener("drop", block);
    return () => { removeEventListener("dragover", block); removeEventListener("drop", block); };
  }, []);

  return (
    <div
      onDragEnter={(e) => { if (e.dataTransfer.types.includes("Files")) { depth.current++; setOver(true); } }}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        const files = [...e.dataTransfer.files];
        if (files.length) onFiles(files);
      }}
      className={cn(
        "relative flex rounded-card border-2 border-dashed transition-colors",
        over ? "border-primary bg-primary-soft" : "border-line-strong bg-sunken/60",
        compact ? "flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4" : "flex-col items-center px-5 py-9 text-center sm:py-11",
      )}
    >
      {visual && <div className={cn("mb-6", over && "pointer-events-none")}>{visual}</div>}
      <input id={id} type="file" multiple={multiple} accept={accept} className="peer sr-only"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(files);
        }} />
      <label htmlFor={id}
        className={cn(buttonClass(compact ? "secondary" : "primary", compact ? "sm" : "lg"), "cursor-pointer peer-focus-visible:outline-[2.5px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary")}>
        <Upload className={compact ? "size-4" : "size-5"} aria-hidden />
        {label}
      </label>
      <p className={cn("text-muted", compact ? "text-sm" : "mt-3 text-[0.9375rem]")}>{over ? "Drop to add" : "or drop files here"}</p>
      {guidance && !compact && <div className="mt-4 max-w-md text-sm leading-relaxed text-muted">{guidance}</div>}
    </div>
  );
}
