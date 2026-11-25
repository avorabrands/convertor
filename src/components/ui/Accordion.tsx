import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export interface AccordionItem { q: string; a: ReactNode }

/** Native <details>, so it works with the keyboard and without JavaScript. */
export function Accordion({ items, name }: { items: AccordionItem[]; name?: string }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {items.map((item) => (
        <details key={item.q} name={name} className="group">
          <summary className="flex list-none items-center justify-between gap-4 px-5 py-4.5 font-semibold -outline-offset-2 hover:text-primary-ink sm:px-6 [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
          </summary>
          <div className="max-w-[65ch] px-5 pb-5 leading-relaxed text-muted sm:px-6">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
