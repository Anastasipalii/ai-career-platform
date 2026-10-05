// ============================================================================
// security/clientStorage — account-isolated browser storage for CareerAI.
//
// THE INVARIANT (Security Pass B): on a shared device, after User A logs out and
// User B logs in, User B must never see any of User A's CareerAI browser state.
//
// How this is guaranteed:
//   - Every sensitive CareerAI value is written under a USER-SCOPED key:
//       careerai:u:<userId>:<feature>
//     so a different user simply reads a different (empty) key.
//   - Legacy UNSCOPED sensitive keys from earlier releases are DELETED (never
//     migrated into any user's namespace — ownership cannot be proven).
//   - On logout / account switch / sign-out the previous user's scoped keys and
//     the legacy unscoped keys are cleared.
//
// Hard safety rules:
//   - NEVER call localStorage.clear().
//   - NEVER touch Supabase auth/session storage (keys starting with "sb-" or
//     containing "supabase"/"auth-token") — sign-out goes through Supabase APIs.
//   - Only ever manage CareerAI-owned keys.
//   - All access is wrapped so storage-unavailable / quota / private-mode throws
//     are swallowed; stored VALUES are never logged.
//   - No userId in a key beyond the opaque Supabase user id (no email / PII).
// ============================================================================

/** CareerAI features that persist sensitive user content in the browser. */
export type StorageFeature =
  | "workflow-results"
  | "application-draft"
  | "resume-file"
  | "career-path-state";

/** Legacy UNSCOPED keys used by earlier releases — all sensitive → delete, never migrate. */
export const LEGACY_SENSITIVE_KEYS: readonly string[] = [
  "careerai:workflow-results",
  "careerai:application-draft",
  "careerai:resume-file",
  "career-planner-state",
];

const SCOPE_PREFIX = "careerai:u:";

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

/** A key we must never delete or read as if it were ours (Supabase auth, etc.). */
function isProtectedForeignKey(key: string): boolean {
  return key.startsWith("sb-") || /supabase|auth-token/i.test(key);
}

// ── Verified current user (set by the Supabase auth listener) ────────────────
let currentUserId: string | null = null;

/** Set from the auth listener on sign-in/refresh (id), and null on sign-out. */
export function setCurrentUserId(id: string | null): void {
  currentUserId = id && typeof id === "string" ? id : null;
}
export function getCurrentUserId(): string | null {
  return currentUserId;
}

/** Build the scoped key for a feature, or null when no owning user is known. */
export function scopedKey(feature: StorageFeature, userId?: string | null): string | null {
  const uid = (userId ?? currentUserId) || null;
  if (!uid) return null;
  return `${SCOPE_PREFIX}${uid}:${feature}`;
}

// ── Safe primitives (never throw, never log values) ──────────────────────────
function rawGet(key: string): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function rawSet(key: string, value: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota / serialization / private mode — skip silently */
  }
}
function rawRemove(key: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ── Scoped JSON accessors used by feature stores ─────────────────────────────
export function writeScoped(feature: StorageFeature, value: unknown, userId?: string | null): void {
  const key = scopedKey(feature, userId);
  if (!key) return; // no owner known → never write sensitive data unscoped
  try {
    rawSet(key, JSON.stringify(value));
  } catch {
    /* serialization error — skip */
  }
}

export function readScopedRaw(feature: StorageFeature, userId?: string | null): string | null {
  const key = scopedKey(feature, userId);
  if (!key) return null;
  return rawGet(key);
}

export function readScoped<T>(feature: StorageFeature, userId?: string | null): T | null {
  const raw = readScopedRaw(feature, userId);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function removeScoped(feature: StorageFeature, userId?: string | null): void {
  const key = scopedKey(feature, userId);
  if (!key) return;
  rawRemove(key);
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

/** Delete legacy UNSCOPED sensitive keys (ownership unprovable → never migrate). */
export function purgeLegacyUnscopedSensitiveKeys(): void {
  for (const key of LEGACY_SENSITIVE_KEYS) rawRemove(key);
}

/** Remove every CareerAI user-scoped key belonging to one user. */
export function clearUserScoped(userId: string): void {
  if (!userId || !hasStorage()) return;
  const prefix = `${SCOPE_PREFIX}${userId}:`;
  let keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix) && !isProtectedForeignKey(k)) keys.push(k);
    }
  } catch {
    keys = [];
  }
  for (const k of keys) rawRemove(k);
}

/**
 * Clear ALL CareerAI sensitive browser state at a logout / account transition:
 * the given (or current) user's scoped keys + every legacy unscoped key.
 * Never touches Supabase auth storage; never calls localStorage.clear().
 */
export function clearCareerAISensitive(userId?: string | null): void {
  const uid = (userId ?? currentUserId) || null;
  if (uid) clearUserScoped(uid);
  purgeLegacyUnscopedSensitiveKeys();
}
