// ============================================================================
// application/pdf — minimal, dependency-free text→PDF writer
// ----------------------------------------------------------------------------
// Produces a clean, professional single-column PDF (US Letter, Helvetica) from
// plain text with an optional bold title. Pure — no DOM, no network, no deps —
// so it is fully unit-testable and safe on the client. Used for the cover-letter
// PDF (employer package) and the dry-run report PDF (separate technical file).
// Output is Latin-1 encoded, so ASCII + common Western-European accents render;
// unsupported glyphs degrade to "?".
// ============================================================================

export interface TextPdfOptions {
  title?: string;
  /** Body text; blank lines separate paragraphs. */
  body: string;
}

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 56;
const BODY_SIZE = 11;
const TITLE_SIZE = 18;
const LEADING = 15;

const sanitize = (s: string): string =>
  (s ?? "").replace(/\t/g, "    ").replace(/[^\x20-\xff]/g, "?");
const escPdf = (s: string): string =>
  sanitize(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (let word of text.split(/\s+/)) {
    while (word.length > maxChars) {
      if (cur) { out.push(cur); cur = ""; }
      out.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!word) continue;
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= maxChars) cur += " " + word;
    else { out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

/** Create a text PDF as bytes. */
export function createTextPdf(opts: TextPdfOptions): Uint8Array {
  const maxChars = Math.max(20, Math.floor((PAGE_W - 2 * MARGIN) / (BODY_SIZE * 0.5)));
  const linesPerPage = Math.floor((PAGE_H - 2 * MARGIN) / LEADING);

  // Flatten body into wrapped lines (blank lines preserved as paragraph gaps).
  const lines: string[] = [];
  for (const para of (opts.body ?? "").split(/\r?\n/)) {
    if (para.trim() === "") lines.push("");
    else for (const l of wrap(para, maxChars)) lines.push(l);
  }

  // Paginate (reserve a few lines on page 1 for the title).
  const pages: string[][] = [];
  const firstBudget = linesPerPage - (opts.title ? 3 : 0);
  let i = 0;
  pages.push(lines.slice(i, i + firstBudget));
  i += firstBudget;
  while (i < lines.length) {
    pages.push(lines.slice(i, i + linesPerPage));
    i += linesPerPage;
  }
  if (pages.length === 0) pages.push([]);

  // Build the content stream for a page.
  const contentFor = (pageLines: string[], isFirst: boolean): string => {
    let s = "BT\n";
    let topY = PAGE_H - MARGIN;
    if (isFirst && opts.title) {
      s += `/F2 ${TITLE_SIZE} Tf\n${MARGIN} ${topY - TITLE_SIZE} Td\n(${escPdf(opts.title)}) Tj\nET\nBT\n`;
      topY = topY - TITLE_SIZE - 14;
    }
    s += `/F1 ${BODY_SIZE} Tf\n${LEADING} TL\n${MARGIN} ${topY - BODY_SIZE} Td\n`;
    for (const line of pageLines) s += `(${escPdf(line)}) Tj\nT*\n`;
    s += "ET\n";
    return s;
  };

  // Object layout: 1 catalog, 2 pages, 3 font, 4 font-bold, then per page a
  // content object and a page object.
  const pageObjIds: number[] = [];
  const parts: { id: number; body: string }[] = [];
  parts.push({ id: 1, body: "<</Type/Catalog/Pages 2 0 R>>" });
  // pages object filled after we know kids
  parts.push({ id: 3, body: "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>" });
  parts.push({ id: 4, body: "<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>" });

  let nextId = 5;
  for (let p = 0; p < pages.length; p++) {
    const contentId = nextId++;
    const pageId = nextId++;
    pageObjIds.push(pageId);
    const stream = contentFor(pages[p], p === 0);
    parts.push({ id: contentId, body: `<</Length ${stream.length}>>\nstream\n${stream}endstream` });
    parts.push({
      id: pageId,
      body: `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PAGE_W} ${PAGE_H}]/Resources<</Font<</F1 3 0 R/F2 4 0 R>>>>/Contents ${contentId} 0 R>>`,
    });
  }
  parts.push({ id: 2, body: `<</Type/Pages/Kids[${pageObjIds.map((k) => `${k} 0 R`).join(" ")}]/Count ${pageObjIds.length}>>` });

  // Serialize with an xref table. Object ids may be out of order; sort for output.
  parts.sort((a, b) => a.id - b.id);
  const maxId = parts[parts.length - 1].id;
  const offsets: number[] = new Array(maxId + 1).fill(0);

  let out = "%PDF-1.4\n";
  for (const part of parts) {
    offsets[part.id] = out.length;
    out += `${part.id} 0 obj\n${part.body}\nendobj\n`;
  }
  const xrefStart = out.length;
  out += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<</Size ${maxId + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;

  // Latin-1 encode (1 byte per char; sanitize already dropped >0xff).
  const bytes = new Uint8Array(out.length);
  for (let k = 0; k < out.length; k++) bytes[k] = out.charCodeAt(k) & 0xff;
  return bytes;
}
