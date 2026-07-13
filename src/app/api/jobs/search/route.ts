import { NextRequest, NextResponse } from "next/server";
import { fetchArbeitnowJobs } from "@/lib/jobs/providers/arbeitnow";
import type { NormalizedJob } from "@/lib/jobs/types";

// ============================================================================
// /api/jobs/search — real job listings from an external provider (Arbeitnow).
// ----------------------------------------------------------------------------
// Validates input, calls the server-only provider adapter, filters the REAL
// results by query/location/remote, applies a result limit, and returns
// normalized jobs. Provider failures are surfaced as structured errors — they
// are NEVER replaced with fabricated jobs. Provider internals are not exposed.
// ============================================================================

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

interface SearchBody {
  query?: unknown;
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
  const location = asString(body.location);
  const remoteOnly = body.remote === true;
  const page = asPage(body.page);
  const limit = asLimit(body.limit);

  const result = await fetchArbeitnowJobs({ page });
  if (!result.ok) {
    // Do NOT fabricate jobs on provider failure — surface a clean error.
    return NextResponse.json(
      { ok: false, error: { code: result.error.code, message: "Real job data is currently unavailable." } },
      { status: 502 }
    );
  }

  const filtered = result.jobs
    .filter((j) => matchesQuery(j, query))
    .filter((j) => (location ? (j.location ? contains(j.location, location) : false) : true))
    .filter((j) => (remoteOnly ? j.remote === true : true))
    .slice(0, limit);

  devLog(
    "[jobs/search] query:", JSON.stringify(query),
    "| fetched:", result.jobs.length,
    "| returned:", filtered.length,
    "| firstId:", filtered[0]?.externalId ?? "(none)"
  );

  return NextResponse.json({
    ok: true,
    provider: "arbeitnow",
    page,
    count: filtered.length,
    jobs: filtered,
  });
}
