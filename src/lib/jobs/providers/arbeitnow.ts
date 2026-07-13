// ============================================================================
// jobs/providers/arbeitnow — Arbeitnow job-board adapter (SERVER-ONLY)
// ----------------------------------------------------------------------------
// Fetches REAL jobs from https://www.arbeitnow.com/api/job-board-api, validates
// the response, and normalizes each record into NormalizedJob. It NEVER invents
// missing values: a record missing a required field (id/title/company/url) is
// skipped rather than fabricated. All external I/O is guarded by an
// AbortController timeout and returns a structured result.
//
// This module must only be imported from server code (API routes). It has no
// "use client" and no client-only APIs.
// ============================================================================

import type { JobProviderResult, JobSearchParams, NormalizedJob } from "@/lib/jobs/types";

const ENDPOINT = "https://www.arbeitnow.com/api/job-board-api";
const DEFAULT_TIMEOUT_MS = 8000;

/** Raw Arbeitnow record (only the fields we consume). */
interface ArbeitnowJob {
  slug?: unknown;
  company_name?: unknown;
  title?: unknown;
  description?: unknown;
  remote?: unknown;
  url?: unknown;
  tags?: unknown;
  job_types?: unknown;
  location?: unknown;
  created_at?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

/** Convert a unix-seconds timestamp to ISO, or null when absent/invalid. */
function toIso(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const ms = v > 1e12 ? v : v * 1000; // tolerate seconds or ms
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Normalize one raw record. Returns null when a required field is missing —
 *  we drop the record rather than invent identity/company/url. */
function normalize(raw: ArbeitnowJob): NormalizedJob | null {
  const externalId = str(raw.slug);
  const title = str(raw.title);
  const company = str(raw.company_name);
  const sourceUrl = str(raw.url);
  if (!externalId || !title || !company || !sourceUrl) return null;

  const locationValue = str(raw.location);
  return {
    externalId,
    provider: "arbeitnow",
    title,
    company,
    location: locationValue ? locationValue : null,
    remote: raw.remote === true,
    description: str(raw.description),
    tags: strArr(raw.tags),
    jobTypes: strArr(raw.job_types),
    publishedAt: toIso(raw.created_at),
    sourceUrl,
    // Arbeitnow has no separate apply URL — the real listing page is where the
    // user applies. We reuse the real url; we never fabricate an apply link.
    applyUrl: sourceUrl,
  };
}

/**
 * Fetch and normalize a page of real Arbeitnow jobs. Filtering/limiting is left
 * to the caller (the search route) — this adapter only returns real, validated,
 * normalized data or a structured error.
 */
export async function fetchArbeitnowJobs(
  params: Pick<JobSearchParams, "page">,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<JobProviderResult> {
  const page = Number.isFinite(params.page) && (params.page as number) >= 1 ? Math.floor(params.page as number) : 1;
  const url = `${ENDPOINT}?page=${page}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      // Always hit the provider fresh; do not cache stale listings.
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

    const data = (parsed as { data?: unknown })?.data;
    if (!Array.isArray(data)) {
      return { ok: false, error: { code: "provider_bad_shape", message: "Job provider response was not in the expected shape." } };
    }

    const jobs: NormalizedJob[] = [];
    for (const raw of data as ArbeitnowJob[]) {
      const job = normalize(raw);
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
