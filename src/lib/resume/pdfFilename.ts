// ============================================================================
// resume/pdfFilename — deterministic, safe filename for the résumé PDF.
// ----------------------------------------------------------------------------
// Produces "<Full Name> Resume.pdf" from the résumé's full name, sanitized so
// it is safe both as an <a download> attribute and as a Content-Disposition
// filename. Framework-independent, pure, never throws. This module does NOT
// generate or read a PDF — it only decides the file's name.
//
// Safety guarantees:
//   • Unicode-normalized (NFC) so composed/decomposed names compare stably.
//   • Control characters removed.
//   • Filesystem-reserved characters (/ \ : * ? " < > |) removed — this also
//     neutralizes path traversal, since separators cannot survive.
//   • Collapsed whitespace; unsafe leading/trailing dots and spaces trimmed
//     (a name that is only dots — "." / ".." — can never leak through).
//   • Length-capped to a conservative base length.
//   • Falls back to "Resume.pdf" when no usable name remains.
// ============================================================================

const RESERVED = /[/\\:*?"<>|]/g;        // filesystem-reserved separators/chars
const CONTROL = /[\u0000-\u001f\u007f]/g; // ASCII control chars (incl. NUL)
const SUFFIX = " Resume";
const MAX_BASE = 120;                     // cap on the base name (before ".pdf")
const FALLBACK = "Resume";

/** Sanitize a raw full name into the safe base (without the " Resume" suffix
 *  or extension). Returns "" when nothing usable remains. */
function sanitizeName(fullName: string): string {
  let name = (fullName ?? "").normalize("NFC");
  name = name.replace(CONTROL, " ");
  name = name.replace(RESERVED, " ");
  name = name.replace(/\s+/g, " ").trim();
  // Trim leading/trailing dots and spaces (prevents hidden-file names and the
  // "."/".." traversal remnants once separators are gone).
  name = name.replace(/^[.\s]+/, "").replace(/[.\s]+$/, "");
  return name;
}

/**
 * Build the download filename for a résumé PDF: "<Full Name> Resume.pdf",
 * or "Resume.pdf" when the name is empty/unusable. Deterministic and pure.
 */
export function pdfFilename(fullName: string): string {
  const name = sanitizeName(fullName);
  if (!name) return `${FALLBACK}.pdf`;

  let base = `${name}${SUFFIX}`;
  if (base.length > MAX_BASE) {
    const room = Math.max(1, MAX_BASE - SUFFIX.length);
    base = `${name.slice(0, room).trimEnd()}${SUFFIX}`;
  }
  return `${base}.pdf`;
}
