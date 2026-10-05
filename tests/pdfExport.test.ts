// PDF export — temporary print window lifecycle.
// handleDownload opens a throwaway popup, writes the résumé HTML into it, and
// invokes the browser's own print/"Save as PDF" dialog. These tests lock the
// safety + honesty contract of that flow via source-scan (it depends on
// window.open / window.print, which cannot run headlessly):
//   - the temporary popup is cleaned up after the print lifecycle (afterprint),
//   - the MAIN Resume Builder window is never closed,
//   - résumé state is never cleared as a side effect of exporting,
//   - no arbitrary timeout force-closes the window mid-dialog,
//   - the toast never claims the PDF was saved/downloaded (Save vs Cancel is
//     not observable through window.print()).
// Run:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/pdfExport.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const CLIENT = read("../src/app/components/resume-builder/ResumeBuilderClient.tsx");

// Isolate the export handler so assertions can't accidentally match unrelated code.
const handleDownload = (() => {
  const start = CLIENT.indexOf("const handleDownload");
  assert.ok(start >= 0, "handleDownload exists");
  const end = CLIENT.indexOf("const handleDelete", start);
  assert.ok(end > start, "handleDownload is bounded before handleDelete");
  return CLIENT.slice(start, end);
})();

test("export opens a dedicated temporary popup (not the current window)", () => {
  assert.ok(/window\.open\(\s*""\s*,\s*"_blank"/.test(handleDownload), "opens a blank _blank popup");
  assert.ok(handleDownload.includes("printWin"), "holds a reference to the temporary window");
});

test("the temporary popup is cleaned up via the print lifecycle, not a timer", () => {
  assert.ok(handleDownload.includes("printWin.onafterprint"), "closes on the afterprint lifecycle event");
  // The close must live inside the afterprint handler, guarded so a user-closed
  // window doesn't throw.
  const after = handleDownload.slice(handleDownload.indexOf("printWin.onafterprint"));
  assert.ok(/printWin\.close\(\)/.test(after), "afterprint closes the temporary popup");
  assert.ok(/try\s*\{[^}]*printWin\.close\(\)/.test(after), "the close is wrapped in try/catch");
});

test("no arbitrary timeout force-closes the print window", () => {
  // A setTimeout may exist to delay OPENING the dialog, but it must never close.
  const timers = handleDownload.match(/setTimeout\([\s\S]*?\},\s*\d+\);/g) || [];
  for (const t of timers) {
    assert.ok(!/printWin\.close\(\)/.test(t), "no setTimeout body closes the popup");
  }
  // The delayed block triggers the print dialog; it must not close the window.
  assert.ok(/setTimeout\([\s\S]*printWin\.print\(\)/.test(handleDownload), "timeout only opens the dialog");
});

test("exporting never closes the MAIN Resume Builder window", () => {
  // Distinguish window-closing (printWin.close) from the harmless document
  // stream close (printWin.document.close). The only WINDOW close is the popup.
  const windowCloses = handleDownload.match(/(?<!document)\.close\(\)/g) || [];
  const popupCloses = handleDownload.match(/printWin\.close\(\)/g) || [];
  assert.equal(windowCloses.length, popupCloses.length, "every window close() targets the temporary popup only");
  assert.ok(popupCloses.length >= 1, "the temporary popup is closed");
  assert.ok(!/window\.close\(\)/.test(handleDownload), "the app window is never closed");
  assert.ok(!/self\.close\(\)/.test(handleDownload), "the current window never self-closes");
});

test("exporting never clears or resets résumé state as a side effect", () => {
  assert.ok(!/setFormData\(/.test(handleDownload), "does not touch form data");
  assert.ok(!/INITIAL_FORM_DATA/.test(handleDownload), "does not reset to the empty template");
  assert.ok(!/supabase/i.test(handleDownload), "export does not write to the database");
});

test("the export toast is truthful — never claims the PDF was saved/downloaded", () => {
  // Save vs Cancel is NOT observable through window.print(), so the copy must
  // stay at 'opened', never assert success of the save.
  assert.ok(handleDownload.includes('showToast("PDF export opened."'), "uses honest 'opened' wording");
  const forbidden = [
    "Résumé downloaded successfully",
    "Resume downloaded successfully",
    "PDF saved successfully",
    "PDF downloaded",
    "Downloaded successfully",
    "Saved successfully",
  ];
  for (const phrase of forbidden) {
    assert.ok(!handleDownload.includes(phrase), `must not claim "${phrase}"`);
  }
});

test("blocked-popup case is handled with a helpful error, not a false success", () => {
  assert.ok(/if\s*\(!printWin\)/.test(handleDownload), "guards against a null (blocked) popup");
  const blocked = handleDownload.slice(handleDownload.indexOf("if (!printWin)"));
  assert.ok(/Popups are blocked/i.test(blocked), "tells the user popups are blocked");
});
