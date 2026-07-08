// ============================================================================
// withRetryOn429 — transient-rate-limit resilience for AI API routes
// ----------------------------------------------------------------------------
// Wraps any async OpenAI call and retries ONLY on a 429 (rate limit / quota)
// with a short backoff. This does NOT change prompts, parameters, or parsing —
// it only re-issues the identical request a couple of times so a brief burst
// limit doesn't collapse a stage into an empty/error result. On a persistent
// quota exhaustion it still throws after the final attempt (caller's existing
// fallback handling then applies).
// ============================================================================

export async function withRetryOn429<T>(
  fn: () => Promise<T>,
  tries = 3,
  baseDelayMs = 700
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = status === 429 || /\b429\b|rate limit|quota|too many requests/i.test(msg);
      if (!is429 || attempt === tries - 1) throw err;
      // Linear backoff: 700ms, 1400ms, … — bounded so the client timeout holds.
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}
