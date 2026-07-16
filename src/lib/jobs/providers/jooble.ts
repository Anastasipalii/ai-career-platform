// ============================================================================
// jobs/providers/jooble — Jooble REST API adapter (SERVER-ONLY)
// ----------------------------------------------------------------------------
// Fetches REAL jobs from the Jooble aggregator (broad coverage across technical
// AND non-technical fields) and normalizes each record into the shared
// NormalizedJob. It NEVER invents missing values: a record missing a required
// field (title/link) is skipped. All external I/O is guarded by a timeout and
// returns a structured JobProviderResult.
//
// SECURITY: the API key lives in the request URL path, so this module must be
// imported ONLY from server code, and the key/URL must NEVER be logged. If
// JOOBLE_API_KEY is unset, the adapter reports a structured "not configured"
// error so the search route can carry on with the other provider.
// ============================================================================

import type { JobProviderResult, JobSearchParams, NormalizedJob } from "@/lib/jobs/types";

const ENDPOINT_BASE = "https://jooble.org/api/";
const DEFAULT_TIMEOUT_MS = 8000;

/** Raw Jooble record (only the fields we consume). */
export interface JoobleJob {
  id?: unknown;
  title?: unknown;
  company?: unknown;
  location?: unknown;
  snippet?: unknown;
  salary?: unknown;
  type?: unknown;
  link?: unknown;
  source?: unknown;
  updated?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Parse Jooble's `updated` (ISO-ish string) into ISO, or null. */
function toIso(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/**
 * Normalize one raw Jooble record. Returns null when a required field is
 * missing (title or link). Company may be empty (Jooble aggregates listings
 * that sometimes omit it) — we keep it as "" rather than inventing one, and the
 * UI renders a "Company unavailable" label for empty companies.
 */
export function normalizeJoobleJob(raw: JoobleJob): NormalizedJob | null {
  const title = str(raw.title);
  const sourceUrl = str(raw.link);
  if (!title || !sourceUrl) return null;

  const idPart = raw.id != null && `${raw.id}`.trim() ? `${raw.id}`.trim() : sourceUrl;
  const type = str(raw.type);
  const location = str(raw.location);
  // Jooble has no explicit remote flag — infer conservatively from text.
  const remote = /\bremote\b/i.test(`${location} ${type}`);

  return {
    // Prefix with the provider so ids can never collide with another provider's.
    externalId: `jooble-${idPart}`,
    provider: "jooble",
    title,
    company: str(raw.company), // may be ""
    location: location || null,
    remote,
    description: str(raw.snippet),
    tags: [], // Jooble exposes no tags
    jobTypes: type ? [type] : [],
    publishedAt: toIso(raw.updated),
    sourceUrl,
    applyUrl: sourceUrl, // the real listing page — never auto-submitted
  };
}

/**
 * Fetch + normalize a page of real Jooble jobs. Filtering/limiting/dedup is left
 * to the caller. Returns real, validated, normalized data or a structured error
 * (never fabricated jobs, never the key or a stack trace).
 */
export async function fetchJoobleJobs(
  params: Pick<JobSearchParams, "query" | "location" | "page">,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<JobProviderResult> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) {
    return { ok: false, error: { code: "provider_not_configured", message: "Job provider is not configured." } };
  }

  const page = Number.isFinite(params.page) && (params.page as number) >= 1 ? Math.floor(params.page as number) : 1;
  const body = JSON.stringify({
    keywords: (params.query ?? "").toString().slice(0, 200),
    location: (params.location ?? "").toString().slice(0, 100),
    page: String(page),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${ENDPOINT_BASE}${key}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: { code: `provider_http_${res.status}`, message: "Job provider returned an error." } };
    }

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      return { ok: false, error: { code: "provider_bad_json", message: "Job provider returned an unreadable response." } };
    }

    const jobsRaw = (parsed as { jobs?: unknown })?.jobs;
    if (!Array.isArray(jobsRaw)) {
      return { ok: false, error: { code: "provider_bad_shape", message: "Job provider response was not in the expected shape." } };
    }

    const jobs: NormalizedJob[] = [];
    for (const raw of jobsRaw as JoobleJob[]) {
      const job = normalizeJoobleJob(raw);
      if (job) jobs.push(job);
    }
    return { ok: true, jobs };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? { code: "provider_timeout", message: "Job provider timed out." }
        : { code: "provider_unreachable", message: "Could not reach the job provider." },
    };
  } finally {
    clearTimeout(timer);
  }
}
