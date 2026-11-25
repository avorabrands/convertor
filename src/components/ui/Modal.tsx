"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** Built on <dialog>: focus trapping, Escape and inert background come from the browser. */
export function Modal({
  open, onClose, title, description, children,
}: {
  open: boolean; onClose: () => void; title: string; description?: ReactNode; children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby={`${id}-title`}
      className="modal w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[20px] border border-line bg-surface p-0 text-ink shadow-lift"
    >
      {open && (
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${id}-title`} className="text-xl font-semibold">{title}</h2>
            <button
              type="button" onClick={onClose} aria-label="Close"
              className="-mt-2 -mr-2 grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-sunken hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {description && <div className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{description}</div>}
          {children && <div className="mt-5">{children}</div>}
        </div>
      )}
    </dialog>
  );
}
