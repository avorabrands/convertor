import { supportLevels, type SupportLevel } from "@/lib/tools/types";
import { cn } from "@/lib/cn";

const styles: Record<SupportLevel, string> = {
  full: "bg-primary-soft text-primary-ink",
  basic: "bg-violet-soft text-violet-ink",
  demo: "border border-dashed border-line-strong text-muted",
};

export function SupportBadge({ level, className }: { level: SupportLevel; className?: string }) {
  return (
    <span title={supportLevels[level].description} className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap", styles[level], className)}>
      {supportLevels[level].label}
    </span>
  );
}
