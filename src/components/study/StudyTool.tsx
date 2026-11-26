"use client";

import { ShieldCheck } from "lucide-react";
import { CaseConverter } from "./CaseConverter";
import { CitationGenerator } from "./CitationGenerator";
import { QrGenerator } from "./QrGenerator";
import { WordCounter } from "./WordCounter";

const tools: Record<string, () => React.JSX.Element> = {
  "word-counter": WordCounter,
  "citation-generator": CitationGenerator,
  "case-converter": CaseConverter,
  "qr-code-generator": QrGenerator,
};

export function StudyTool({ slug }: { slug: string }) {
  const Tool = tools[slug];
  return (
    <div className="space-y-5">
      {Tool ? <Tool /> : null}
      <p className="flex items-start justify-center gap-2 text-sm text-muted">
        <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
        Everything happens on your device. Nothing you type is uploaded.
      </p>
    </div>
  );
}
