"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { OptionValue, ToolOption } from "@/lib/tools/types";

export const fieldClass = "h-11 w-full rounded-xl border border-control bg-surface px-3.5 text-[0.9375rem]";

export function SelectField({ label, value, onChange, choices, hint }: {
  label: string; value: string; onChange: (v: string) => void; choices: { value: string; label: string }[]; hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} appearance-none pr-10`}>
          {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
      </div>
      {hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function OptionField({ option: o, value, onChange }: { option: ToolOption; value: OptionValue; onChange: (v: OptionValue) => void }) {
  const id = useId();
  if (o.type === "select") return <SelectField label={o.label} value={String(value)} onChange={onChange} choices={o.choices} hint={o.hint} />;
  if (o.type === "toggle") {
    return (
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 accent-primary" />
        <span><span className="text-sm font-semibold">{o.label}</span>{o.hint && <span className="block text-sm text-muted">{o.hint}</span>}</span>
      </label>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex justify-between text-sm font-semibold">
        {o.label}{o.type === "range" && <span className="font-medium text-muted tabular-nums">{value}{o.unit}</span>}
      </label>
      {o.type === "range" ? (
        <input id={id} type="range" min={o.min} max={o.max} step={o.step} value={Number(value)} onChange={(e) => onChange(Number(e.target.value))} className="h-8 w-full accent-primary" />
      ) : (
        <input id={id} type="text" value={String(value)} placeholder={o.placeholder} onChange={(e) => onChange(e.target.value)}
          aria-describedby={o.hint ? `${id}-hint` : undefined} className={fieldClass} autoComplete="off" />
      )}
      {o.hint && <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">{o.hint}</p>}
    </div>
  );
}
