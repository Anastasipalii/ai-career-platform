// Tests for the dependency-free PDF Blob validation + browser download helper
// (Phase D Step 2A). The module NEVER generates a PDF. Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/pdfBlob.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validatePdfBlob, downloadBlob } from "@/lib/resume/pdfBlob";
import type { PdfGenStatus } from "@/lib/resume/pdfBlob";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

// ── PdfGenStatus type is prepared with the three truthful states ──────────────
test("PdfGenStatus admits idle | generating | error", () => {
  const states: PdfGenStatus[] = ["idle", "generating", "error"];
  assert.deepEqual(states, ["idle", "generating", "error"]);
});

// ── validatePdfBlob ───────────────────────────────────────────────────────────
test("null / undefined blob is invalid, not a throw", async () => {
  assert.deepEqual((await validatePdfBlob(null)).valid, false);
  assert.deepEqual((await validatePdfBlob(undefined)).valid, false);
});

test("empty (zero-byte) blob is invalid", async () => {
  const r = await validatePdfBlob(new Blob([], { type: "application/pdf" }));
  assert.equal(r.valid, false);
  assert.match(r.reason!, /empty/i);
});

test("a non-PDF MIME type is rejected", async () => {
  const r = await validatePdfBlob(new Blob(["%PDF-1.4"], { type: "text/plain" }));
  assert.equal(r.valid, false);
  assert.match(r.reason!, /not a pdf/i);
});

test("content without the %PDF- signature is rejected", async () => {
  const r = await validatePdfBlob(new Blob(["hello, not a pdf"], { type: "application/pdf" }));
  assert.equal(r.valid, false);
  assert.match(r.reason!, /corrupt/i);
});

test("an unreasonably large blob is rejected", async () => {
  const fake = { size: 60 * 1024 * 1024, type: "application/pdf" } as unknown as Blob;
  const r = await validatePdfBlob(fake);
  assert.equal(r.valid, false);
  assert.match(r.reason!, /large/i);
});

test("a real PDF (signature + pdf MIME) is valid", async () => {
  const r = await validatePdfBlob(new Blob(["%PDF-1.7\n%\xE2\xE3\xCF\xD3\n...body..."], { type: "application/pdf" }));
  assert.equal(r.valid, true);
});

test("a PDF with a blank MIME type is accepted on the signature alone", async () => {
  const r = await validatePdfBlob(new Blob(["%PDF-1.4\nstuff"]));
  assert.equal(r.valid, true);
});

// ── downloadBlob ──────────────────────────────────────────────────────────────
test("downloadBlob reports the browser requirement outside a browser", () => {
  // In Node there is no window/document, so it must refuse gracefully.
  const r = downloadBlob(new Blob(["%PDF-1.4"]), "x.pdf");
  assert.equal(r.ok, false);
  assert.match(r.reason!, /browser/i);
});

test("downloadBlob drives the full anchor lifecycle in a browser-like env", (t) => {
  const origWindow = (globalThis as Record<string, unknown>).window;
  const origDocument = (globalThis as Record<string, unknown>).document;
  const origURL = (globalThis as Record<string, unknown>).URL;

  let createdWith: Blob | null = null;
  let revoked: string | null = null;
  let clicked = false;
  let removed = false;
  let appended: unknown = null;
  const anchor: Record<string, unknown> = {
    style: {},
    click: () => { clicked = true; },
    remove: () => { removed = true; },
  };

  t.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    (globalThis as Record<string, unknown>).window = {};
    (globalThis as Record<string, unknown>).document = {
      createElement: () => anchor,
      body: { appendChild: (el: unknown) => { appended = el; } },
    };
    (globalThis as Record<string, unknown>).URL = {
      createObjectURL: (b: Blob) => { createdWith = b; return "blob:fake-123"; },
      revokeObjectURL: (u: string) => { revoked = u; },
    };

    const blob = new Blob(["%PDF-1.4"]);
    const r = downloadBlob(blob, "Jane Doe Resume.pdf");

    assert.equal(r.ok, true);
    assert.equal(createdWith, blob, "object URL created from the blob");
    assert.equal(anchor.href, "blob:fake-123", "anchor points at the object URL");
    assert.equal(anchor.download, "Jane Doe Resume.pdf", "download uses the filename");
    assert.equal(appended, anchor, "anchor appended to the document");
    assert.equal(clicked, true, "anchor clicked");
    assert.equal(removed, true, "anchor removed after click");
    assert.equal(revoked, null, "URL not revoked immediately");

    // The object URL is revoked only after the safe delay.
    t.mock.timers.tick(45_000);
    assert.equal(revoked, "blob:fake-123", "URL revoked after the delay");
  } finally {
    t.mock.timers.reset();
    (globalThis as Record<string, unknown>).window = origWindow;
    (globalThis as Record<string, unknown>).document = origDocument;
    (globalThis as Record<string, unknown>).URL = origURL;
  }
});

// ── guard: module does not generate PDFs or pull a PDF engine ─────────────────
test("pdfBlob.ts neither imports @react-pdf nor claims to generate PDFs", () => {
  const src = read("../src/lib/resume/pdfBlob.ts");
  assert.ok(!/(from\s+|import\s*\(\s*|require\s*\(\s*)["\x27]@react-pdf\/renderer["\x27]/.test(src), "no @react-pdf import");
  assert.ok(!/\brenderToStream\b|\brenderToBuffer\b|\brenderToFile\b|\bReactPDF\b/.test(src), "no PDF generation calls");
});
