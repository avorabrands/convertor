import { SupportBadge } from "@/components/ui/SupportBadge";
import { supportLevels, type SupportLevel } from "@/lib/tools/types";

export const SupportLegend = () => (
  <ul className="grid gap-3 text-sm leading-relaxed text-muted lg:grid-cols-3 lg:gap-6">
    {(Object.keys(supportLevels) as SupportLevel[]).map((l) => (
      <li key={l} className="flex items-start gap-3"><SupportBadge level={l} /><span>{supportLevels[l].description}</span></li>
    ))}
  </ul>
);
