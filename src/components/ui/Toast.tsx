"use client";

import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "error";
interface Toast { id: number; tone: Tone; text: string }

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastContext);

const icons = { info: Info, success: CircleCheck, error: TriangleAlert };
const tones = { info: "text-primary", success: "text-success", error: "text-danger" };
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((text: string, tone: Tone = "info") => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => dismiss(id), tone === "error" ? 9000 : 5000);
  }, [dismiss]);
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} className="toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-lift">
              <Icon className={cn("mt-0.5 size-5 shrink-0", tones[t.tone])} aria-hidden />
              <p className="flex-1 text-sm leading-relaxed">{t.text}</p>
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="-m-2 grid size-9 place-items-center rounded-lg text-muted hover:text-ink">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
