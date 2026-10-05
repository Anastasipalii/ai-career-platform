// ============================================================================
// resume/pdfBlob — dependency-free PDF Blob validation + browser download.
// ----------------------------------------------------------------------------
// This module does NOT generate PDFs. It validates a Blob that some engine
// produced (the real @react-pdf/renderer engine will be added in a later,
// unblocked step) and triggers a browser download of it. Framework-independent;
// the validator is pure/async and never throws unpredictably.
// ============================================================================

/** Status of a (future) PDF generation flow. Prepared here so the generator and
 *  its UI can share one truthful vocabulary. NOTE: intentionally NOT wired into
 *  any component yet — no generator exists until the engine is unblocked. */
export type PdfGenStatus = "idle" | "generating" | "error";

export interface PdfValidationResult {
  valid: boolean;
  /** Human-readable reason when invalid (safe to surface in a toast). */
  reason?: string;
}

export interface DownloadResult {
  ok: boolean;
  reason?: string;
}

// "%PDF-" — the signature every real PDF begins with.
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
// Sanity ceiling: a résumé PDF far above this is almost certainly a bug.
const MAX_REASONABLE_BYTES = 50 * 1024 * 1024;
// How long to keep an object URL alive after the click before revoking it.
const REVOKE_DELAY_MS = 40_000;

/**
 * Validate that a Blob is a plausible, non-empty PDF. Checks existence, a
 * sensible size, the MIME type WHERE PRESENT (some engines leave it blank), and
 * the leading "%PDF-" byte signature. Returns a result object; the only I/O
 * (reading the first bytes) is wrapped so this never throws unpredictably.
 */
export async function validatePdfBlob(blob: Blob | null | undefined): Promise<PdfValidationResult> {
  if (!blob) return { valid: false, reason: "No PDF was produced." };

  const size = (blob as Blob).size;
  if (typeof size !== "number" || Number.isNaN(size) || size <= 0) {
    return { valid: false, reason: "The PDF is empty." };
  }
  if (size > MAX_REASONABLE_BYTES) {
    return { valid: false, reason: "The PDF is unexpectedly large." };
  }

  // MIME, when the engine sets one, must look like a PDF. A blank type is
  // tolerated (validation then relies on the signature below).
  const type = (blob as Blob).type;
  if (type && !/^application\/(x-)?pdf(\b|;|$)/i.test(type)) {
    return { valid: false, reason: "The file is not a PDF." };
  }

  // Read and verify the first five bytes: "%PDF-".
  try {
    const head = await blob.slice(0, PDF_SIGNATURE.length).arrayBuffer();
    const bytes = new Uint8Array(head);
    if (bytes.length < PDF_SIGNATURE.length || !PDF_SIGNATURE.every((b, i) => bytes[i] === b)) {
      return { valid: false, reason: "The PDF appears to be corrupted." };
    }
  } catch {
    return { valid: false, reason: "The PDF could not be read." };
  }

  return { valid: true };
}

/**
 * Trigger a browser download of a Blob under `filename`. Generic and
 * engine-agnostic: creates an object URL, clicks a hidden temporary anchor,
 * removes it, then revokes the URL after a safe delay. Returns a result object
 * instead of throwing; a non-browser environment is reported, not crashed.
 */
export function downloadBlob(blob: Blob | null | undefined, filename: string): DownloadResult {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof URL === "undefined") {
    return { ok: false, reason: "Downloads are only available in the browser." };
  }
  if (!blob) return { ok: false, reason: "There is nothing to download." };

  let url: string | null = null;
  try {
    url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename || "download";
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { ok: true };
  } catch {
    return { ok: false, reason: "The download could not be started." };
  } finally {
    if (url) {
      const toRevoke = url;
      setTimeout(() => {
        try { URL.revokeObjectURL(toRevoke); } catch { /* already gone */ }
      }, REVOKE_DELAY_MS);
    }
  }
}
