"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme !== "dark";
    if (dark) root.dataset.theme = "dark";
    else delete root.dataset.theme;
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch { /* private mode */ }
  };
  return (
    <button type="button" onClick={toggle} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-primary-soft hover:text-primary-ink" aria-label="Switch between light and dark mode" title="Light or dark mode">
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun className="hidden size-5 dark:block" aria-hidden />
    </button>
  );
}
