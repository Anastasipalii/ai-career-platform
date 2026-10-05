// Tests for the deterministic, safe résumé PDF filename (Phase D Step 2A).
// Pure; no DOM. Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/pdfFilename.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { pdfFilename } from "@/lib/resume/pdfFilename";

test("normal name → '<Name> Resume.pdf'", () => {
  assert.equal(pdfFilename("John Smith"), "John Smith Resume.pdf");
});

test("empty / whitespace-only name → 'Resume.pdf'", () => {
  assert.equal(pdfFilename(""), "Resume.pdf");
  assert.equal(pdfFilename("   "), "Resume.pdf");
  assert.equal(pdfFilename("\t\n"), "Resume.pdf");
});

test("filesystem-reserved characters are removed", () => {
  assert.equal(pdfFilename('A/B\\C:D*E?F"G<H>I|J'), "A B C D E F G H I J Resume.pdf");
});

test("control characters are stripped", () => {
  assert.equal(pdfFilename("Jane\u0000\u0007\u001fDoe"), "Jane Doe Resume.pdf");
});

test("path traversal cannot survive (separators removed, leading dots trimmed)", () => {
  assert.equal(pdfFilename("../../etc/passwd"), "etc passwd Resume.pdf");
  assert.equal(pdfFilename("..\\..\\windows"), "windows Resume.pdf");
});

test("leading/trailing dots and spaces are trimmed", () => {
  assert.equal(pdfFilename("  .John Smith.  "), "John Smith Resume.pdf");
});

test("a name of only dots falls back to Resume.pdf", () => {
  assert.equal(pdfFilename("."), "Resume.pdf");
  assert.equal(pdfFilename(".."), "Resume.pdf");
  assert.equal(pdfFilename("...."), "Resume.pdf");
});

test("Unicode names are NFC-normalized and preserved", () => {
  const composed = "José";            // José (single codepoint é)
  const decomposed = "José";          // Jose + combining acute
  assert.equal(pdfFilename(composed), "José Resume.pdf");
  // Decomposed input normalizes to the same bytes as the composed form.
  assert.equal(pdfFilename(decomposed), pdfFilename(composed));
});

test("non-latin names are kept (only reserved/control chars are stripped)", () => {
  assert.equal(pdfFilename("Анастасія Палій"), "Анастасія Палій Resume.pdf");
});

test("overly long names are capped but keep the suffix and extension", () => {
  const name = "X".repeat(500);
  const out = pdfFilename(name);
  assert.ok(out.endsWith(" Resume.pdf"), "keeps the ' Resume.pdf' tail");
  assert.ok(out.length <= "Resume.pdf".length + 120, "capped to a sane length");
  assert.ok(out.startsWith("X"), "keeps the start of the name");
});

test("internal dots (not leading/trailing) are preserved", () => {
  assert.equal(pdfFilename("J. R. R. Tolkien"), "J. R. R. Tolkien Resume.pdf");
});
