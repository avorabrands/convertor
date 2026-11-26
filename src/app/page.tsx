import { ArrowRight, FileCheck2, Lock, ScanText, Shrink, Stamp, Trash2 } from "lucide-react";
import Link from "next/link";
import { faq } from "@/components/home/faq";
import { HeroConverter } from "@/components/home/HeroConverter";
import { Steps } from "@/components/home/Steps";
import { SupportLegend } from "@/components/tools/SupportLegend";
import { ToolGrid } from "@/components/tools/ToolCard";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { quickTools, tools } from "@/lib/tools/registry";

const utilities = [
  { icon: FileCheck2, title: "Submit in the required format", text: "Convert assignments and slides to PDF, DOCX and more, so the portal accepts them the first time.", href: "/word-to-pdf", link: "Word to PDF" },
  { icon: ScanText, title: "Make scanned notes searchable", text: "OCR handwritten or printed notes into editable text. Clear print gives the best results.", href: "/image-to-text", link: "Read text with OCR" },
  { icon: Shrink, title: "Shrink files before uploading", text: "Compress large PDFs, slides and media for learning portals with tight limits.", href: "/file-size-reducer", link: "Reduce file size" },
];

const trust = [
  { icon: Lock, title: "Files are encrypted during transfer.", text: "Today's tools run on your device, so there's no transfer at all. Anything that ever needs a server will use an encrypted connection." },
  { icon: Trash2, title: "Files are automatically removed after processing.", text: "They're cleared from memory when you leave the page." },
  { icon: Stamp, title: "No watermark on standard conversions.", text: "Your work looks like your work." },
];

export default function Home() {
  return (
    <>
      <section id="convert" className="shell pt-12 sm:pt-16">
        <div className="mx-auto mb-9 max-w-3xl text-center">
          <h1 className="text-[2.125rem] leading-[1.08] font-bold sm:text-[3.5rem]">Convert your study files, without the hassle.</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted">Turn PDFs, documents, images, slides, audio, and more into the format you need—in a few clicks.</p>
        </div>
        <HeroConverter />
      </section>

      <section className="shell mt-20 sm:mt-28" aria-labelledby="quick">
        <h2 id="quick" className="text-3xl font-bold">Pick a tool</h2>
        <div className="mt-4 mb-7"><SupportLegend /></div>
        <ToolGrid tools={quickTools} />
        <div className="mt-7 text-center"><ButtonLink href="/tools" variant="secondary">View all {tools.length} tools<ArrowRight className="size-4" aria-hidden /></ButtonLink></div>
      </section>

      <section className="shell mt-20 sm:mt-28" aria-labelledby="student">
        <h2 id="student" className="max-w-lg text-3xl font-bold">Built for deadlines, notes, and group projects.</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {utilities.map((u) => (
            <li key={u.title} className="flex flex-col rounded-card bg-violet-soft p-6 sm:p-7">
              <u.icon className="size-7 text-violet-ink" aria-hidden />
              <h3 className="mt-5 text-lg font-semibold">{u.title}</h3>
              <p className="mt-2 mb-5 leading-relaxed text-muted">{u.text}</p>
              <Link href={u.href} className="mt-auto inline-flex items-center gap-1.5 self-start rounded-md py-1.5 font-semibold text-violet-ink underline-offset-4 hover:underline">{u.link}<ArrowRight className="size-4" aria-hidden /></Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell mt-20 sm:mt-28" aria-labelledby="trust">
        <div className="grid gap-10 rounded-[20px] border border-line bg-surface p-7 shadow-card sm:p-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
          <div>
            <h2 id="trust" className="text-3xl font-bold">Your files stay yours.</h2>
            <Link href="/privacy" className="mt-5 inline-flex items-center gap-1.5 rounded-md py-1.5 font-semibold text-primary-ink underline underline-offset-4">Read our privacy approach<ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <ul className="space-y-6">
            {trust.map((t) => (
              <li key={t.title} className="flex gap-4">
                <t.icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
                <div><h3 className="font-semibold">{t.title}</h3><p className="mt-0.5 leading-relaxed text-muted">{t.text}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell mt-20 sm:mt-28" aria-labelledby="how">
        <h2 id="how" className="mb-9 text-3xl font-bold">How it works</h2>
        <Steps />
      </section>

      <section id="faq" className="shell mt-20 sm:mt-28" aria-labelledby="faq-title">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <h2 id="faq-title" className="text-3xl font-bold">Frequently asked questions</h2>
          <Accordion items={faq} name="faq" />
        </div>
      </section>
    </>
  );
}
