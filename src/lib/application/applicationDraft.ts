// ============================================================================
// application/applicationDraft — client-only draft handoff (localStorage)
// ----------------------------------------------------------------------------
// The "Prepare Application" button snapshots the selected vacancy + run context
// into localStorage; the preview page reads it. Browser-only, no network. The
// cover-letter PREVIEW kept here is shown on the user's own screen and is never
// written to the database events.
// ============================================================================

import type { ApplicationDraft } from "@/lib/application/types";

export const APPLICATION_DRAFT_KEY = "careerai:application-draft";

const hasStorage = (): boolean => typeof window !== "undefined" && !!window.localStorage;

export function saveApplicationDraft(draft: ApplicationDraft): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(APPLICATION_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota/serialization errors */
  }
}

export function readApplicationDraft(): ApplicationDraft | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(APPLICATION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplicationDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.job) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearApplicationDraft(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(APPLICATION_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
