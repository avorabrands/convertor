import { ArrowDownToLine, ListChecks, Upload } from "lucide-react";

export const steps = [
  { icon: Upload, title: "Upload your file", text: "Choose it from your device or drop it on the page." },
  { icon: ListChecks, title: "Choose a format or tool", text: "We only show tools that work with your file." },
  { icon: ArrowDownToLine, title: "Download and keep studying", text: "Save one file, or all of them as a ZIP." },
];

export const Steps = () => (
  <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
    {steps.map((s, i) => (
      <li key={s.title} className="flex gap-4 md:block">
        <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
          <s.icon className="size-6" aria-hidden />
          <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-xs font-bold text-canvas" aria-hidden>{i + 1}</span>
        </span>
        <div>
          <h3 className="text-lg font-semibold md:mt-5">{s.title}</h3>
          <p className="mt-1 leading-relaxed text-muted">{s.text}</p>
        </div>
      </li>
    ))}
  </ol>
);
