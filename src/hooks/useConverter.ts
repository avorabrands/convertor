"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convert, ConversionError, type ConversionResult } from "@/lib/conversion";
import { validateFile } from "@/lib/files";
import { takeHandOff } from "@/lib/handoff";
import type { OptionValues, OptionValue, Tool } from "@/lib/tools/types";

export type JobStatus = "ready" | "queued" | "working" | "done" | "failed";
export interface Job {
  status: JobStatus; progress: number; message: string;
  result?: ConversionResult; error?: string; suggestTool?: string;
}
export interface Item { id: string; file: File; job: Job }

const idle: Job = { status: "ready", progress: 0, message: "" };
let nextId = 1;

/** Owns the queue and job state for one tool. Knows nothing about how conversions run. */
export function useConverter(tool: Tool) {
  const [items, setItems] = useState<Item[]>([]);
  const [combined, setCombined] = useState<Job>(idle);
  const [errors, setErrors] = useState<string[]>([]);
  const [output, setOutput] = useState(tool.outputs[0].value);
  const [options, setOptions] = useState<OptionValues>(() =>
    Object.fromEntries((tool.options ?? []).map((o) => [o.key, o.default])));
  const abort = useRef<AbortController | null>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  const addFiles = useCallback(async (files: File[]) => {
    const problems: string[] = [];
    let list = files;
    if (!tool.multiple && files.length > 1) {
      problems.push(`${tool.name} takes one file at a time, so we added the first one.`);
      list = files.slice(0, 1);
    }
    const good: Item[] = [];
    for (const file of list) {
      const same = (f: File) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified;
      if (tool.mode === "each" && (itemsRef.current.some((i) => same(i.file)) || good.some((i) => same(i.file)))) {
        problems.push(`"${file.name}" is already in the list.`);
        continue;
      }
      const problem = await validateFile(file, tool);
      if (problem) problems.push(problem);
      else good.push({ id: `f${nextId++}`, file, job: idle });
    }
    setErrors(problems);
    if (good.length) {
      setItems((prev) => (tool.multiple ? [...prev, ...good] : good));
      setCombined(idle);
    }
  }, [tool]);

  useEffect(() => {
    const handed = takeHandOff(tool.slug);
    if (handed.length) void addFiles(handed);
  }, [tool.slug, addFiles]);

  // Leaving the page stops work; files and results are then released with the page's memory.
  useEffect(() => () => abort.current?.abort(), []);

  const patch = (id: string, job: Partial<Job>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, job: { ...i.job, ...job } } : i)));

  const runJob = async (files: File[], controller: AbortController, update: (j: Partial<Job>) => void) => {
    update({ status: "working", progress: 0, message: tool.statuses[0], error: undefined, result: undefined, suggestTool: undefined });
    try {
      const result = await convert({ toolSlug: tool.slug, files, output, options }, {
        signal: controller.signal,
        onProgress: (value, message) => { if (!controller.signal.aborted) update({ progress: value, ...(message ? { message } : {}) }); },
      });
      update({ status: "done", progress: 1, result });
    } catch (e) {
      if (controller.signal.aborted) update(idle);
      else update({ status: "failed", error: (e as Error).message, suggestTool: e instanceof ConversionError ? e.suggestTool : undefined });
    }
  };

  const run = async (only?: string) => {
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    setErrors([]);
    try {
      if (tool.mode === "combine") {
        await runJob(itemsRef.current.map((i) => i.file), controller, (j) => setCombined((prev) => ({ ...prev, ...j })));
        return;
      }
      const queue = itemsRef.current.filter((i) => (only ? i.id === only : i.job.status !== "done"));
      queue.forEach((i) => patch(i.id, { status: "queued", error: undefined }));
      for (const item of queue) {
        if (controller.signal.aborted) break;
        await runJob([item.file], controller, (j) => patch(item.id, j));
      }
      if (controller.signal.aborted) {
        setItems((prev) => prev.map((i) => (i.job.status === "queued" || i.job.status === "working" ? { ...i, job: idle } : i)));
      }
    } finally {
      abort.current = null;
    }
  };

  const cancel = () => abort.current?.abort();
  const remove = (id: string) => { setItems((p) => p.filter((i) => i.id !== id)); setCombined(idle); };
  const move = (id: string, by: -1 | 1) => setItems((prev) => {
    const from = prev.findIndex((i) => i.id === id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= prev.length) return prev;
    const next = [...prev];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });
  const reset = () => { cancel(); setItems([]); setCombined(idle); setErrors([]); };
  /** Keeps the files, clears the results. */
  const editSettings = () => { setItems((p) => p.map((i) => ({ ...i, job: idle }))); setCombined(idle); };
  const setOption = (key: string, value: OptionValue) => setOptions((p) => ({ ...p, [key]: value }));

  const jobs = useMemo(() => (tool.mode === "combine" ? (items.length ? [combined] : []) : items.map((i) => i.job)), [tool.mode, items, combined]);
  const working = jobs.some((j) => j.status === "working" || j.status === "queued");
  const finished = !working && jobs.some((j) => j.status === "done" || j.status === "failed");
  const progress = jobs.length ? jobs.reduce((s, j) => s + (j.status === "done" || j.status === "failed" ? 1 : j.progress), 0) / jobs.length : 0;
  const phase: "empty" | "ready" | "working" | "finished" =
    !items.length ? "empty" : working ? "working" : finished ? "finished" : "ready";

  return {
    items, combined, jobs, errors, output, options, phase, progress,
    addFiles, remove, move, run, cancel, reset, editSettings, setOutput, setOption,
    clearErrors: () => setErrors([]),
  };
}
