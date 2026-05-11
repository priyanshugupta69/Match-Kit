"use client";

import { useState } from "react";

type Kind = "email" | "phone";

function CopyButton({
  value,
  kind,
  copied,
  onCopy,
}: {
  value: string;
  kind: Kind;
  copied: boolean;
  onCopy: () => void;
}) {
  const label =
    kind === "email" ? `Copy email ${value}` : `Copy phone ${value}`;
  const title = copied ? "Copied!" : value;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(onCopy).catch(() => {});
      }}
      aria-label={label}
      title={title}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
        copied
          ? "border-green-200 bg-green-50 text-[#1F6B3A]"
          : "border-[#e5e0d6] bg-white text-[#7a7670] hover:text-[#2c2925] hover:border-[#d8d3c9] hover:bg-[#fafaf8]"
      }`}
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : kind === "email" ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 5a2 2 0 012-2h2.28a2 2 0 011.94 1.515l.7 2.79a2 2 0 01-.45 1.86L8.1 10.9a14 14 0 005 5l1.735-1.37a2 2 0 011.86-.45l2.79.7A2 2 0 0121 16.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      )}
    </button>
  );
}

export function ContactIcons({
  email,
  phone,
  className,
}: {
  email?: string | null;
  phone?: string | null;
  className?: string;
}) {
  const [copied, setCopied] = useState<Kind | null>(null);

  const cleanEmail = email?.trim() || null;
  const cleanPhone = phone?.trim() || null;
  if (!cleanEmail && !cleanPhone) return null;

  const markCopied = (kind: Kind) => {
    setCopied(kind);
    setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      {cleanEmail && (
        <CopyButton
          value={cleanEmail}
          kind="email"
          copied={copied === "email"}
          onCopy={() => markCopied("email")}
        />
      )}
      {cleanPhone && (
        <CopyButton
          value={cleanPhone}
          kind="phone"
          copied={copied === "phone"}
          onCopy={() => markCopied("phone")}
        />
      )}
    </div>
  );
}
