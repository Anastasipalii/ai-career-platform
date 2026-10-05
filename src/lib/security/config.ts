// ============================================================================
// security/config — the SINGLE source of truth for Security Pass A limits.
//
// Every cost-bearing live API route is gated by withGuard() (see guard.ts),
// which reads its rate-limit tier and the shared input caps from HERE. Keep all
// magic numbers in this one file so a launch-time tuning change is one edit, not
// nineteen.
//
// Rationale for the values:
//   - Every live route calls a PAID external provider (OpenAI on 18 routes,
//     Jooble/Arbeitnow on jobs/search), so there is no "free/local" live route
//     to exempt — only EXPENSIVE_AI and PROVIDER_SEARCH exist.
//   - A legitimate human can run the full AI Workflow, which fires ~8 expensive
//     calls in a short burst, plus ad-hoc tool use. The windows below comfortably
//     allow that while blocking scripted rapid-fire abuse (which would need
//     hundreds/thousands of calls to matter).
// ============================================================================

export type RateTier = "EXPENSIVE_AI" | "PROVIDER_SEARCH";

export interface TierConfig {
  /** Sustained window: at most `max` requests per `ms`. */
  readonly window: { readonly ms: number; readonly max: number };
  /** Short burst window: blocks rapid-fire within a few seconds. */
  readonly burst: { readonly ms: number; readonly max: number };
  /** Max simultaneous in-flight requests per user for this tier. */
  readonly concurrency: number;
}

export const TIERS: Record<RateTier, TierConfig> = {
  // OpenAI-backed routes (résumé analyze/improve/generate/tools/parse/
  // requirements, cover letter, interview, linkedin, career-path, job-match,
  // application/prepare, resume-translation).
  EXPENSIVE_AI: {
    window: { ms: 60_000, max: 30 },
    burst: { ms: 10_000, max: 8 },
    concurrency: 4,
  },
  // jobs/search → Arbeitnow (free) + Jooble (paid).
  PROVIDER_SEARCH: {
    window: { ms: 60_000, max: 20 },
    burst: { ms: 10_000, max: 6 },
    concurrency: 3,
  },
};

// ── Server-side input caps (enforced BEFORE any provider call) ──────────────
// These are deliberately generous versus real inputs (a long résumé/JD is a few
// thousand characters; a workflow passes <=25 jobs). They exist to reject abusive
// payloads before they reach a paid model, NOT to trim legitimate content — a
// route's own narrower, meaning-preserving caps (e.g. translate's 20k char cap,
// analyze's internal slice) still apply on top.
export const CAPS = {
  /** Whole JSON request body. */
  MAX_BODY_BYTES: 512 * 1024, // 512 KB
  /** Any single string value anywhere in the body. */
  MAX_STRING_LEN: 40_000,
  /** Any single array's length. */
  MAX_ARRAY_LEN: 1_000,
  /** Maximum nesting depth of the JSON structure. */
  MAX_DEPTH: 12,
  /** Total number of string values anywhere (guards many-small-strings blowup). */
  MAX_TOTAL_STRINGS: 20_000,
} as const;
