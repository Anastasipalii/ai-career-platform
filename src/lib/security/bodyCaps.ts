// ============================================================================
// security/bodyCaps — server-side structural caps on request payloads.
//
// Applied to EVERY guarded route BEFORE the provider call. Generic by design:
// it bounds total body size, the length of any single string, any array length,
// nesting depth, and the total count of strings — which together cap the cost a
// single request can impose (résumé text, job descriptions, interview answers,
// LinkedIn/career-path inputs, translation source, workflow payloads, arrays and
// nested JSON) without needing per-route field knowledge. A route's own,
// narrower, meaning-preserving validation still runs on top.
//
// On violation we REJECT (413) — never silently truncate, so meaning is never
// changed server-side.
// ============================================================================

import { CAPS } from "@/lib/security/config";

export type CapViolation =
  | "body_too_large"
  | "string_too_long"
  | "array_too_long"
  | "too_deep"
  | "too_many_strings";

export interface CapResult {
  ok: boolean;
  violation?: CapViolation;
}

/** Byte length of a UTF-8 string (TextEncoder is available in the Node/Edge runtimes used here). */
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * Validate an already-parsed JSON value against the structural caps.
 * Pure + synchronous → directly unit-testable.
 */
export function checkStructuralCaps(value: unknown): CapResult {
  let stringCount = 0;

  const walk = (node: unknown, depth: number): CapResult => {
    if (depth > CAPS.MAX_DEPTH) return { ok: false, violation: "too_deep" };

    if (typeof node === "string") {
      if (node.length > CAPS.MAX_STRING_LEN) return { ok: false, violation: "string_too_long" };
      stringCount += 1;
      if (stringCount > CAPS.MAX_TOTAL_STRINGS) return { ok: false, violation: "too_many_strings" };
      return { ok: true };
    }

    if (Array.isArray(node)) {
      if (node.length > CAPS.MAX_ARRAY_LEN) return { ok: false, violation: "array_too_long" };
      for (const item of node) {
        const r = walk(item, depth + 1);
        if (!r.ok) return r;
      }
      return { ok: true };
    }

    if (node && typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) {
        const r = walk(v, depth + 1);
        if (!r.ok) return r;
      }
      return { ok: true };
    }

    return { ok: true }; // number | boolean | null | undefined
  };

  return walk(value, 0);
}

export type RawBodyResult =
  | { ok: true; text: string }
  | { ok: false; violation: "body_too_large" | "unreadable" };

/**
 * Read a request body as text with a hard byte cap. Reads a CLONE so the caller's
 * original request body stays intact for the route handler's own `req.json()`.
 */
export async function readCappedBody(req: Request): Promise<RawBodyResult> {
  // Cheap pre-check on the declared length, when present.
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > CAPS.MAX_BODY_BYTES) {
    return { ok: false, violation: "body_too_large" };
  }
  let text: string;
  try {
    text = await req.clone().text();
  } catch {
    return { ok: false, violation: "unreadable" };
  }
  if (byteLength(text) > CAPS.MAX_BODY_BYTES) {
    return { ok: false, violation: "body_too_large" };
  }
  return { ok: true, text };
}
