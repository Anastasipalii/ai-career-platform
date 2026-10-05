// Regression guard for the dictation hydration mismatch.
// The bug: `supported` was computed during render (getCtor() !== null), so the
// server rendered "…isn't supported…" while the first client render produced
// "Dictate…", and React reported a hydration mismatch on the mic title. The fix:
// capability is detected ONLY after mount, so SSR and the first client render
// agree (both `false`). These lock that hydration-safe shape.
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/dictationHydration.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const HOOK = read("../src/lib/resume/useDictation.ts");

test("capability is read via useSyncExternalStore with a false server snapshot (deterministic SSR/first render)", () => {
  assert.ok(/useSyncExternalStore\(/.test(HOOK), "capability uses useSyncExternalStore");
  // The server + first-hydration snapshot must be a constant false, matching SSR.
  assert.ok(/\(\) => false/.test(HOOK), "server snapshot returns false");
  // The client snapshot performs the real detection.
  assert.ok(/\(\) => getCtor\(\) !== null/.test(HOOK), "client snapshot detects capability");
});

test("capability is NOT computed as a render-time constant or a setState-in-effect", () => {
  assert.ok(!/const supported = getCtor\(\) !== null;/.test(HOOK),
    "the render-time capability constant (the mismatch cause) is gone");
  assert.ok(!/setSupported/.test(HOOK),
    "no setState-in-effect capability toggle (project react-hooks rule)");
});

test("SSR-safe detection: getCtor guards against a missing window", () => {
  assert.ok(/typeof window === "undefined"/.test(HOOK), "getCtor returns null on the server");
});

test("mic titles are gated on the shared controller's `supported` (so the fix covers every site)", () => {
  const input = read("../src/app/components/resume-builder/DictatableInput.tsx");
  assert.ok(/dictation\.supported \?/.test(input), "DictatableInput title depends on supported");
  const form = read("../src/app/components/resume-builder/ResumeForm.tsx");
  assert.ok((form.match(/dictation\.supported \?/g) || []).length >= 2,
    "both ResumeForm mic buttons gate their title on supported");
  // Behaviour preserved: unsupported browsers still receive the unsupported copy.
  assert.ok(input.includes("Voice dictation isn't supported in this browser"), "unsupported copy retained");
});
