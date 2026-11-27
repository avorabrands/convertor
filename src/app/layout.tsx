import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { themeScript } from "@/components/layout/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { JsonLd } from "@/components/ui/JsonLd";
import { asset, site } from "@/config/site";
import { pageMetadata, siteJsonLd } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(`${site.url}/`),
  applicationName: site.name,
  authors: [{ name: site.company.name, url: site.company.url }],
  publisher: site.company.name,
  ...pageMetadata({
    title: `Free File Converter for Students: PDF, Word, PPT, JPG | ${site.name}`,
    description: site.description,
    path: "/",
    absoluteTitle: true,
    keywords: ["free file converter", "free online converter", "pdf converter for students", "free tools for students", "convert pdf to word", "ppt to pdf", "jpg to pdf"],
  }),
  title: { default: `Free File Converter for Students: PDF, Word, PPT, JPG | ${site.name}`, template: `%s | ${site.name}` },
  robots: { index: true, follow: true },
  // Search engines look for /favicon.ico and PNG sizes in multiples of 48 px; browsers can use the SVG.
  icons: {
    icon: [
      { url: asset("/favicon.ico"), sizes: "48x48" },
      { url: asset("/icons/icon.svg"), type: "image/svg+xml" },
      { url: asset("/icons/icon-96.png"), sizes: "96x96", type: "image/png" },
      { url: asset("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: { url: asset("/icons/apple-touch-icon.png"), sizes: "180x180" },
  },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: "#3d48d3" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd data={siteJsonLd()} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only z-50 rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
        <ToastProvider>
          <Header />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
