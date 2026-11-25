import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type SheetTone = "indigo" | "violet" | "navy" | "slate";

const tones: Record<SheetTone, string> = {
  indigo: "text-primary",
  violet: "text-violet",
  navy: "text-ink",
  slate: "text-control",
};

const sizes = { sm: "h-9 w-7.5", md: "h-12 w-10", glyph: "h-11 w-9", lg: "h-17 w-14" };

/** A sheet of paper with a folded corner and a format label. The product's one recurring mark. */
export function FileSheet({
  label, icon: Icon, tone = "indigo", size = "md", className,
}: { label?: string; icon?: LucideIcon; tone?: SheetTone; size?: keyof typeof sizes; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-block", sizes[size], tones[tone], className)}>
      <svg viewBox="0 0 40 48" className="absolute inset-0 size-full">
        <path d="M6 1h20l13 13v28a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V6a5 5 0 0 1 5-5Z" fill="var(--surface)" />
        <path d="M6 1h20l13 13v28a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V6a5 5 0 0 1 5-5Z" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.5" />
        <path d="M26 1v9a4 4 0 0 0 4 4h9" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.5" strokeLinejoin="round" />
        {label && (
          <text x="20" y="35" textAnchor="middle" fontSize={label.length > 4 ? 8.5 : label.length > 3 ? 10 : 11.5} fontWeight="700" fill="currentColor" fontFamily="inherit">
            {label}
          </text>
        )}
      </svg>
      {Icon && <Icon className="absolute top-[42%] left-1/2 size-[46%] -translate-x-1/2" strokeWidth={2.1} />}
    </span>
  );
}
