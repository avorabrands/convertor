import type { Metadata } from "next";
import { faq } from "@/components/home/faq";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { PageHeader } from "@/components/ui/PageHeader";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Help Center", description: "Quick fixes for common conversion problems: locked PDFs, scans, old Office files, iPhone photos and more.", path: "/help" });

const fixes: AccordionItem[] = [
  { q: "My PDF is password protected", a: "Open it in your PDF reader with the password, then print or save it as a new PDF without one. Convert the new copy." },
  { q: "PDF to Word says there's no text", a: "Your PDF is probably a scan, so each page is a picture. Use Image to Text (OCR) first; it can save straight to Word." },
  { q: "My older .doc or .ppt file isn't accepted", a: "Open it in Word, PowerPoint or Google Docs and save it as .docx or .pptx. Those newer formats work here." },
  { q: "My iPhone photos won't open", a: "HEIC photos open in Safari but not in every browser. You can also set Settings > Camera > Formats to Most Compatible, so new photos save as JPG." },
  { q: "OCR got words wrong", a: "Take the photo straight on, in good light, with the text filling the frame. OCR reads English, and print is far more reliable than handwriting." },
  { q: "The page slows down or runs out of memory", a: "Your device does the work, so very large files can be too much. Close other tabs, convert fewer files at once, or split the PDF first." },
];

export default function Help() {
  return (
    <div className="shell">
      <PageHeader title="Help center">Quick fixes for the problems students run into most.</PageHeader>
      <div className="grid gap-12">
        <section aria-labelledby="fixes"><h2 id="fixes" className="mb-5 text-2xl font-bold">Fix a problem</h2><Accordion items={fixes} /></section>
        <section aria-labelledby="questions"><h2 id="questions" className="mb-5 text-2xl font-bold">Common questions</h2><Accordion items={faq} /></section>
        <section id="contact" aria-labelledby="contact-title" className="rounded-card bg-violet-soft p-6 sm:p-8">
          <h2 id="contact-title" className="text-2xl font-bold">Contact</h2>
          <p className="mt-2 max-w-[60ch] leading-relaxed text-muted">
            {site.contactEmail
              ? <>Still stuck? Email <a className="font-semibold text-violet-ink underline underline-offset-4" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> with the tool name and the message you saw. Please don't attach private files.</>
              : "We don't have a support inbox yet. Until then, the fixes above cover the most common problems."}
          </p>
        </section>
      </div>
    </div>
  );
}
