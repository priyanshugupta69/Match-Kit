// Detects common in-app browsers (Facebook, Instagram, LinkedIn, etc.).
// Google's OAuth blocks these with "disallowed_useragent" / Error 403,
// so we warn the user and try to escape to a real browser where possible.

const IN_APP_RE =
  /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|MicroMessenger|WhatsApp|Snapchat|TikTok|musical_ly|BytedanceWebview|KAKAOTALK|Pinterest|; wv\)|Twitter for/i;

function ua(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent : "";
}

export function isInAppBrowser(userAgent: string = ua()): boolean {
  return IN_APP_RE.test(userAgent);
}

export function isAndroid(userAgent: string = ua()): boolean {
  return /Android/i.test(userAgent);
}

export function isIOS(userAgent: string = ua()): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent);
}

// On Android in-app webviews we can force Chrome via an intent:// URL.
// iOS has no equivalent — the user has to open Safari manually.
export function openGoogleAuth(url: string) {
  const u = ua();
  if (isInAppBrowser(u) && isAndroid(u)) {
    const stripped = url.replace(/^https?:\/\//, "");
    window.location.href = `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }
  window.location.href = url;
}
