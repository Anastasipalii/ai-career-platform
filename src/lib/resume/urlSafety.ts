// ============================================================================
// resume/urlSafety — PURE helpers for treating user-entered URLs safely.
//
// Only http:/https: may ever become a clickable link. A bare domain
// ("linkedin.com/in/x") is normalized to an https: target for the href WITHOUT
// rewriting the identity/path, while the display value stays what the user typed.
// Unsafe schemes (javascript:, data:, file:, mailto:, …) are never clickable and
// never crash the preview. Dependency-free → fully unit-testable.
// ============================================================================

/** A URL is "safe to click" only if it parses as http: or https:. */
export function isSafeHttpUrl(raw: string): boolean {
  return safeHref(raw) !== null;
}

/**
 * Returns a safe href for a user-entered URL, or null when it can't be made
 * safe. Adds an https:// scheme to a bare domain, but never changes the path,
 * host, or query the user actually typed. Never throws.
 */
export function safeHref(raw: string): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;

  // Reject protocol-relative URLs ("//host") — their effective scheme is ambiguous.
  if (trimmed.startsWith("//")) return null;

  // Reject anything that declares a non-web scheme up front (javascript:, data:,
  // file:, vbscript:, mailto:, tel:, etc.). A leading "//" is also rejected
  // (protocol-relative) because its effective scheme is ambiguous.
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") return null;
  }

  // Candidate: as-is when it has an http(s) scheme; otherwise prefix https://.
  const candidate = schemeMatch ? trimmed : `https://${trimmed}`;

  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname || !u.hostname.includes(".")) return null; // needs a real host
    return u.href;
  } catch {
    return null;
  }
}

/** The value shown to the user (their own text, trimmed) — never rewritten. */
export function displayUrl(raw: string): string {
  return (raw || "").trim();
}

/**
 * Conservative label derived from a URL's domain, used ONLY when import found a
 * URL with no explicit label. Returns "" when the domain isn't clearly known —
 * never guesses beyond clear domain identity.
 */
export function labelFromUrl(raw: string): string {
  const href = safeHref(raw);
  if (!href) return "";
  let host: string;
  try { host = new URL(href).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
  const known: Record<string, string> = {
    "linkedin.com": "LinkedIn",
    "github.com": "GitHub",
    "gitlab.com": "GitLab",
    "behance.net": "Behance",
    "dribbble.com": "Dribbble",
    "medium.com": "Medium",
    "stackoverflow.com": "Stack Overflow",
    "twitter.com": "Twitter",
    "x.com": "X",
    "youtube.com": "YouTube",
    "kaggle.com": "Kaggle",
  };
  return known[host] ?? "";
}
