import type { Metadata } from "next";
import { SupportLegend } from "@/components/tools/SupportLegend";
import { ToolDirectory } from "@/components/tools/ToolDirectory";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "All Free Tools for Students: PDF, Word, PPT, Image, Audio",
  description: "Every free converter in one place: PDF to Word, Word to PDF, PPT to PDF, compress and merge PDF, image to text, and more. No sign-up, no uploads.",
  path: "/tools",
  keywords: ["free tools for students", "free online tools", "free pdf tools", "student converter tools"],
});

export default function ToolsPage() {
  return (
    <div className="shell">
      <PageHeader title="All free tools">Every converter is free for students, with no sign-up. Find one by name, format or what you need to do.</PageHeader>
      <div className="mb-8"><SupportLegend /></div>
      <ToolDirectory />
    </div>
  );
}
