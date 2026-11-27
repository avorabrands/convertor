"use client";

import { ChevronDown, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { acceptAttr, acceptLabel } from "@/lib/files";
import { getTool } from "@/lib/tools/registry";
import { useConverter } from "@/hooks/useConverter";
import { ErrorList } from "./ErrorList";
import { FileRow } from "./FileRow";
import { OptionField, SelectField } from "./OptionField";
import { ShareModal } from "./ShareModal";
import { FailurePanel, ProcessingPanel, SuccessPanel } from "./StatusPanels";
import { UploadZone } from "./UploadZone";

/** Takes a slug because tool definitions hold functions, which can't cross from server to client. */
/** Pairs neighbouring half-width options, such as a size and its unit. */
function groupHalves<T extends { half?: boolean }>(list: T[]): T[][] {
  const out: T[][] = [];
  for (const o of list) {
    const last = out.at(-1);
    if (o.half && last?.length === 1 && last[0].half) last.push(o);
    else out.push([o]);
  }
  return out;
}

export function Workspace({ tool: slug }: { tool: string }) {
  const tool = getTool(slug)!;
  const c = useConverter(tool);
  const toast = useToast();
  const [sharing, setSharing] = useState(false);

  const count = c.items.length;
  const editable = c.phase === "ready";
  const visible = (tool.options ?? []).filter((o) => !o.showIf || o.showIf(c.options, c.output));
  const primary = visible.filter((o) => tool.primaryOptions?.includes(o.key));
  const advanced = visible.filter((o) => !tool.primaryOptions?.includes(o.key));
  const short = (tool.minFiles ?? 1) - count;

  const done = c.jobs.filter((j) => j.status === "done");
  const files = done.flatMap((j) => j.result!.files);
  const notes = [...new Set(done.flatMap((j) => j.result!.notes ?? []))];
  const isDemo = done.some((j) => j.result!.isDemo);
  const failures = tool.mode === "combine"
    ? c.combined.status === "failed" ? [{ error: c.combined.error!, suggestTool: c.combined.suggestTool, files: c.items.map((i) => i.file) }] : []
    : c.items.filter((i) => i.job.status === "failed").map((i) => ({ name: i.file.name, error: i.job.error!, suggestTool: i.job.suggestTool, files: [i.file] }));
  const reduces = tool.slug === "compress-pdf" || tool.slug === "file-size-reducer";
  const originalSize = reduces ? c.items.filter((i) => i.job.status === "done").reduce((s, i) => s + i.file.size, 0) : undefined;
  const active = c.jobs.find((j) => j.status === "working");

  const action = tool.action === "Convert"
    ? count > 1 ? `Convert ${count} files` : "Convert file"
    : tool.mode === "combine" && tool.slug === "merge-pdf" && count > 1 ? `Merge ${count} PDFs` : tool.action;

  return (
    <div className="space-y-5">
      <ErrorList errors={c.errors} onDismiss={c.clearErrors} />

      {c.phase === "empty" && (
        <UploadZone onFiles={c.addFiles} accept={acceptAttr(tool)} multiple={tool.multiple}
          label={tool.multiple ? "Choose files" : "Choose file"}
          guidance={<><strong className="font-semibold text-ink">{acceptLabel(tool)}</strong>, up to {tool.maxMB} MB each.{tool.minFiles ? ` Add at least ${tool.minFiles}.` : ""}</>} />
      )}

      {c.phase === "working" && (
        <ProcessingPanel progress={c.progress} message={active?.message ?? ""} count={c.jobs.length}
          onCancel={() => { c.cancel(); toast("Cancelled. Your files are still here."); }} />
      )}
      {c.phase === "finished" && done.length > 0 && (
        <SuccessPanel files={files} notes={notes} isDemo={isDemo} originalSize={originalSize} failedCount={failures.length}
          onReset={c.reset} onEdit={c.editSettings} onShare={() => setSharing(true)} />
      )}
      {c.phase === "finished" && failures.length > 0 && (
        <FailurePanel failures={failures} partial={done.length > 0} onReset={c.reset} onRetry={() => c.run()} />
      )}
      {c.phase === "finished" && done.length === 0 && (
        <Button variant="ghost" size="sm" onClick={c.editSettings}>Change settings</Button>
      )}

      {count > 0 && (
        <section aria-label="Your files">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <h2 className="font-semibold">{count} {count === 1 ? "file" : "files"}</h2>
            {tool.mode === "combine" && count > 1 && editable && <p className="text-sm text-muted">Combined from top to bottom</p>}
          </div>
          <ul className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
            {c.items.map((item, i) => (
              <FileRow key={item.id} item={item} locked={c.phase === "working" || (tool.mode === "combine" && c.phase === "finished" && done.length > 0)}
                onRemove={() => c.remove(item.id)}
                onRetry={tool.mode === "each" ? () => c.run(item.id) : undefined}
                onMove={tool.mode === "combine" && count > 1 ? (by) => c.move(item.id, by) : undefined}
                isFirst={i === 0} isLast={i === count - 1} />
            ))}
          </ul>
          {editable && tool.multiple && <div className="mt-3"><UploadZone compact label="Add more files" onFiles={c.addFiles} accept={acceptAttr(tool)} /></div>}
        </section>
      )}

      {editable && (
        <form className="space-y-5 rounded-card border border-line bg-surface p-5 shadow-card sm:p-7"
          onSubmit={(e) => { e.preventDefault(); if (short <= 0) void c.run(); }}>
          {tool.outputs.length > 1 && <SelectField label="Convert to" value={c.output} onChange={c.setOutput} choices={tool.outputs} />}
          {groupHalves(primary).map((g) => g.length > 1
            ? <div key={g[0].key} className="grid grid-cols-[2fr_1fr] gap-3">{g.map((o) => <OptionField key={o.key} option={o} value={c.options[o.key]} onChange={(v) => c.setOption(o.key, v)} />)}</div>
            : <OptionField key={g[0].key} option={g[0]} value={c.options[g[0].key]} onChange={(v) => c.setOption(g[0].key, v)} />)}
          {advanced.length > 0 && (
            <details className="group rounded-2xl border border-line">
              <summary className="flex list-none items-center justify-between px-4 py-3 text-sm font-semibold hover:text-primary-ink [&::-webkit-details-marker]:hidden">
                Advanced settings <ChevronDown className="size-4.5 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="grid gap-5 border-t border-line p-4 sm:grid-cols-2">
                {advanced.map((o) => <OptionField key={o.key} option={o} value={c.options[o.key]} onChange={(v) => c.setOption(o.key, v)} />)}
              </div>
            </details>
          )}
          <div>
            <Button type="submit" size="lg" className="w-full" disabled={short > 0}>{action}</Button>
            {short > 0 && <p className="mt-2 text-center text-sm text-muted">Add {short === 1 ? "one more PDF" : `${short} more PDFs`} to merge.</p>}
          </div>
        </form>
      )}

      <p className="flex items-start justify-center gap-2 text-sm text-muted">
        <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
        This tool runs on your device. Your files aren't uploaded, and they're cleared when you leave.
      </p>
      <ShareModal open={sharing} onClose={() => setSharing(false)} files={files} />
    </div>
  );
}
