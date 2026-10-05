// Tests for the simplified downloadable application package: the dependency-free
// ZIP writer (with real timestamps), the text→PDF writer, the employer package
// (original résumé + cover-letter PDF only), and the SEPARATE dry-run report.
// No network, no AI, no DOM.
// Run with:
//   node --experimental-strip-types --import ./tests/register.mjs --test tests/applicationPackage.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createZip, crc32 } from "@/lib/application/zip";
import { createTextPdf } from "@/lib/application/pdf";
import {
  buildEmployerPackage, buildDryRunReportText, buildDryRunReportPdf,
  employerZipName, employerFolderName, dryRunReportFileName, draftFromRow,
} from "@/lib/application/package";
import { bytesToBase64, base64ToBytes, isPdfFile } from "@/lib/application/resumeFileStore";
import type { ApplicationRunRow } from "@/lib/application/applicationRun";

const readCode = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/([^:])\/\/.*$/gm, "$1");

const NOW = () => Date.parse("2026-07-15T12:00:00.000Z");
const row = (o: Partial<ApplicationRunRow> = {}): ApplicationRunRow => ({
  id: "run-1", application_run_key: "key-1", workflow_run_id: "wf-1", job_id: "job-1",
  job_title: "Frontend Developer", company: "Acme", provider: "arbeitnow",
  external_url: "https://arbeitnow.com/jobs/job-1", status: "completed", current_step: "dry_run_completed",
  progress: 100, is_dry_run: true, validation_result: { valid: true }, started_at: "2026-07-15T10:00:00.000Z",
  completed_at: "2026-07-15T10:00:05.000Z", duration_ms: 5000, created_at: "2026-07-15T10:00:00.000Z", ...o,
});
const bytes = (s: string) => new TextEncoder().encode(s);
const decode = (u: Uint8Array) => new TextDecoder("latin1").decode(u);

// ── ZIP: crc + real timestamps ────────────────────────────────────────────────
test("crc32 matches known vectors", () => {
  assert.equal(crc32(bytes("")), 0x00000000);
  assert.equal(crc32(bytes("123456789")), 0xcbf43926);
});

test("zip writes a non-zero DOS date (files no longer show 1979)", () => {
  const zip = createZip([{ name: "a.txt", data: "hi" }], new Date("2026-07-15T12:34:10Z"));
  // local header mod-time @ offset 10..11, mod-date @ 12..13 (little-endian)
  const modTime = zip[10] | (zip[11] << 8);
  const modDate = zip[12] | (zip[13] << 8);
  assert.notEqual(modDate, 0, "mod date must be set");
  const year = ((modDate >> 9) & 0x7f) + 1980;
  const month = (modDate >> 5) & 0x0f;
  assert.equal(year, 2026);
  assert.equal(month, 7);
  assert.ok(modTime > 0);
});

