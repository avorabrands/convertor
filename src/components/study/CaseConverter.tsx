"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TextInput } from "./TextInput";

const SMALL = new Set("a an and as at but by for from in nor of on or per so the to up via vs with yet".split(" "));

const cases: { label: string; fn: (s: string) => string }[] = [
  { label: "Sentence case", fn: (s) => s.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (m) => m.toUpperCase()).replace(/\bi\b/g, "I") },
  { label: "Title Case", fn: (s) => s.toLowerCase().replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (w, i: number) => (i > 0 && SMALL.has(w) && !/[:.!?]\s*$/.test(s.slice(0, i)) ? w : w[0].toUpperCase() + w.slice(1))) },
  { label: "UPPERCASE", fn: (s) => s.toUpperCase() },
  { label: "lowercase", fn: (s) => s.toLowerCase() },
  { label: "Capitalise Each Word", fn: (s) => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) },
];

export function CaseConverter() {
  const [text, setText] = useState("");
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast("Copied.", "success"); }
    catch { toast("Your browser blocked copying. Select the text and copy it yourself.", "error"); }
  };
  return (
    <div className="space-y-4">
      <TextInput value={text} onChange={setText} label="Your text" placeholder="Type or paste text to change its capitals." rows={9} />
      <div role="group" aria-label="Change case" className="flex flex-wrap gap-2">
        {cases.map((c) => <Button key={c.label} variant="secondary" size="sm" disabled={!text} onClick={() => setText(c.fn(text))}>{c.label}</Button>)}
      </div>
      <Button onClick={copy} disabled={!text}><Copy className="size-4" aria-hidden />Copy text</Button>
    </div>
  );
}
