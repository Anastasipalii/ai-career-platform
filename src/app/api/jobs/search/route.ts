import { NextRequest, NextResponse } from "next/server";
import { fetchArbeitnowJobs } from "@/lib/jobs/providers/arbeitnow";
import { fetchJoobleJobs } from "@/lib/jobs/providers/jooble";
import { combineProviderResults, balancePool } from "@/lib/jobs/merge";
import type { NormalizedJob } from "@/lib/jobs/types";

// ============================================================================
// /api/jobs/search — real job listings from MULTIPLE external providers.
// ----------------------------------------------------------------------------
// Queries every provider (Arbeitnow + Jooble) independently and in parallel,
// normalizes each into NormalizedJob, MERGES successes, DEDUPLICATES, then
// coarse-filters by query/location/remote and applies a limit. One provider
// failing never discards another's valid results; only when ALL providers fail
// is a structured error returned (→ jobsUnavailable). No fabricated jobs, no
// provider internals, and the strict domain gate + MIN_MATCH_SCORE remain
// downstream (WorkflowCanvas + job-match agent) exactly as before.
// ============================================================================

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

interface SearchBody {
  query?: unknown;
  /** Concise query for keyword-search providers (Jooble). Falls back to query. */
  providerQuery?: unknown;
  location?: unknown;
  remote?: unknown;
  page?: unknown;
  limit?: unknown;
}

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function asPage(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function asLimit(v: unknown): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, n);
}

/** Case-insensitive "haystack contains needle". */
const contains = (hay: string, needle: string) => hay.toLowerCase().includes(needle.toLowerCase());

function matchesQuery(job: NormalizedJob, query: string): boolean {
  if (!query) return true;
  const haystack = [job.title, job.company, job.description, ...job.tags, ...job.jobTypes].join(" ");
  // Match if ANY whitespace-separated term appears in the record. Using OR (not
  // AND) so a multi-word query like "Senior Frontend Developer" still returns
  // relevant real listings instead of requiring every word to co-occur (which
  // returned zero for realistic profession queries).
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.some((term) => contains(haystack, term));
}

// Dev-only boundary log (never in production; no PII / secrets / descriptions).
function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") console.log(...args);
}

export async function POST(req: NextRequest) {
  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ ok: false, error: { code: "bad_request", message: "Invalid request body." } }, { status: 400 });
  }

  const query = asString(body.query);
  // Jooble gets a CONCISE query (profession/top domain term); Arbeitnow keeps
  // using `query` for its existing OR filter. Falls back to `query` if absent.
  const joobleQuery = asString(body.providerQuery) || query;
  const location = asString(body.location);
  const remoteOnly = body.remote === true;
  const page = asPage(body.page);
  const limit = asLimit(body.limit);

  // Query every provider independently and in parallel. Each adapter already
  // returns a structured result and never throws, so one provider's failure
  // cannot reject the other.
  const [arbeitnow, jooble] = await Promise.all([
    fetchArbeitnowJobs({ page }),
    fetchJoobleJobs({ query: joobleQuery, location, page }),
  ]);

  // ── Per-provider route filtering ──
  // Arbeitnow is a general latest-jobs feed → keep the broad OR filter (one
  // strong query term is enough) plus remote-only when requested.
  // Jooble already searched by the CONCISE providerQuery, so we KEEP its
  // normalized results as-is (never re-filter them against the long résumé
  // query). `location` is used ONLY for Jooble's provider query above — real
  // location relevance runs downstream in WorkflowCanvas.evaluateJobLocation.
  const arbRaw = arbeitnow.ok ? arbeitnow.jobs.length : 0;
  const arbFiltered = arbeitnow.ok
    ? arbeitnow.jobs.filter((j) => matchesQuery(j, query) && (!remoteOnly || j.remote === true))
    : [];
  const joobleRaw = jooble.ok ? jooble.jobs.length : 0;
  const joobleKept = jooble.ok ? jooble.jobs.filter((j) => (remoteOnly ? j.remote === true : true)) : [];

  // Merge successes + deduplicate, THEN build a provider-balanced pool so an
  // Arbeitnow-heavy feed cannot starve Jooble before the domain gate.
  const combined = combineProviderResults([
    { provider: "arbeitnow", result: arbeitnow.ok ? { ok: true, jobs: arbFiltered } : arbeitnow },
    { provider: "jooble", result: jooble.ok ? { ok: true, jobs: joobleKept } : jooble },
  ]);

  if (!combined.ok) {
    // Every provider failed → clean error (no fabricated jobs). WorkflowCanvas
    // maps this to jobsUnavailable = true.
    return NextResponse.json(
      { ok: false, error: { code: "all_providers_unavailable", message: "Real job data is currently unavailable." } },
      { status: 502 }
    );
  }

  const perProviderCap = Math.min(20, Math.max(1, limit));
  const balanced = balancePool(combined.jobs, perProviderCap);

  devLog(
    "[jobs/search] query:", JSON.stringify(query),
    "| providersOk:", combined.providersOk.join("+") || "(none)",
    "| arbeitnow:", `${arbRaw}->${arbFiltered.length}`,
    "| jooble:", `${joobleRaw}->${joobleKept.length}`,
    "| balanced:", balanced.length
  );

  // TEMPORARY dev-only diagnostics (never in production). Counts ONLY — no key,
  // no URL, no résumé/cover text.
  const diagnostics =
    process.env.NODE_ENV !== "production"
      ? {
          query,
          joobleQuery,
          location: location || "(none)",
          arbeitnow: {
            status: arbeitnow.ok ? "ok" : arbeitnow.error.code,
            rawJobs: arbRaw,
            afterRouteFilter: arbFiltered.length,
            removedByQuery: arbRaw - arbFiltered.length,
          },
          jooble: {
            status: jooble.ok ? "ok" : jooble.error.code,
            rawJobs: joobleRaw,
            afterRouteFilter: joobleKept.length,
            removedByQuery: 0, // Jooble is NOT re-filtered by the long query
          },
          mergedRaw: arbFiltered.length + joobleKept.length,
          deduped: combined.jobs.length,
          afterRouteFilter: balanced.length,
          balancedFrom: `arbeitnow:${combined.jobs.filter((j) => j.provider === "arbeitnow").length}+jooble:${combined.jobs.filter((j) => j.provider === "jooble").length}`,
        }
      : undefined;

  return NextResponse.json({
    ok: true,
    providers: combined.providersOk,
    provider: combined.providersOk.join("+") || "none", // back-compat string
    page,
    count: balanced.length,
    jobs: balanced,
    diagnostics,
  });
}
