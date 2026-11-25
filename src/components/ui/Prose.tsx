import type { ReactNode } from "react";

export const Prose = ({ children }: { children: ReactNode }) => (
  <div className="max-w-[65ch] space-y-4 leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-primary-ink [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div>
);
