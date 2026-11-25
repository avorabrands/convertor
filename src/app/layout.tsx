import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { themeScript } from "@/components/layout/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { site } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${site.name}: free file converter for students`, template: `%s | ${site.name}` },
  description: site.description,
};
export const viewport: Viewport = { themeColor: "#f8f8f5" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
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
