"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { categories, tools } from "@/lib/tools/registry";
import type { Category } from "@/lib/tools/types";
import { ToolGrid } from "./ToolCard";

export function ToolDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const found = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w && w !== "to");
    return tools.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      const text = [t.name, t.summary, t.keywords, ...t.accept, ...t.outputs.map((o) => o.label)].join(" ").toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [query, category]);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-sm">
          <span className="sr-only">Search tools</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, for example “docx” or “scan”"
            className="h-12 w-full rounded-xl border border-control bg-surface pr-4 pl-12 placeholder:text-muted" />
        </label>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {[{ value: "all" as const, label: "All" }, ...categories].map((c) => (
            <button key={c.value} type="button" aria-pressed={category === c.value} onClick={() => setCategory(c.value)}
              className={cn("h-10 rounded-full border px-4 text-sm font-semibold transition-colors", category === c.value ? "border-primary bg-primary text-on-primary" : "border-line-strong bg-surface hover:border-primary hover:text-primary-ink")}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <p role="status" className="mt-6 mb-4 text-sm text-muted">{found.length} {found.length === 1 ? "tool" : "tools"}</p>
      {found.length ? <ToolGrid tools={found} /> : (
        <div className="rounded-card border border-dashed border-line-strong p-10 text-center">
          <p className="font-semibold">No tools match “{query}”</p>
          <p className="mt-1 text-muted">Try a format name like PDF, MP3 or XLSX.</p>
          <Button variant="secondary" className="mt-5" onClick={() => { setQuery(""); setCategory("all"); }}>Show all tools</Button>
        </div>
      )}
    </>
  );
}
