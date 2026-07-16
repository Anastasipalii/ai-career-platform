// ============================================================================
// dbSafe — sanitize values before writing to Postgres/jsonb (fixes 22P05)
// ----------------------------------------------------------------------------
// PostgreSQL rejects text/jsonb containing a NUL character (U+0000) or an
// unpaired UTF-16 surrogate with SQLSTATE 22P05 "unsupported Unicode escape
// sequence" (and the request surfaces as HTTP 400). Résumé text extracted from
// PDFs frequently contains NUL bytes. This deep-cleans string leaves in any
// value before persistence: it removes NUL, other C0/C1 control characters
// (except tab/newline/carriage-return), and unpaired surrogate code units.
// It PRESERVES all valid characters — German umlauts and every accent/
// international character are untouched. Pure; no logging.
// ============================================================================

// Control chars to strip: C0 except \t(0009) \n(000A) \r(000D), DEL + C1 range.
// Built from an escaped string so the source contains NO literal control bytes.
const CONTROL_RE = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F]", "g");

/** Clean a single string for safe DB storage. */
export function sanitizeDbString(input: string): string {
  let s = input.replace(CONTROL_RE, "");
  // Remove unpaired surrogates (invalid Unicode → invalid JSON → 22P05).
  s = s.replace(/[\uD800-\uDFFF]/g, (ch, idx: number, str: string) => {
    const code = ch.charCodeAt(0);
    if (code <= 0xdbff) {
      const next = str.charCodeAt(idx + 1);
      return next >= 0xdc00 && next <= 0xdfff ? ch : ""; // high surrogate needs a following low
    }
    const prev = str.charCodeAt(idx - 1);
    return prev >= 0xd800 && prev <= 0xdbff ? ch : ""; // low surrogate needs a preceding high
  });
  return s;
}

/** Deep-clean any JSON-serializable value's string leaves for DB storage. */
export function sanitizeForDb<T>(value: T): T {
  if (typeof value === "string") return sanitizeDbString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeForDb(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = sanitizeForDb(v);
    return out as unknown as T;
  }
  return value;
}
