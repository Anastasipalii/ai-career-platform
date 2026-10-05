import { authedFetch } from "@/lib/auth/authedFetch";
// ============================================================================
// resume/aiRequest — the single source of truth for Resume Builder AI requests.
//
// Every Resume Builder AI call is an HTTP POST with a JSON body. Building the
// request here (instead of inline in each component) means the method/body
// contract lives in ONE place that a runtime test can exercise directly —
// something a source-string scan cannot guarantee. It is also the one place to
// recognise a request that was altered in flight.
//
// Context: a real-browser log showed `GET /api/resume/improve?cache-bust=<ts>`
// hitting these POST-only routes and returning 405, even though every call site
// sends POST. The app does not add a `cache-bust` param anywhere (Next's own RSC
// cache-buster is `_rsc=<hash>`, never `cache-bust=<timestamp>`), there is no
// middleware, service worker, rewrite, or global fetch patch. That fingerprint —
// a numeric `cache-bust` param plus a POST→GET downgrade — is produced OUTSIDE
// the app, by a browser cache-busting extension or a debugging proxy. We do not
// paper over it by adding GET handlers (AI generation is stateful POST work);
// instead we keep the contract airtight and diagnosable.
// ============================================================================

export interface AIRequest {
  url: string;
  init: RequestInit;
}

/** Build a Resume Builder AI request: always POST + JSON body. Pure + testable. */
export function buildResumeAIRequest(url: string, payload: unknown): AIRequest {
  return {
    url,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  };
}

/**
 * Fingerprint of an external cache-buster: a `cache-bust=<digits>` query param.
 * Such tools pair this with a POST→GET downgrade, which is the documented cause
 * of a 405 on our POST-only AI routes. Next's own cache-buster (`_rsc`) is
 * intentionally NOT matched.
 */
export function looksLikeExternalCacheBust(url: string): boolean {
  return /[?&]cache-bust=\d+/.test(url);
}

/**
 * Perform a Resume Builder AI POST. Guarantees the method/body contract at the
 * one place all callers share, and returns the raw Response so streaming callers
 * can read `res.body` and non-streaming callers can read `res.json()`.
 */
export async function postResumeAI(url: string, payload: unknown): Promise<Response> {
  const { url: u, init } = buildResumeAIRequest(url, payload);
  return authedFetch(u, init);
}
