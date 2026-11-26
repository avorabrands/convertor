import Link from "next/link";
import type { AccordionItem } from "@/components/ui/Accordion";
import { site } from "@/config/site";

const link = "font-semibold text-primary-ink underline underline-offset-4";

export const faq: AccordionItem[] = [
  { q: "Which file formats can I convert?", a: <>PDF, Word, PowerPoint, Excel, CSV, JPG, PNG, WebP, iPhone HEIC, MP3, WAV, M4A, MP4, MOV, WebM and ZIP. There are also study tools: a word counter, citation generator, case converter and QR code maker. The <Link href="/tools" className={link}>tools page</Link> marks each tool as full support, basic layout or demo.</> },
  { q: `Is ${site.name} free for students?`, a: "Yes. Every tool here is free, without an account or a watermark. The only limit is the file size shown on each tool." },
  { q: "How long are my files stored?", a: <>They aren't stored. Conversions run in your browser, and your files are cleared when you leave the page or close the tab. Read <Link href="/privacy" className={link}>our privacy approach</Link>.</> },
  { q: "Can I convert several files at once?", a: "Yes. Add as many as you need, and they convert one after another. When they're done, download them one by one or all together as a ZIP." },
  { q: "Does it work on mobile?", a: "Yes, in a current version of Chrome, Safari, Firefox or Edge. Large PDFs and long recordings are faster on a laptop, because the work happens on your device." },
  { q: "Will my document formatting stay intact?", a: "It depends on the tool. Merging, splitting and compressing PDFs keeps the layout. PPT to PDF keeps your slide layout, apart from animations and some effects. Word to PDF, PDF to Word and Excel to PDF keep text, headings and tables, but simplify complex layouts. Always check the result before you submit it." },
];
