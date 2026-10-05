// ============================================================================
// resume/parseResumeFile — shared CLIENT-SIDE résumé file parser
// ----------------------------------------------------------------------------
// The single, shared implementation for turning an uploaded résumé file into
// plain text: .txt/.md (read directly), .pdf (pdfjs-dist), .docx (mammoth).
// All parsing runs in the browser via dynamic imports — the file's bytes are
// NEVER uploaded to our server by this module (privacy by design).
//
// The low-level extractors (extractPdfText / extractDocxText) were moved here
// verbatim from ai-workflow/ResumeInputPanel.tsx so there is exactly ONE
// parsing implementation. No OCR: scanned/image-only PDFs yield no text and
// surface as the typed `pdf_no_text` error.
// ============================================================================

// ── Minimal shapes for the dynamically-imported parsers (avoids depending on
//    the packages' own type exports; casts stay valid across versions). ──────
type PdfTextItem = { str?: string };
type PdfPage = { getTextContent: () => Promise<{ items: PdfTextItem[] }> };
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfjsModule = {
  version: string;
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> };
};
type MammothModule = {
  extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};

/** Stable error codes so UI callers can map to their own copy without
 *  string-matching messages. */
export type ResumeParseErrorCode =
  | "unsupported_type"
  | "empty_file"
  | "pdf_no_text"
  | "docx_failed"
  | "read_failed"
  | "parse_failed";

export class ResumeParseError extends Error {
  readonly code: ResumeParseErrorCode;
  constructor(code: ResumeParseErrorCode, message: string) {
    super(message);
    this.name = "ResumeParseError";
    this.code = code;
  }
}

export type ResumeFileKind = "text" | "pdf" | "docx";

export interface ParsedResumeFile {
  /** Extracted, trimmed plain text. */
  text: string;
  /** Which extractor produced the text. */
  kind: ResumeFileKind;
  /** Original file name (for display / downstream summaries). */
  fileName: string;
}

// Extract text from a PDF using pdfjs-dist. The worker is served from the app
// itself (copied into /public) so its version always matches the installed
// package — no CDN dependency and no version-mismatch 404s.
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = (await import("pdfjs-dist")) as unknown as PdfjsModule;
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => it.str ?? "").join(" ") + "\n";
  }
  return out.trim();
}

// Extract text from a .docx using mammoth (handles CJS default-interop).
export async function extractDocxText(file: File): Promise<string> {
  const mod = (await import("mammoth")) as unknown as MammothModule & { default?: MammothModule };
  const mammoth = mod.default ?? mod;
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value.trim();
}

/** Classify a file by extension + MIME type. Extension is checked first because
 *  browsers/OSes report inconsistent MIME types. */
export function classifyResumeFile(
  file: File
): ResumeFileKind | "legacy_doc" | "unsupported" {
  const name = file.name ?? "";
  const type = file.type ?? "";
  const isText =
    type === "text/plain" || type === "text/markdown" || /\.(txt|md|markdown)$/i.test(name);
  if (isText) return "text";
  if (/\.pdf$/i.test(name) || type === "application/pdf") return "pdf";
  if (
    /\.docx$/i.test(name) ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (/\.doc$/i.test(name) || type === "application/msword") return "legacy_doc";
  return "unsupported";
}

/**
 * High-level shared parser: classify → extract plain text, with typed errors.
 * Client-side only; never uploads the file. No OCR. Callers decide what to do
 * with the returned text (e.g. slice to a max length, structure it, etc.).
 */
export async function parseResumeFile(file: File): Promise<ParsedResumeFile> {
  if (!file) throw new ResumeParseError("read_failed", "No file was provided.");
  if (file.size === 0) {
    throw new ResumeParseError("empty_file", "This file is empty. Choose a file with content.");
  }

  const kind = classifyResumeFile(file);

  if (kind === "unsupported") {
    throw new ResumeParseError(
      "unsupported_type",
      "Unsupported file. Upload a .txt, .md, .pdf, or .docx file."
    );
  }
  if (kind === "legacy_doc") {
    throw new ResumeParseError(
      "unsupported_type",
      "Legacy .doc isn't supported. Save it as .docx or PDF, or paste the text instead."
    );
  }

  if (kind === "text") {
    let text: string;
    try {
      text = (await file.text()).trim();
    } catch {
      throw new ResumeParseError(
        "read_failed",
        "Could not read that file. Try pasting the text instead."
      );
    }
    if (!text) throw new ResumeParseError("empty_file", "This file has no readable text.");
    return { text, kind, fileName: file.name };
  }

  if (kind === "pdf") {
    let text: string;
    try {
      text = await extractPdfText(file);
    } catch {
      throw new ResumeParseError(
        "parse_failed",
        "Automatic extraction failed. Paste your resume text instead."
      );
    }
    if (!text.trim()) {
      throw new ResumeParseError(
        "pdf_no_text",
        "Couldn't read text from this PDF (it may be scanned or image-based). Paste your resume text instead."
      );
    }
    return { text, kind, fileName: file.name };
  }

  // kind === "docx"
  let docxText: string;
  try {
    docxText = await extractDocxText(file);
  } catch {
    throw new ResumeParseError(
      "docx_failed",
      "Couldn't read this .docx file. Paste your resume text instead."
    );
  }
  if (!docxText.trim()) {
    throw new ResumeParseError(
      "docx_failed",
      "This .docx file has no readable text. Paste your resume text instead."
    );
  }
  return { text: docxText, kind, fileName: file.name };
}
