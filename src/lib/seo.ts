import type { Metadata } from "next";
import { absoluteUrl, site, toolHref } from "@/config/site";
import { acceptLabel } from "@/lib/files";
import { content } from "@/lib/tools/content";
import type { Tool } from "@/lib/tools/types";

/** Shared metadata for a page: canonical address, social cards and keywords. */
export function pageMetadata({ title, description, path, keywords, absoluteTitle }: {
  title: string; description: string; path: string; keywords?: string[]; absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = absoluteTitle ? title : `${title} | ${site.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: [...(keywords ?? []), "free tools for students", "free file converter", site.name],
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: fullTitle, description, siteName: site.name, locale: site.locale },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

export function toolMetadata(tool: Tool): Metadata {
  const c = content[tool.slug];
  return pageMetadata({ title: c.title, description: c.description, path: toolHref(tool.slug), keywords: c.keywords });
}

/** Questions every tool page answers, worded from the tool's real limits. */
export function toolFaqs(tool: Tool) {
  const c = content[tool.slug];
  const demoOnly = tool.support === "demo";
  return [
    ...c.faqs,
    {
      q: `Is the ${tool.name} tool free?`,
      a: `Yes. It's free for everyone, with no sign-up, no watermark and no daily limit. Each file can be up to ${tool.maxMB} MB.`,
    },
    {
      q: "Are my files uploaded anywhere?",
      a: demoOnly
        ? "No. Everything runs in your browser, and your files are cleared when you leave the page."
        : "No. The conversion runs in your browser, on your own device. Your files are never uploaded, and they're cleared when you leave the page.",
    },
    {
      q: "Does it work on my phone?",
      a: "Yes, in a current version of Chrome, Safari, Firefox or Edge. Very large files are quicker on a laptop.",
    },
  ];
}

export function toolSteps(tool: Tool) {
  const many = tool.multiple;
  const first = `Choose your ${acceptLabel(tool)} ${many ? "files" : "file"}, or drop ${many ? "them" : "it"} on the page.`;
  const middle = tool.mode === "combine" && many
    ? "Put the files in the order you want."
    : tool.outputs.length > 1
      ? `Pick the format you need: ${tool.outputs.map((o) => o.label.replace(/ \(.*\)$/, "")).join(", ")}.`
      : tool.options?.length ? "Change the settings if you need to. The defaults suit most files." : "Check that the right file is listed.";
  return [first, middle, `Click “${tool.action === "Convert" ? "Convert file" : tool.action}” and download your result.`];
}

type Json = Record<string, unknown>;

export function toolJsonLd(tool: Tool): Json[] {
  const c = content[tool.slug];
  const url = absoluteUrl(toolHref(tool.slug));
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${tool.name} by ${site.name}`,
      url,
      description: c.description,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any device with a modern web browser",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      publisher: { "@type": "Organization", name: site.company.name, url: site.company.url },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "All tools", item: absoluteUrl("/tools") },
        { "@type": "ListItem", position: 3, name: tool.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: toolFaqs(tool).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
}

export const siteJsonLd = (): Json[] => [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: absoluteUrl("/"),
    description: site.description,
    publisher: { "@type": "Organization", name: site.company.name, url: site.company.url },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.company.name,
    url: site.company.url,
  },
];
