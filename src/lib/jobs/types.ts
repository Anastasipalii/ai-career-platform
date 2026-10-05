// ============================================================================
// jobs/types — provider-neutral job model
// ----------------------------------------------------------------------------
// A single normalized shape that every external job provider is mapped into,
// so the rest of the app never depends on a provider's raw response. Only REAL
// provider data is ever placed here — missing values are null/empty, never
// invented. `synthetic` marks non-production (stress/demo) data so it can never
// be confused with real listings.
// ============================================================================

export type JobProvider = "arbeitnow" | "jooble";

export interface NormalizedJob {
  /** Stable id from the provider (e.g. Arbeitnow slug). */
  externalId: string;
  provider: JobProvider;
  title: string;
  company: string;
  /** Free-text location as given by the provider, or null if absent. */
  location: string | null;
  remote: boolean;
  /** Provider description (may contain HTML). Real text only. */
  description: string;
  tags: string[];
  jobTypes: string[];
  /** ISO timestamp derived from the provider, or null if not provided. */
  publishedAt: string | null;
  /** Canonical listing URL at the provider. */
  sourceUrl: string;
  /** Where the user applies — the real provider URL (never auto-submitted). */
  applyUrl: string;
  /** True only for stress/demo synthetic data. Real provider jobs omit it. */
  synthetic?: boolean;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  remote?: boolean;
  page?: number;
  limit?: number;
}

/** Structured result — callers branch on `ok`; errors carry a safe code+message
 *  and never a provider stack trace or secret. */
export type JobProviderResult =
  | { ok: true; jobs: NormalizedJob[] }
  | { ok: false; error: { code: string; message: string } };
