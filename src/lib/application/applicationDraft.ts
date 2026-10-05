// ============================================================================
// application/applicationDraft — client-only draft handoff (localStorage)
// ----------------------------------------------------------------------------
// The "Prepare Application" button snapshots the selected vacancy + run context
// into localStorage; the preview page reads it. Browser-only, no network. The
// cover-letter PREVIEW kept here is shown on the user's own screen and is never
// written to the database events.
// ============================================================================

import type { ApplicationDraft } from "@/lib/application/types";
import { writeScoped, readScoped, removeScoped } from "@/lib/security/clientStorage";

/** LEGACY unscoped key (pre-Pass-B); retained for cleanup. New writes are
 *  user-scoped via clientStorage ("application-draft"). */
export const APPLICATION_DRAFT_KEY = "careerai:application-draft";

const hasStorage = (): boolean => typeof window !== "undefined" && !!window.localStorage;

export function saveApplicationDraft(draft: ApplicationDraft, userId?: string | null): void {
  if (!hasStorage()) return;
  writeScoped("application-draft", draft, userId);
}

export function readApplicationDraft(userId?: string | null): ApplicationDraft | null {
  if (!hasStorage()) return null;
  const parsed = readScoped<ApplicationDraft>("application-draft", userId);
  if (!parsed || typeof parsed !== "object" || !parsed.job) return null;
  return parsed;
}

export function clearApplicationDraft(userId?: string | null): void {
  if (!hasStorage()) return;
  removeScoped("application-draft", userId);
}
