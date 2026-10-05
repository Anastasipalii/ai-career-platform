// ============================================================================
// simulation/supabaseSink — maps the engine's SimulationSink onto the existing
// workflowRun.ts persistence API (which runs under the signed-in admin's
// session and RLS). This adds NO new Supabase config, auth, or service-role
// key — it only composes functions that already exist. Every run it writes is
// mode = "stress" ⇒ is_simulation = true, so simulation data is always
// distinguishable from production runs and never touches real providers.
// ============================================================================

import {
  createWorkflowRun,
  updateWorkflowRunStatus,
  recordWorkflowEvent,
  completeWorkflowRun,
  failWorkflowRun,
  cancelWorkflowRun,
} from "@/lib/workflowRun";
import type { SimulationSink } from "@/lib/simulation/engine";

const MODE = "stress" as const; // ⇒ is_simulation = true (generated column)

/**
 * Build a SimulationSink backed by the real DB. Persistence is best-effort:
 * per-event write failures are swallowed by the engine's per-run guard so the
 * batch keeps running; createRun throws on failure so that run is marked failed.
 *
 * NOTE: run_key is a `uuid` column (see phase1_workflow_lifecycle.sql), so the
 * engine MUST supply a UUID run_key — the default engine uuid() (crypto) does.
 */
export function createSupabaseSimulationSink(): SimulationSink {
  return {
    async createRun({ runKey, simulationUserId, profession, language }) {
      const res = await createWorkflowRun({
        runKey,
        mode: MODE,
        status: "queued",
        currentStep: "queued",
        source: "demo-fallback",
        profession,
        resumeLanguage: language,
        simulationUserId,
      });
      if (!res.ok) throw new Error(`createRun failed: ${res.error.code}`);
      return { runId: res.data.id };
    },

    async markRunning({ runKey }) {
      await updateWorkflowRunStatus({ runKey, status: "running", currentStep: "queued", progress: 0 });
    },

    async startStage({ runId, runKey, stage, progress }) {
      await recordWorkflowEvent({
        runId,
        mode: MODE,
        stage,
        status: "running",
        progress,
        startedAt: new Date().toISOString(),
      });
      await updateWorkflowRunStatus({ runKey, status: "running", currentStep: stage, progress });
    },

    async completeStage({ runId, stage, progress, durationMs }) {
      await recordWorkflowEvent({
        runId,
        mode: MODE,
        stage,
        status: "completed",
        progress,
        durationMs,
        completedAt: new Date().toISOString(),
      });
    },

    async failStage({ runId, stage, durationMs, errorCode, errorMessage }) {
      await recordWorkflowEvent({
        runId,
        mode: MODE,
        stage,
        status: "failed",
        durationMs,
        errorCode,
        errorMessage,
        completedAt: new Date().toISOString(),
      });
    },

    async completeRun({ runKey, profession, language, jobsFound, durationMs }) {
      await completeWorkflowRun({
        runKey,
        source: "demo-fallback",
        profession,
        resumeLanguage: language,
        jobsFound,
        durationMs,
      });
    },

    async failRun({ runKey, stage, errorCode, errorMessage }) {
      await failWorkflowRun({ runKey, errorCode, errorMessage, currentStep: stage });
    },

    async cancelRun({ runKey, stage }) {
      await cancelWorkflowRun({ runKey, currentStep: stage, reason: "Simulation batch aborted." });
    },
  };
}
