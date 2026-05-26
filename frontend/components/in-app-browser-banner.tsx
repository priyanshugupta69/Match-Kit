"use client";

import { useEffect, useState } from "react";
import { isAndroid, isIOS, isInAppBrowser } from "@/lib/webview";

type Detected = { android: boolean; ios: boolean };

export function InAppBrowserBanner() {
  const [detected, setDetected] = useState<Detected | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInAppBrowser()) {
      setDetected({ android: isAndroid(), ios: isIOS() });
    }
  }, []);

  if (!detected) return null;

  const openInDefault =
    detected.ios
      ? "tap the menu (⋮ or share icon) and choose Open in Safari"
      : detected.android
      ? "tap the menu (⋮) and choose Open in Chrome"
      : "open this page in your default browser";

  const copyUrl = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
      <p className="font-medium mb-1">Google sign-in may not work here</p>
      <p className="text-xs leading-relaxed mb-2">
        You&apos;re using an in-app browser, which Google blocks for security.
        To sign in with Google, {openInDefault}. You can also continue with
        email and password below.
      </p>
      <button
        type="button"
        onClick={copyUrl}
        className="text-xs font-medium underline underline-offset-2 hover:text-amber-700"
      >
        {copied ? "Link copied" : "Copy link to paste in browser"}
      </button>
    </div>
  );
}
