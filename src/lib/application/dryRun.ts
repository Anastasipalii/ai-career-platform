// ============================================================================
// application/dryRun — the SAFE staged dry-run engine
// ----------------------------------------------------------------------------
// Walks the fixed application stages with small artificial delays, builds an
// INTERNAL payload of safe metadata (references only — no raw résumé/cover
// text, no secrets), runs a safety check, and finishes. It performs NO network
// activity of any kind: no employer API, no email, no browser automation, no
// external POST/webhook. `submitted` is always false and `isDryRun` always
// true. Pure (injectable sleep/now/uuid) so it is fully unit-testable.
// ============================================================================

import {
  APPLICATION_STAGES,
  IS_DRY_RUN,
  type ApplicationDraft,
  type ApplicationPayload,
  type DryRunResult,
  type DryRunStageEvent,
} from "@/lib/application/types";
import { evaluateReadiness } from "@/lib/application/prepare";

export interface DryRunOptions {
  draft: ApplicationDraft;
  applicationRunKey: string;
  /** Injected so tests run instantly; production uses a short visible delay. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Per-stage progress callback (for the UI). */
  onStage?: (event: DryRunStageEvent) => void;
  /** Delay per stage in ms (default makes the timeline observable). */
  stageDelayMs?: number;
}

const defaultSleep = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));

/** Build the internal, safe application payload. References only — this object
 *  is what a real integration WOULD assemble, but it is never transmitted. */
export function buildApplicationPayload(
  draft: ApplicationDraft,
  applicationRunKey: string,
  now: () => number = () => Date.now()
): ApplicationPayload {
  const j = draft.job;
  return {
    applicationRunKey,
    isDryRun: IS_DRY_RUN,
    job: {
      externalId: j.externalId,
      title: j.title,
      company: j.company,
      provider: j.provider,
      externalUrl: j.sourceUrl,
    },
    // Document REFERENCES, never the raw text.
    documents: {
      resumeRef: draft.resumeName ? `resume:${draft.resumeName}` : "resume:provided",
      coverLetterRef: draft.coverLetterPresent ? "cover_letter:generated" : "cover_letter:missing",
    },
    candidate: { profession: draft.profession, resumeLanguage: draft.resumeLanguage },
    scores: { ats: Math.round(draft.atsScore || 0), match: Math.round(j.matchScore || 0) },
    createdAt: new Date(now()).toISOString(),
  };
}

/**
 * Run the safe dry run. If the draft is not ready, it refuses to proceed
 * (defence in depth) and returns ok=false with no stages and nothing sent.
 */
export async function runDryRun(opts: DryRunOptions): Promise<DryRunResult> {
  const now = opts.now ?? (() => Date.now());
  const sleep = opts.sleep ?? defaultSleep;
  const delay = opts.stageDelayMs ?? 500;
  const startedAtMs = now();

  const readiness = evaluateReadiness(opts.draft);
  const validation = {
    valid: readiness.ready,
    warnings: readiness.warnings,
    missing: readiness.missingItems,
  };

  // Never proceed when validation fails — and never submit regardless.
  if (!readiness.ready) {
    return {
      ok: false,
      isDryRun: IS_DRY_RUN,
      submitted: false,
      stages: [],
      payload: null,
      validation,
      startedAtIso: new Date(startedAtMs).toISOString(),
      completedAtIso: new Date(now()).toISOString(),
      durationMs: 0,
    };
  }

  const stages: DryRunStageEvent[] = [];
  let payload: ApplicationPayload | null = null;

  for (const stage of APPLICATION_STAGES) {
    const stageStart = now();
    const startEvent: DryRunStageEvent = { stage, status: "running", atMs: stageStart };
    stages.push(startEvent);
    opts.onStage?.(startEvent);

    // The ONLY work each stage does is local computation — never any I/O.
    if (stage === "application_payload_created") {
      payload = buildApplicationPayload(opts.draft, opts.applicationRunKey, now);
    }

    await sleep(delay);

    const endEvent: DryRunStageEvent = {
      stage,
      status: "completed",
      atMs: now(),
      durationMs: Math.max(0, now() - stageStart),
    };
    stages.push(endEvent);
    opts.onStage?.(endEvent);
  }

  const completedAtMs = now();
  return {
    ok: true,
    isDryRun: IS_DRY_RUN,
    submitted: false, // can never be anything else
    stages,
    payload,
    validation,
    startedAtIso: new Date(startedAtMs).toISOString(),
    completedAtIso: new Date(completedAtMs).toISOString(),
    durationMs: Math.max(0, completedAtMs - startedAtMs),
  };
}
