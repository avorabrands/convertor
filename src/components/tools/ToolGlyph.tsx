import { Combine, RotateCw, ScanText, Scissors, Shrink, PackageOpen, type LucideIcon } from "lucide-react";
import { FileSheet } from "@/components/ui/FileSheet";
import type { Tool } from "@/lib/tools/types";

const actions = {
  "merge-pdf": Combine, "split-pdf": Scissors, "compress-pdf": Shrink, "file-size-reducer": Shrink,
  "rotate-pdf": RotateCw, "zip-extractor": PackageOpen, ocr: ScanText,
} as const;

/** The format you bring, and in front of it, the format (or action) you get. */
export function ToolGlyph({ tool }: { tool: Tool }) {
  const { from, to, tone = "indigo" } = tool.glyph;
  const icon = (actions as Record<string, LucideIcon | undefined>)[tool.slug];
  return (
    <span aria-hidden className="relative inline-block h-13 w-18 shrink-0">
      <span className="absolute top-0 left-0 flex opacity-80"><FileSheet label={from} tone="slate" size="glyph" /></span>
      <span className="absolute top-1.5 left-8.5 flex transition-transform duration-200 group-hover:translate-x-0.5"><FileSheet label={icon ? undefined : to} icon={icon} tone={tone} size="glyph" /></span>
    </span>
  );
}
