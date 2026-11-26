"use client";

import { useMemo, useState } from "react";
import { TextInput } from "./TextInput";

const STOP = new Set("the a an and or but of to in on at for with by from is are was were be been it its this that these those as not no so if then than into about over under we you they he she i my our your their his her them us me".split(" "));

export function WordCounter() {
  const [text, setText] = useState("");
  const stats = useMemo(() => {
    const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
    const sentences = text.split(/[.!?।]+(?:\s|$)/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const freq = new Map<string, number>();
    for (const w of words) { const k = w.toLowerCase(); if (k.length > 2 && !STOP.has(k)) freq.set(k, (freq.get(k) ?? 0) + 1); }
    return {
      words: words.length,
      chars: [...text].length,
      noSpaces: [...text.replace(/\s/g, "")].length,
      sentences, paragraphs,
      read: Math.max(words.length ? 1 : 0, Math.round(words.length / 230)),
      speak: Math.max(words.length ? 1 : 0, Math.round(words.length / 130)),
      avg: sentences ? Math.round(words.length / sentences) : 0,
      top: [...freq].sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  }, [text]);
  const tiles: [string, string | number][] = [
    ["Words", stats.words.toLocaleString()], ["Characters", stats.chars.toLocaleString()], ["Without spaces", stats.noSpaces.toLocaleString()],
    ["Sentences", stats.sentences], ["Paragraphs", stats.paragraphs], ["Reading time", `${stats.read} min`], ["Speaking time", `${stats.speak} min`], ["Words per sentence", stats.avg],
  ];
  return (
    <div className="space-y-5">
      <TextInput value={text} onChange={setText} label="Your text" placeholder="Paste your essay, or open a .docx or .pdf file." rows={12} />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-surface p-4">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {stats.top.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Most used words</h2>
          <p className="mt-2 flex flex-wrap gap-2">
            {stats.top.map(([w, n]) => <span key={w} className="rounded-full bg-primary-soft px-3 py-1 text-sm text-primary-ink">{w} <span className="tabular-nums opacity-70">{n}</span></span>)}
          </p>
        </div>
      )}
    </div>
  );
}
