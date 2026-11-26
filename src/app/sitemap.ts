import type { MetadataRoute } from "next";
import { absoluteUrl, toolHref } from "@/config/site";
import { tools } from "@/lib/tools/registry";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") =>
    ({ url: absoluteUrl(path), lastModified: now, changeFrequency, priority });
  return [
    page("/", 1, "weekly"),
    page("/tools", 0.9, "weekly"),
    ...tools.map((t) => page(toolHref(t.slug), t.quick ? 0.9 : 0.7, "monthly")),
    page("/how-it-works", 0.5, "monthly"),
    page("/help", 0.5, "monthly"),
    page("/privacy", 0.3, "yearly"),
    page("/terms", 0.2, "yearly"),
  ];
}
