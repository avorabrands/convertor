import { Check, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolGrid } from "@/components/tools/ToolCard";
import { ToolGlyph } from "@/components/tools/ToolGlyph";
import { Accordion } from "@/components/ui/Accordion";
import { JsonLd } from "@/components/ui/JsonLd";
import { SupportBadge } from "@/components/ui/SupportBadge";
import { Workspace } from "@/components/workspace/Workspace";
import { toolFaqs, toolJsonLd, toolMetadata, toolSteps } from "@/lib/seo";
import { content } from "@/lib/tools/content";
import { categories, getTool, tools } from "@/lib/tools/registry";
import { supportLevels } from "@/lib/tools/types";

const relatedLabel: Record<string, string> = { pdf: "PDF", documents: "document", images: "image", media: "audio and video", archives: "archive and file size" };

type Props = { params: Promise<{ tool: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => tools.map((t) => ({ tool: t.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).tool);
  return tool ? toolMetadata(tool) : {};
}

export default async function ToolPage({ params }: Props) {
  const tool = getTool((await params).tool);
  if (!tool) notFound();
  const c = content[tool.slug];
  const category = categories.find((x) => x.value === tool.category)!;
  const related = [
    ...tools.filter((t) => t !== tool && t.category === tool.category),
    ...tools.filter((t) => t !== tool && t.category !== tool.category && t.quick),
  ].slice(0, 3);

  return (
    <div className="shell pt-6 sm:pt-8">
      <JsonLd data={toolJsonLd(tool)} />
      <div className="mx-auto max-w-2xl">
        <nav aria-label="Breadcrumb">
          <Link href="/tools" className="-ml-1 inline-flex items-center gap-1 rounded-md py-2 pr-2 text-sm font-semibold text-muted hover:text-primary-ink"><ChevronLeft className="size-4.5" aria-hidden />All tools</Link>
        </nav>
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

      <div className="mx-auto mt-20 max-w-2xl space-y-14">
        <section aria-labelledby="about">
          <h2 id="about" className="text-2xl font-bold">{c.heading}</h2>
          <p className="mt-3 leading-relaxed text-muted">{c.intro}</p>
        </section>

        <section aria-labelledby="how">
          <h2 id="how" className="text-2xl font-bold">How to use {tool.name}</h2>
          <ol className="mt-5 space-y-4">
            {toolSteps(tool).map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-ink" aria-hidden>{i + 1}</span>
                <p className="pt-1 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="uses">
          <h2 id="uses" className="text-2xl font-bold">What students use it for</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {c.uses.map((u) => (
              <li key={u.title} className="rounded-card bg-violet-soft p-5">
                <Check className="size-5 text-violet-ink" aria-hidden />
                <h3 className="mt-3 font-semibold">{u.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{u.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="questions">
          <h2 id="questions" className="mb-5 text-2xl font-bold">{tool.name} questions</h2>
          <Accordion items={toolFaqs(tool)} name="tool-faq" />
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="mb-5 text-xl font-semibold">More free {relatedLabel[category.value]} tools</h2>
          <ToolGrid tools={related} />
        </section>
      )}
    </div>
  );
}
