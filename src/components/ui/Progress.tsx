import { cn } from "@/lib/cn";

export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-full bg-primary-soft", className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${pct}%` }} />
    </div>
  );
}
