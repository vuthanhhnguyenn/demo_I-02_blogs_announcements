import {
  BLOCK_MARKER,
  type PdfBlock,
  type PdfLine,
  type PdfTextRun,
  SENTENCE_END,
  bodySizeOf,
  mostFrequent,
  round,
  toLines,
} from '@/lib/utils/pdf-text-blocks.util';

export interface PdfLayoutPage {
  readonly width: number;
  readonly height: number;
  readonly runs: readonly PdfTextRun[];
}

/** A line gap this much wider than the usual line pitch starts a new paragraph. */
const PARAGRAPH_GAP_RATIO = 1.15;
/** Below this share of the page's column width, the widest lines are taken as not wrapping at all. */
const SHORT_LINES_RATIO = 0.75;
/** Header/footer band, as a share of the page height from the top and the bottom edge. */
const MARGIN_BAND_RATIO = 0.08;
const PAGE_NUMBER_ONLY = /^[-－–—\s]*(p\.?\s*)?\d+(\s*\/\s*\d+)?[-－–—\s]*$/i;

/** Whether a baseline lies in the page's top/bottom header-footer band. */
export const inMarginBand = (y: number, pageHeight: number): boolean => {
  const band = pageHeight * MARGIN_BAND_RATIO;
  return y < band || y > pageHeight - band;
};

/**
 * Drops running headers/footers: a line inside the top/bottom band whose text (digits ignored)
 * recurs at about the same height on at least half of the pages, that is a bare page number, or
 * that is set smaller than the body and ends in a page number (a footer a single page can't repeat).
 */
function dropPageFurniture(lines: readonly PdfLine[], pages: readonly PdfLayoutPage[]): PdfLine[] {
  const bodySize = bodySizeOf(lines);
  const inBand = (line: PdfLine) => inMarginBand(line.y, pages[line.page].height);
  const keyOf = (line: PdfLine) =>
    `${line.text.replace(/[0-9０-９\s]/g, '')}@${Math.round(line.y / 10)}`;
  const pagesPerKey = new Map<string, Set<number>>();
  for (const line of lines.filter(inBand)) {
    const key = keyOf(line);
    pagesPerKey.set(key, (pagesPerKey.get(key) ?? new Set()).add(line.page));
  }
  const minRepeats = Math.max(2, Math.ceil(pages.length / 2));
  return lines.filter((line) => {
    if (!inBand(line)) return true;
    if (PAGE_NUMBER_ONLY.test(line.text)) return false;
    if (line.size < bodySize && /\d$/.test(line.text)) return false;
    return (pagesPerKey.get(keyOf(line))?.size ?? 0) < minRepeats;
  });
}

/**
 * Splits an UNTAGGED PDF into blocks from its layout alone — the fallback when the PDF carries no
 * structure tree. PDF lines that only wrap at the right margin are joined back into one block; a
 * block ends at a wider-than-usual line gap, a short line, a font-size change, a first-line indent,
 * or a clause/list marker (第N条, (1), ①, ・ …). Text larger than the body is a heading. Running
 * headers/footers are dropped; no other character is ever dropped, added or reordered.
 */
export function blocksFromLayout(pages: readonly PdfLayoutPage[]): PdfBlock[] {
  const lines = dropPageFurniture(
    pages.flatMap((page, i) => toLines(page.runs, i)),
    pages,
  );
  if (lines.length === 0) return [];

  const bodySize = bodySizeOf(lines);
  const gaps = lines.slice(1).flatMap((line, i) => {
    const prev = lines[i];
    return prev.page === line.page && prev.size === line.size && prev.size === bodySize
      ? [round(prev.y - line.y)]
      : [];
  });
  const pitch = mostFrequent(gaps.filter((gap) => gap > 0)) ?? bodySize * 1.5;
  // The text column's right edge: the 90th percentile of body-line right edges, so neither a short
  // last page, a small far-right page number nor a few overflowing lines can move it. When that
  // falls well short of the column a symmetric page would have, no line actually runs the full
  // width (a page of short lines), so the page's column is used and no line counts as wrapped.
  const bodyLines = lines.filter((l) => l.size === bodySize);
  const rights = bodyLines.map((l) => l.right).sort((a, b) => a - b);
  const percentileRight = rights[Math.floor((rights.length - 1) * 0.9)] ?? 0;
  const left = Math.min(...bodyLines.map((l) => l.x));
  const pageColumnRight = Math.max(...pages.map((p) => p.width)) - left;
  const rightMargin =
    percentileRight < left + (pageColumnRight - left) * SHORT_LINES_RATIO
      ? pageColumnRight
      : percentileRight;

  const isHeading = (line: PdfLine) => line.size > bodySize;
  // Up to ~2 characters short still counts: 禁則 line breaking leaves a wrapped line ragged.
  const reachesMargin = (line: PdfLine) => line.right >= rightMargin - line.size * 2.2;
  const continuesBlock = (prev: PdfLine, line: PdfLine) => {
    if (isHeading(prev) || isHeading(line) || prev.size !== line.size) return false;
    if (!reachesMargin(prev) || BLOCK_MARKER.test(line.text)) return false;
    // A first-line indent opens a paragraph; a hanging indent under "(1) …" does not.
    const indented = line.indented || line.x > prev.x + line.size * 0.5;
    if (indented && !BLOCK_MARKER.test(prev.text)) return false;
    // Across a page break there is no gap to measure, so a sentence end closes the paragraph.
    if (prev.page !== line.page) return !SENTENCE_END.test(prev.text);
    return prev.y - line.y <= pitch * PARAGRAPH_GAP_RATIO;
  };

  const blocks: { lines: PdfLine[]; heading: boolean }[] = [];
  lines.forEach((line, i) => {
    const prev = lines[i - 1];
    if (prev && continuesBlock(prev, line)) blocks[blocks.length - 1].lines.push(line);
    else blocks.push({ lines: [line], heading: isHeading(line) });
  });
  return blocks;
}
