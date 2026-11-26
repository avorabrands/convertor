import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Privacy", description: "Your files stay on your device: what happens to them, in plain language.", path: "/privacy" });

export default function Privacy() {
  return (
    <div className="shell">
      <PageHeader title="Our privacy approach">Your coursework is your business. Here's what happens to it, in plain language.</PageHeader>
      <Prose>
        <h2 className="!mt-0">Your files</h2>
        <ul>
          <li><strong>They stay on your device.</strong> Every tool runs in your browser. Your files aren't uploaded.</li>
          <li><strong>They're cleared automatically.</strong> Files and results live in your browser's memory, and are gone when you leave the page or close the tab. Anything you download stays where you saved it.</li>
          <li><strong>Nothing is added.</strong> No watermark is placed on your converted files.</li>
        </ul>
        <h2>Transfers</h2>
        <p>The site downloads the converters it needs from its own address. It doesn't send your files anywhere. If a future tool needs a server, its page will say so before you add a file, the connection will be encrypted, and files will be deleted after processing.</p>
        <h2>Open-source software</h2>
        <p>The tools are built on open-source projects, including <a href="https://mozilla.github.io/pdf.js/">PDF.js</a>, <a href="https://pdf-lib.js.org/">pdf-lib</a>, <a href="https://tesseract.projectnaptha.com/">Tesseract</a>, <a href="https://github.com/exceljs/exceljs">ExcelJS</a> and <a href="https://sheetjs.com/">SheetJS</a>. Video tools use <a href="https://ffmpegwasm.netlify.app/">FFmpeg</a> (GPL), and iPhone photos are decoded with <a href="https://github.com/strukturag/libheif">libheif</a> (LGPL); their source code is available at those links.</p>
        <h2>What we keep</h2>
        <p>One thing, on your device: whether you chose light or dark mode. There are no accounts, no tracking and no advertising in this version. The company that hosts the site may keep standard access logs, such as your IP address and the pages you open.</p>
      </Prose>
    </div>
  );
}
