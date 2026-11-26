import type { Metadata } from "next";
import { Steps } from "@/components/home/Steps";
import { SupportLegend } from "@/components/tools/SupportLegend";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo";
import { tools } from "@/lib/tools/registry";

export const metadata: Metadata = pageMetadata({ title: "How It Works", description: "Convert files in three steps, right in your browser. See what happens to your file and the limits up front.", path: "/how-it-works" });

export default function HowItWorks() {
  const sizes = tools.map((t) => t.maxMB);
  return (
    <div className="shell">
      <PageHeader title="How it works">Three steps. No account, no software to install.</PageHeader>
      <Steps />
      <div className="mt-20 grid gap-10 md:grid-cols-2 md:gap-16">
        <section>
          <h2 className="text-2xl font-bold">What happens to your file</h2>
          <p className="mt-3 leading-relaxed text-muted">Your browser opens the file, converts it on your device and hands you the result. Nothing is uploaded. The first time you use a tool, the page downloads the converter it needs, which can take a few seconds on a slow connection.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold">Limits, up front</h2>
          <p className="mt-3 leading-relaxed text-muted">Each tool shows its file size limit before you start, from {Math.min(...sizes)} MB to {Math.max(...sizes)} MB. There's no daily limit. Very large files can still be too much for a phone; if that happens, we'll say so.</p>
        </section>
      </div>
      <section className="mt-16">
        <h2 className="mb-5 text-2xl font-bold">What the labels mean</h2>
        <SupportLegend />
      </section>
      <div className="mt-12"><ButtonLink href="/#convert" size="lg">Convert a file</ButtonLink></div>
    </div>
  );
}
