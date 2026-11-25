import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SupportBadge } from "@/components/ui/SupportBadge";
import type { Tool } from "@/lib/tools/types";
import { ToolGlyph } from "./ToolGlyph";

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link href={`/convert/${tool.slug}`}
      className="group grid grid-cols-[auto_1fr] gap-x-4 rounded-card border border-line bg-surface p-4 shadow-card transition-[box-shadow,border-color] duration-200 hover:border-primary hover:shadow-lift sm:flex sm:flex-col sm:p-5">
      <span className="row-span-2 sm:flex sm:items-start sm:justify-between">
        <ToolGlyph tool={tool} />
        <SupportBadge level={tool.support} className="max-sm:hidden" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:mt-4">
          <span className="font-semibold">{tool.name}</span>
          <SupportBadge level={tool.support} className="sm:hidden" />
        </span>
        <span className="mt-1 block text-[0.9375rem] leading-snug text-muted">{tool.summary}</span>
      </span>
      <span className="col-start-2 mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-ink sm:mt-auto sm:pt-4">
        Start <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
      </span>
    </Link>
  );
}

export const ToolGrid = ({ tools }: { tools: Tool[] }) => (
  <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
    {tools.map((t) => <li key={t.slug} className="grid"><ToolCard tool={t} /></li>)}
  </ul>
);
