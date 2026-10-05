// ============================================================================
// resume/dirtyState — PURE unsaved-changes detection for Resume Builder.
//
// The builder keeps a serialized "baseline" of the last safe state (set after
// loading a saved résumé, a successful Save, or starting a new empty résumé).
// The résumé is dirty when the live serialization differs from that baseline.
// Deterministic + dependency-free → fully unit-testable. resumeId, view state,
// toasts, and save status are intentionally excluded from the comparison.
// ============================================================================

import type {
  ResumeFormData,
  CustomizationSettings,
  TemplateKey,
} from "@/app/components/resume-builder/types";

/** Stable serialization of everything that counts as résumé content. */
export function serializeResumeState(
  formData: ResumeFormData,
  settings: CustomizationSettings,
  template: TemplateKey
): string {
  return JSON.stringify({ formData, settings, template });
}

/** True when the current state differs from the saved baseline. */
export function isResumeDirty(
  baseline: string,
  formData: ResumeFormData,
  settings: CustomizationSettings,
  template: TemplateKey
): boolean {
  return serializeResumeState(formData, settings, template) !== baseline;
}
