"use client";

// ============================================================================
// usePipeline — reusable execution engine for the Career Automation Pipeline
// ----------------------------------------------------------------------------
// Centralizes all run/reset/status logic so the canvas (and any future surface)
// stays declarative. Each step advances waiting → running → completed on its
// own simulated `durationMs`, so the pipeline reads like a realistic run.
// No backend — purely a timed, presentational simulation.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FLOW_STEPS, type WorkflowStepStatus } from "./flowSteps";

const SEED: WorkflowStepStatus[] = FLOW_STEPS.map((s) => s.status);

export interface PipelineController {
  /** Per-step status, index-aligned with FLOW_STEPS. */
  statuses: WorkflowStepStatus[];
  /** True while a run is in flight. */
  running: boolean;
  /** Index of the step currently running, or null. */
  activeIndex: number | null;
  /** Count of completed steps. */
  completedCount: number;
  /** Completion as a 0–100 integer, for the progress bar. */
  progress: number;
  /** Total steps in the pipeline. */
  total: number;
  /** Start (or restart) the simulated run. */
  run: () => void;
  /** Clear timers and return every step to its seed status. */
  reset: () => void;
}

/**
 * Drives the pipeline simulation.
 * @param onComplete Fired once, when the final step finishes.
 */
export function usePipeline(onComplete?: () => void): PipelineController {
  const [statuses, setStatuses] = useState<WorkflowStepStatus[]>(SEED);
  const [running, setRunning] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Keep the latest callback without re-creating `run` on every render.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  // Clean up any in-flight timers on unmount.
  useEffect(() => clearTimers, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setRunning(false);
    setActiveIndex(null);
    setStatuses(SEED);
  }, [clearTimers]);

  const run = useCallback(() => {
    clearTimers();
    setRunning(true);
    setActiveIndex(null);
    setStatuses(FLOW_STEPS.map(() => "waiting"));

    let elapsed = 0;
    FLOW_STEPS.forEach((step, i) => {
      const startAt = elapsed;
      const endAt = elapsed + step.durationMs;

      // Step becomes active/running.
      timers.current.push(
        setTimeout(() => {
          setActiveIndex(i);
          setStatuses((prev) => {
            const next = [...prev];
            next[i] = "running";
            return next;
          });
        }, startAt)
      );

      // Step completes (and hands off to the next).
      timers.current.push(
        setTimeout(() => {
          setStatuses((prev) => {
            const next = [...prev];
            next[i] = "completed";
            return next;
          });
          if (i === FLOW_STEPS.length - 1) {
            setRunning(false);
            setActiveIndex(null);
            onCompleteRef.current?.();
          }
        }, endAt)
      );

      elapsed = endAt;
    });
  }, [clearTimers]);

  const completedCount = useMemo(
    () => statuses.filter((s) => s === "completed").length,
    [statuses]
  );
  const progress = Math.round((completedCount / FLOW_STEPS.length) * 100);

  return {
    statuses,
    running,
    activeIndex,
    completedCount,
    progress,
    total: FLOW_STEPS.length,
    run,
    reset,
  };
}
