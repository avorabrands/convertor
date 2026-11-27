import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Social } from "./Social";
import { site } from "@/config/site";

const links = [
  { href: "/tools", label: "All tools" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/help", label: "Help center" },
  { href: "/help#contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="shell grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-muted">Free file converter tools for students, by <a href={site.company.url} className="font-semibold text-primary-ink underline-offset-4 hover:underline">{site.company.name}</a>.</p>
          <div className="mt-4"><Social /></div>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
          {links.map((l) => <Link key={l.href} href={l.href} className="py-2 text-[0.9375rem] font-medium text-muted hover:text-primary-ink">{l.label}</Link>)}
        </nav>
        <p className="text-sm text-muted md:col-span-2">{site.footerNote}</p>
      </div>
    </footer>
  );
}