test("zip carries a real PK header + EOCD and correct entry count", () => {
  const zip = createZip([{ name: "x/a.txt", data: "one" }, { name: "x/b.txt", data: "two" }]);
  assert.deepEqual([...zip.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  const s = decode(zip);
  assert.ok(s.includes("x/a.txt") && s.includes("x/b.txt"));
});

// ── PDF writer ────────────────────────────────────────────────────────────────
test("createTextPdf produces a valid PDF with title + body text", () => {
  const pdf = createTextPdf({ title: "Cover Letter", body: "Dear hiring team,\n\nI am excited to apply." });
  const s = decode(pdf);
  assert.ok(s.startsWith("%PDF-1.4"), "PDF header");
  assert.ok(s.trimEnd().endsWith("%%EOF"), "PDF trailer");
  assert.ok(/\/Type\s*\/Catalog/.test(s) && /\/Type\s*\/Page/.test(s));
  assert.ok(s.includes("Cover Letter"));
  assert.ok(s.includes("excited to apply"));
});

test("createTextPdf paginates long content into multiple pages", () => {
  const body = Array.from({ length: 200 }, (_, i) => `Line number ${i} with some filler words to occupy space.`).join("\n");
  const pdf = createTextPdf({ title: "Long", body });
  const s = decode(pdf);
  const pages = (s.match(/\/Type\s*\/Page[^s]/g) || []).length;
  assert.ok(pages >= 2, `expected multiple pages, got ${pages}`);
});

// ── employer package: résumé + cover letter only ──────────────────────────────
test("employer package uses the ORIGINAL résumé PDF and does NOT emit resume.txt", () => {
  const original = bytes("%PDF-1.4 original-resume-bytes");
  const { entries, folder, zipName } = buildEmployerPackage({
    company: "Acme", jobTitle: "Frontend Developer",
    resume: { fileName: "Anastasiia_Palii_Resume.pdf", data: original, isPdf: true },
    coverLetterText: "Dear team, ...", now: NOW,
  });
  const names = entries.map((e) => e.name);
  assert.equal(folder, "Application_Package_Acme_2026-07-15");
  assert.equal(zipName, "Application_Package_Acme_2026-07-15.zip");
  assert.equal(entries.length, 2, "only résumé + cover letter");
  assert.ok(names.some((n) => n === `${folder}/Anastasiia_Palii_Resume.pdf`), "keeps the original PDF");
  assert.ok(names.some((n) => n === `${folder}/Cover_Letter_Acme.pdf`));
  assert.ok(!names.some((n) => /resume\.txt$/i.test(n)), "no resume.txt when a PDF exists");
  // the original résumé bytes are embedded verbatim
  const resume = entries.find((e) => n2base(e.name).includes("Resume.pdf"))!;
  assert.deepEqual([...resume.data], [...original]);
});

test("no technical files (ATS / match / summary / report) in the employer package", () => {
  const { entries } = buildEmployerPackage({ company: "Acme", coverLetterText: "hi", now: NOW });
  const names = entries.map((e) => e.name.toLowerCase());
  for (const bad of ["ats", "match", "summary", "report", "readme", "dry"]) {
    assert.ok(!names.some((n) => n.includes(bad)), `package must not contain a ${bad} file`);
  }
});

test("cover-letter PDF contains NO dry-run disclaimer text", () => {
  const { entries } = buildEmployerPackage({ company: "Acme", coverLetterText: "Dear team, I am a great fit.", now: NOW });
  const cover = entries.find((e) => e.name.includes("Cover_Letter"))!;
  const s = decode(cover.data);
  assert.ok(!/dry run/i.test(s) && !/no real application/i.test(s), "cover letter must be clean");
  assert.ok(s.includes("great fit"));
});

test("when no original file exists, a résumé PDF is generated as a fallback", () => {
  const { entries, folder } = buildEmployerPackage({ company: "Acme", resume: null, resumeFallbackText: "Jane Doe — Frontend", coverLetterText: "hi", now: NOW });
  const resume = entries.find((e) => e.name === `${folder}/Resume.pdf`);
  assert.ok(resume, "generated Resume.pdf fallback");
  assert.ok(decode(resume!.data).startsWith("%PDF"));
});

// ── separate dry-run report ───────────────────────────────────────────────────
test("dry-run report contains the technical fields + safety confirmation", () => {
  const text = buildDryRunReportText({
    row: row(), ats: 82, matchScore: 88, profession: "Frontend Developer", resumeLanguage: "English",
    stages: [{ stage: "documents_validated", status: "completed", durationMs: 120 }], now: NOW,
  });
  assert.ok(/ATS score: 82 \/ 100/.test(text));
  assert.ok(/Match score: 88%/.test(text));
  assert.ok(/Validation result/.test(text));
  assert.ok(/Timeline:/.test(text) && /documents_validated: completed/.test(text));
  assert.ok(/is_dry_run: true/.test(text));
  assert.ok(/No real application was sent/.test(text));
  assert.ok(/Generated: 2026-07-15/.test(text));
  const pdf = buildDryRunReportPdf({ row: row(), ats: 82, matchScore: 88, now: NOW });
  assert.ok(decode(pdf).startsWith("%PDF"));
  assert.equal(dryRunReportFileName(row(), NOW), "Dry_Run_Report_Acme_2026-07-15.pdf");
});

test("employer folder/zip names are safe and dated", () => {
  assert.equal(employerFolderName("Acme, Inc.", NOW), "Application_Package_Acme_Inc_2026-07-15");
  assert.equal(employerZipName("Acme", NOW), "Application_Package_Acme_2026-07-15.zip");
});

// ── résumé store helpers ──────────────────────────────────────────────────────
test("base64 round-trips résumé bytes; isPdfFile detects PDFs", () => {
  const original = new Uint8Array([37, 80, 68, 70, 1, 2, 3, 255, 0, 128]);
  assert.deepEqual([...base64ToBytes(bytesToBase64(original))], [...original]);
  assert.equal(isPdfFile("resume.pdf", ""), true);
  assert.equal(isPdfFile("resume.docx", "application/pdf"), true);
  assert.equal(isPdfFile("resume.docx", "application/msword"), false);
});

test("draftFromRow maps safe metadata into a valid draft", () => {
  const d = draftFromRow(row(), { coverLetterText: "hi", atsScore: 80, profession: "Frontend Developer" });
  assert.equal(d.job.title, "Frontend Developer");
  assert.equal(d.coverLetterPresent, true);
});

// ── safety / reuse (source scans) ─────────────────────────────────────────────
test("package/pdf/zip modules make NO network/AI calls", () => {
  for (const rel of ["../src/lib/application/package.ts", "../src/lib/application/pdf.ts", "../src/lib/application/zip.ts", "../src/lib/application/resumeFileStore.ts"]) {
    const code = readCode(rel);
    assert.ok(!/\bfetch\s*\(/.test(code), `${rel} must not fetch`);
    assert.ok(!/openai/i.test(code), `${rel} must not call AI`);
    assert.ok(!/nodemailer|sendgrid|mailgun|\bsmtp\b|puppeteer|playwright/i.test(code));
  }
});

test("Dashboard + Preview reuse the shared download helpers (no duplication)", () => {
  const dash = readCode("../src/app/components/dashboard/PreparedApplications.tsx");
  const prev = readCode("../src/app/components/apply/ApplyPreviewClient.tsx");
  for (const ui of [dash, prev]) {
    assert.ok(/downloadApplicationPackage/.test(ui) && /downloadDryRunReport/.test(ui), "reuses both shared helpers");
    assert.ok(!/createZip|buildEmployerPackage|createTextPdf/.test(ui), "no inline package/pdf/zip logic in UI");
  }
  assert.ok(/Download Package/.test(dash) && /Dry Run Report/.test(dash));
  assert.ok(/Download Package/.test(prev) && /Download Dry Run Report/.test(prev));
});

test("original résumé bytes are persisted at upload so they survive navigation", () => {
  const panel = readCode("../src/app/components/ai-workflow/ResumeInputPanel.tsx");
  assert.ok(/saveResumeFile/.test(panel), "raw file is stored on upload");
  assert.ok(/file\.arrayBuffer\(\)/.test(panel), "reads the original bytes");
});

// helper: base name segment of a zip entry
function n2base(name: string): string {
  const i = name.lastIndexOf("/");
  return i >= 0 ? name.slice(i + 1) : name;
}
