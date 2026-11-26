import { ogImage, ogSize } from "../og";
import { getTool, tools } from "@/lib/tools/registry";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Free converter for students";
export const generateStaticParams = () => tools.map((t) => ({ tool: t.slug }));

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  const tool = getTool((await params).tool)!;
  return ogImage({ title: `Free ${tool.name}`, from: tool.glyph.from, to: tool.glyph.to });
}
