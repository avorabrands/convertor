"use client";

import { TriangleAlert, X } from "lucide-react";

export function ErrorList({ errors, onDismiss }: { errors: string[]; onDismiss: () => void }) {
  return (
    <div role="alert">
      {errors.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-danger-soft p-4 text-left text-[0.9375rem] leading-relaxed">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <ul className="min-w-0 flex-1 space-y-1.5 break-words">
            {errors.slice(0, 4).map((e) => <li key={e}>{e}</li>)}
            {errors.length > 4 && <li>And {errors.length - 4} more files with problems.</li>}
          </ul>
          <button type="button" aria-label="Dismiss" onClick={onDismiss} className="-m-2 grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:text-ink"><X className="size-4" aria-hidden /></button>
        </div>
      )}
    </div>
  );
}
