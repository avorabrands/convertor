import type { Metadata } from "next";
import { SupportLegend } from "@/components/tools/SupportLegend";
import { ToolDirectory } from "@/components/tools/ToolDirectory";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "All tools", description: "Every converter, with what it fully supports." };

export default function ToolsPage() {
  return (
    <div className="shell">
      <PageHeader title="All tools">Find the right converter by name, format or what you need to do.</PageHeader>
      <div className="mb-8"><SupportLegend /></div>
      <ToolDirectory />
    </div>
  );
}
