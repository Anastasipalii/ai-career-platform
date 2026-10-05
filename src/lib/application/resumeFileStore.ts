// ============================================================================
// application/resumeFileStore — persist the ORIGINAL uploaded résumé bytes
// ----------------------------------------------------------------------------
// The résumé upload only extracted TEXT before; the raw file was discarded, so
// the original PDF did not survive navigation. This stores the raw bytes
// (base64) in localStorage at upload time so the Dashboard / Preview can bundle
// the real file into the application package. Client-only, size-guarded, no
// network. Only safe for the current user's own browser.
// ============================================================================

import { writeScoped, readScoped, removeScoped } from "@/lib/security/clientStorage";

export interface StoredResumeFile {
  name: string;
  type: string;
  bytes: Uint8Array;
  savedAt: string;
}

/** LEGACY unscoped key (pre-Pass-B); retained for cleanup. New writes are
 *  user-scoped via clientStorage ("resume-file"). */
export const RESUME_FILE_LEGACY_KEY = "careerai:resume-file";
const MAX_BYTES = 4 * 1024 * 1024; // don't blow the localStorage quota

const hasStorage = (): boolean => typeof window !== "undefined" && !!window.localStorage;

export function isPdfFile(name?: string | null, type?: string | null): boolean {
  return /\.pdf$/i.test(name ?? "") || (type ?? "").toLowerCase() === "application/pdf";
}

/** base64 helpers — exported for testing; work in browser and Node. */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  if (typeof btoa === "function") return btoa(bin);
  // Node fallback
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/** Save the raw uploaded file. Oversized files are skipped (fallback is used). */
export function saveResumeFile(file: { name: string; type: string; bytes: Uint8Array }, userId?: string | null): void {
  if (!hasStorage()) return;
  try {
    if (file.bytes.byteLength > MAX_BYTES) {
      clearResumeFile(userId);
      return;
    }
    // Raw résumé bytes are sensitive → written ONLY under the owning user's
    // scoped key, never the legacy global key.
    writeScoped(
      "resume-file",
      { name: file.name, type: file.type, dataBase64: bytesToBase64(file.bytes), savedAt: new Date().toISOString() },
      userId,
    );
  } catch {
    /* quota / serialization — silently skip; the generated-PDF fallback covers it */
  }
}

export function readResumeFile(userId?: string | null): StoredResumeFile | null {
  if (!hasStorage()) return null;
  try {
    const parsed = readScoped<{ name?: string; type?: string; dataBase64?: string; savedAt?: string }>("resume-file", userId);
    if (!parsed?.dataBase64) return null;
    return {
      name: parsed.name ?? "resume",
      type: parsed.type ?? "",
      bytes: base64ToBytes(parsed.dataBase64),
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearResumeFile(userId?: string | null): void {
  if (!hasStorage()) return;
  removeScoped("resume-file", userId);
}
