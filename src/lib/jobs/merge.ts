// ============================================================================
// jobs/merge — combine + deduplicate normalized jobs from multiple providers
// ----------------------------------------------------------------------------
// Pure (no network / no provider imports). Used by the search route to merge
// results from every provider, keep the results of the providers that succeeded
// even when another fails, and remove duplicate listings BEFORE the downstream
// strict domain gate + AI ranking. Deduplication uses a stable normalized
// signature (title + company + location) with the source URL as a secondary
// signal, so the same vacancy surfaced by two aggregators is only shown once.
// ============================================================================

import type { JobProviderResult, NormalizedJob } from "@/lib/jobs/types";

const norm = (s: string | null | undefined): string =>
  (s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

/** Normalize a source URL for comparison (drop protocol/query/trailing slash). */
export function normalizeUrl(url: string | null | undefined): string {
  let u = (url ?? "").trim().toLowerCase();
  u = u.replace(/^https?:\/\//, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  return u;
}

/** Stable content signature for a job (title + company + location). */
export function jobSignature(job: NormalizedJob): string {
  return `${norm(job.title)}|${norm(job.company)}|${norm(job.location)}`;
}

/**
 * Remove duplicate listings, keeping the FIRST occurrence (providers are merged
 * in a stable order). A job is a duplicate when:
 *   • its normalized source URL was already seen (same listing, any provider), OR
 *   • it has a company AND its (title|company|location) signature was seen.
 * Company-less jobs are only deduped by URL, so distinct company-less listings
 * that happen to share a title+location are NOT wrongly merged.
 */
export function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seenUrl = new Set<string>();
  const seenSig = new Set<string>();
  const out: NormalizedJob[] = [];

  for (const job of jobs) {
    const urlKey = normalizeUrl(job.sourceUrl);
    if (urlKey && seenUrl.has(urlKey)) continue;

    const hasCompany = norm(job.company).length > 0;
    const sig = hasCompany ? jobSignature(job) : null;
    if (sig && seenSig.has(sig)) continue;

    out.push(job);
    if (urlKey) seenUrl.add(urlKey);
    if (sig) seenSig.add(sig);
  }
  return out;
}

/** A provider's tagged result (the label is used only for observability). */
export interface TaggedProviderResult {
  provider: string;
  result: JobProviderResult;
}

export interface CombinedProviders {
  /** True when AT LEAST ONE provider succeeded (empty results still count). */
  ok: boolean;
  /** Merged + deduped jobs from the providers that succeeded. */
  jobs: NormalizedJob[];
  /** Providers that returned ok (for logging/telemetry). */
  providersOk: string[];
  /** Providers that failed, with safe error codes (no secrets). */
  providersFailed: { provider: string; code: string }[];
}

/**
 * Combine tagged provider results. One provider failing NEVER discards another's
 * valid jobs. `ok` is false only when EVERY provider failed (→ jobsUnavailable).
 * An "ok but empty" outcome (all providers reachable, no listings) returns
 * ok:true with jobs:[].
 */
export function combineProviderResults(entries: TaggedProviderResult[]): CombinedProviders {
  const providersOk: string[] = [];
  const providersFailed: { provider: string; code: string }[] = [];
  const merged: NormalizedJob[] = [];

  for (const { provider, result } of entries) {
    if (result.ok) {
      providersOk.push(provider);
      for (const job of result.jobs) merged.push(job);
    } else {
      providersFailed.push({ provider, code: result.error.code });
    }
  }

  return {
    ok: providersOk.length > 0,
    jobs: dedupeJobs(merged),
    providersOk,
    providersFailed,
  };
}

/**
 * Build a provider-BALANCED candidate pool so an Arbeitnow-heavy feed can never
 * starve Jooble (or vice-versa) before the domain gate. Reserves up to `cap`
 * per provider, then fills any unused capacity from providers that have more,
 * and emits a deterministic round-robin interleave. Input order defines
 * provider precedence (stable). Never fabricates or reorders within a provider.
 */
export function balancePool(jobs: NormalizedJob[], cap = 20): NormalizedJob[] {
  const byProvider = new Map<string, NormalizedJob[]>();
  for (const j of jobs) {
    const p = j.provider;
    if (!byProvider.has(p)) byProvider.set(p, []);
    byProvider.get(p)!.push(j);
  }
  const providers = [...byProvider.keys()];
  if (providers.length === 0) return [];
  const totalCap = cap * providers.length;

  // 1) reserve up to `cap` from each provider (in-order).
  const reserved = new Map<string, NormalizedJob[]>(providers.map((p) => [p, byProvider.get(p)!.slice(0, cap)]));
  let used = [...reserved.values()].reduce((s, a) => s + a.length, 0);

  // 2) fill unused capacity from providers that still have jobs.
  for (const p of providers) {
    if (used >= totalCap) break;
    const all = byProvider.get(p)!;
    const have = reserved.get(p)!.length;
    if (all.length > have) {
      const extra = all.slice(have, have + (totalCap - used));
      reserved.set(p, [...reserved.get(p)!, ...extra]);
      used += extra.length;
    }
  }

  // 3) deterministic round-robin interleave.
  const arrs = providers.map((p) => reserved.get(p)!);
  const out: NormalizedJob[] = [];
  let i = 0;
  for (;;) {
    let added = false;
    for (const a of arrs) {
      if (i < a.length) {
        out.push(a[i]);
        added = true;
      }
    }
    if (!added) break;
    i++;
  }
  return out;
}
