import type { ReactNode } from "react";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl pt-12 pb-10 sm:pt-16">
      <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
      {children && <p className="mt-4 text-lg leading-relaxed text-muted">{children}</p>}
    </div>
  );
}
