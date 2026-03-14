"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredUser, isLoggedIn, logout, type AuthUser } from "@/lib/api";

const protectedLinks = [
  { href: "/resumes", label: "Resumes" },
  { href: "/job-descriptions", label: "Job Descriptions" },
  { href: "/match", label: "Match" },
];

export function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
  }, []);

  // Re-check user on route change
  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  const loggedIn = mounted && isLoggedIn();

  return (
    <nav className="sticky top-0 z-50 bg-[#f5f2ec] border-b border-[#d8d3c9]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm font-medium tracking-tight">
          resu<span className="text-[#1a3cff]">match</span>
        </Link>

        <div className="flex items-center gap-8">
          {loggedIn && (
            <>
              {protectedLinks.map((l) => (
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

              <div className="flex items-center gap-4 pl-4 border-l border-[#d8d3c9]">
                <span className="text-xs text-[#7a7670]">
                  {user?.name}
                </span>
                <button
                  onClick={logout}
                  className="text-xs text-[#7a7670] hover:text-[#e8440a] transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}

          {!loggedIn && mounted && (
            <>
              <Link
                href="/login"
                className={`text-[13px] transition-colors ${
                  pathname === "/login"
                    ? "text-[#0f0e0d] font-medium"
                    : "text-[#7a7670] hover:text-[#0f0e0d]"
                }`}
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 bg-[#1a3cff] text-white text-xs font-medium rounded-lg hover:bg-[#1530cc] transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
