import Link from "next/link";
import { site } from "@/config/site";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg text-lg font-bold tracking-tight">
      <svg viewBox="0 0 32 32" className="size-8 text-primary" aria-hidden>
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <g fill="var(--on-primary)">
          <path d="M8 8.500A1.500 1.500 0 0 1 9.500 7H15l3 3v9.500a1.500 1.500 0 0 1-1.500 1.500h-7A1.500 1.500 0 0 1 8 19.500z" opacity=".5" />
          <path d="M14 13.500a1.500 1.500 0 0 1 1.500-1.500H21l3 3v8.500a1.500 1.500 0 0 1-1.500 1.500h-7a1.500 1.500 0 0 1-1.500-1.500z" />
        </g>
      </svg>
      {site.name}
    </Link>
  );
}
