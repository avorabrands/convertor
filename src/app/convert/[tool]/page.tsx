import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolGrid } from "@/components/tools/ToolCard";
import { ToolGlyph } from "@/components/tools/ToolGlyph";
import { SupportBadge } from "@/components/ui/SupportBadge";
import { Workspace } from "@/components/workspace/Workspace";
import { categories, getTool, tools } from "@/lib/tools/registry";
import { supportLevels } from "@/lib/tools/types";

type Props = { params: Promise<{ tool: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => tools.map((t) => ({ tool: t.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).tool);
  return tool ? { title: tool.name, description: tool.summary } : {};
}

export default async function ConvertPage({ params }: Props) {
  const tool = getTool((await params).tool);
  if (!tool) notFound();
  const category = categories.find((c) => c.value === tool.category)!;
  const related = tools.filter((t) => t !== tool && t.category === tool.category).slice(0, 3);

  return (
    <div className="shell pt-6 sm:pt-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/tools" className="-ml-1 inline-flex items-center gap-1 rounded-md py-2 pr-2 text-sm font-semibold text-muted hover:text-primary-ink"><ChevronLeft className="size-4.5" aria-hidden />All tools</Link>
        <div className="mt-4 mb-7 flex items-start gap-4">
          <ToolGlyph tool={tool} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-3xl font-bold sm:text-4xl">{tool.name}</h1>
              <SupportBadge level={tool.support} />
            </div>
            <p className="mt-2 text-lg text-muted">{tool.summary}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{tool.supportNote ?? supportLevels[tool.support].description}</p>
          </div>
        </div>
        <Workspace key={tool.slug} tool={tool.slug} />
      </div>
      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="mb-5 text-xl font-semibold">More {category.label === "PDF" ? "PDF" : category.label.toLowerCase()} tools</h2>
          <ToolGrid tools={related} />
        </section>
      )}
    </div>
  );
}
