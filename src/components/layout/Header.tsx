"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Modal } from "@/components/ui/Modal";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { href: "/#convert", label: "Convert" },
  { href: "/tools", label: "Tools" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/92 backdrop-blur">
      <div className="shell flex h-16 items-center gap-2">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname === n.href ? "page" : undefined}
              className={cn("rounded-lg px-3 py-2 text-[0.9375rem] font-medium hover:text-primary-ink", pathname === n.href ? "text-primary-ink" : "text-muted")}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="max-sm:hidden" onClick={() => setSignIn(true)}>Sign in</Button>
          <ButtonLink href="/#convert" size="sm" className="max-sm:hidden">Get started</ButtonLink>
          <button ref={menuButton} type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-xl hover:bg-primary-soft md:hidden">
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-line bg-canvas md:hidden">
          <div className="shell flex flex-col py-3">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg py-3 font-medium hover:text-primary-ink">{n.label}</Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-3 pb-2 sm:hidden">
              <Button variant="secondary" onClick={() => { setOpen(false); setSignIn(true); }}>Sign in</Button>
              <ButtonLink href="/#convert" onClick={() => setOpen(false)}>Get started</ButtonLink>
            </div>
          </div>
        </nav>
      )}
      <Modal open={signIn} onClose={() => setSignIn(false)} title="You don't need an account"
        description={`Every tool on ${site.name} works without signing in. Accounts aren't available yet.`}>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/#convert" onClick={() => setSignIn(false)}>Convert a file</ButtonLink>
          <Button variant="ghost" onClick={() => setSignIn(false)}>Close</Button>
        </div>
      </Modal>
    </header>
  );
}
