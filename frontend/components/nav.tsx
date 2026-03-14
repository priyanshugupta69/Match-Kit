"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/resumes", label: "Resumes" },
  { href: "/job-descriptions", label: "Job Descriptions" },
  { href: "/match", label: "Match" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-[#f5f2ec] border-b border-[#d8d3c9]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm font-medium tracking-tight">
          match<span className="text-[#1a3cff]">kit</span>
        </Link>
        <div className="flex gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[13px] transition-colors ${
                pathname === l.href
                  ? "text-[#0f0e0d] font-medium"
                  : "text-[#7a7670] hover:text-[#0f0e0d]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
