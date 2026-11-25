/**
 * Shared model for turning a PDF's text layer into the terms body markup (API-076 `bodyText`,
 * Y-04 検討-01 方式D — the app reflows it in a WebView). Two producers split the text into blocks
 * — `pdf-text-structure.util.ts` from a tagged PDF's structure tree, `pdf-text-layout.util.ts` from
 * the layout of an untagged one — and `renderTermsBody` turns blocks into the fragment the
 * backend accepts:
 *
 *   <div data-font="serif|sans"><p style="margin-left:…em;text-indent:…em;…">…</p>…</div>
 *
 * Only that shape is allowed by the backend (no other tag, attribute or CSS property), which adds
 * the page shell itself when serving it.
 */

/** One text run of a page, in PDF user space (y grows upwards). */
export interface PdfTextRun {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** Font size — the glyph height of the run. */
  readonly size: number;
  readonly hasEOL: boolean;
  /** The embedded font's PostScript name, e.g. `AAAAAE+MS-Mincho`. */
  readonly font: string;
}

export interface PdfLine {
  readonly page: number;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly right: number;
  readonly size: number;
  /** Starts with whitespace — a first-line indent typed as spaces (often `　`). */
  readonly indented: boolean;
  /** The font most of the line is set in, subset prefix removed. */
  readonly font: string;
  /** Where the text after a leading clause/list marker starts; null without a marker. */
  readonly textX: number | null;
}

/** One paragraph, heading or list item, as the lines it spans in the PDF. */
export interface PdfBlock {
  readonly lines: readonly PdfLine[];
  readonly heading: boolean;
}

/** 第1条 / (1) / （一） / 1. / ① / ・ / ※ … — a line starting with one always opens a new block. */
export const BLOCK_MARKER =
  /^(第[0-9０-９一二三四五六七八九十百]+[条章節項]|[（(][0-9０-９一二三四五六七八九十a-zA-Zア-ン]+[)）]|[0-9０-９]+[.．、)）]|[①-⑳]|[・●○■□◆◇※])/;
const CLAUSE_MARKER = /^第[0-9０-９一二三四五六七八九十百]+[条章節項]/;
/** At a page break, a block ending a sentence is taken as complete. */
export const SENTENCE_END = /[。．]$/;
/** Runs whose baselines differ by less than this share of the font size sit on the same line. */
const SAME_LINE_RATIO = 0.5;
/** Kangxi Radicals + CJK Radicals Supplement — glyph-mapped look-alikes of normal kanji (⽤ → 用). */
const CJK_RADICAL = /[⺀-⻿⼀-⿟]/g;
const LATIN_END = /[A-Za-z0-9,.;:!?)]$/;
const LATIN_START = /^[A-Za-z0-9(]/;
const SERIF_FONT = /Mincho|Ming|Song|Serif|Times|Cambria|Georgia|HiraMin|明朝/i;
const BOLD_FONT = /Bold|Heavy|Black|W[6-9]\b/i;
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Many PDFs (notably ones exported on macOS) map kanji such as 用・入・行 onto their Kangxi-radical
 * code points. They look the same but break search and render in a fallback font, so fold them
 * back. Only that range is normalized — a full NFKC would also rewrite （） and full-width digits.
 */
export const foldCjkRadicals = (text: string): string =>
  text.replace(CJK_RADICAL, (char) => char.normalize('NFKC'));

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

export const round = (value: number): number => Math.round(value * 2) / 2;

export const mostFrequent = (values: readonly number[]): number | undefined => {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: number | undefined;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) [best, bestCount] = [value, count];
  }
  return best;
};

/** The size most of the text is set in, weighted by character count. */
export const bodySizeOf = (lines: readonly PdfLine[]): number =>
  mostFrequent(lines.flatMap((line) => Array<number>(line.text.length).fill(line.size))) ?? 0;

export const joinWrapped = (left: string, right: string): string =>
  LATIN_END.test(left) && LATIN_START.test(right) ? `${left} ${right}` : left + right;

/**
 * x of the first character after a leading marker ("・ ", "(1) ", "1. "). A run holding both the
 * marker and text is split proportionally to its character count.
 */
function textStartAfterMarker(visible: readonly PdfTextRun[]): number | null {
  const joined = visible.map((run) => run.str).join('');
  const start = joined.length - joined.trimStart().length;
  const match = BLOCK_MARKER.exec(joined.slice(start));
  if (!match) return null;
  let offset = start + match[0].length;
  while (/\s/.test(joined[offset] ?? '')) offset += 1;
  for (const run of visible) {
    if (offset < run.str.length) return run.x + (run.width * offset) / run.str.length;
    offset -= run.str.length;
  }
  return null;
}

/** Groups a page's runs into lines: a new line at an end-of-line mark or a baseline jump. */
export function toLines(runs: readonly PdfTextRun[], page: number): PdfLine[] {
  const lines: PdfLine[] = [];
  let current: PdfTextRun[] = [];
  const flush = () => {
    const raw = foldCjkRadicals(current.map((run) => run.str).join(''));
    const text = raw.replace(/\s+/g, ' ').trim();
    const visible = current.filter((run) => run.str.trim());
    if (text && visible.length > 0) {
      const dominant = [...visible].sort((a, b) => b.str.length - a.str.length)[0];
      lines.push({
        page,
        text,
        x: Math.min(...visible.map((run) => run.x)),
        y: visible[0].y,
        right: Math.max(...visible.map((run) => run.x + run.width)),
        size: round(Math.max(...visible.map((run) => run.size))),
        indented: /^\s/.test(raw),
        font: dominant.font.replace(/^[A-Z]{6}\+/, ''),
        textX: textStartAfterMarker(visible),
      });
    }
    current = [];
  };
  for (const run of runs) {
    const anchor = current.find((r) => r.str.trim());
    if (anchor && run.str.trim() && Math.abs(run.y - anchor.y) > anchor.size * SAME_LINE_RATIO) {
      flush();
    }
    current.push(run);
    if (run.hasEOL) flush();
  }
  flush();
  return lines;
}

const em = (points: number, bodySize: number): string =>
  `${Math.round((points / bodySize) * 100) / 100}em`;

/**
 * Renders blocks as the terms body fragment. Indents are measured against the leftmost line and
 * expressed in body-size `em`, so they scale with the viewer's font: the first line's offset from
 * the wrapped lines becomes `text-indent` (a hanging indent under "(1)", "・"), and a one-line
 * marker item takes its wrapped-line position from where the text follows the marker. A block
 * starting past the first quarter of the text area gets no margin: it is right-aligned when it
 * ends at the right edge, and set flush otherwise. The whole body is serif when most of its
 * characters are set in a Mincho-like font.
 */
export function renderTermsBody(blocks: readonly PdfBlock[]): string {
  const lines = blocks.flatMap((block) => block.lines);
  if (lines.length === 0) return '';
  const bodySize = bodySizeOf(lines);
  const left = Math.min(...lines.map((line) => line.x));
  const right = Math.max(...lines.map((line) => line.right));
  const serifChars = lines
    .filter((l) => SERIF_FONT.test(l.font))
    .reduce((n, l) => n + l.text.length, 0);
  const total = lines.reduce((n, l) => n + l.text.length, 0);

  const paragraphs = blocks.map((block, i) => {
    const [first, second] = block.lines;
    // Only a list item hangs under its marker; a heading or a "第N条 …" line wraps flush.
    const hangX = block.heading || CLAUSE_MARKER.test(first.text) ? null : first.textX;
    const wrapX = second?.x ?? hangX ?? first.x;
    const size = mostFrequent(
      block.lines.flatMap((l) => Array<number>(l.text.length).fill(l.size)),
    );
    const bold = block.lines.every((l) => BOLD_FONT.test(l.font));
    const opensSection = i > 0 && block.heading && !blocks[i - 1].heading;
    // A block starting past the first quarter is placed off to the right (a right-aligned 「以上」,
    // a header field), not indented — real indents stay well inside it — and its offset as a
    // margin would overflow a phone-width WebView. One ending at the right edge is right-aligned.
    const offRight = first.x - left > (right - left) / 4;
    const alignRight = offRight && right - Math.max(...block.lines.map((l) => l.right)) <= bodySize;
    const style = [
      !offRight && wrapX - left >= 0.5 ? `margin-left:${em(wrapX - left, bodySize)}` : '',
      opensSection ? 'margin-top:1.2em' : '',
      !offRight && Math.abs(first.x - wrapX) >= 0.5
        ? `text-indent:${em(first.x - wrapX, bodySize)}`
        : '',
      size !== undefined && size !== bodySize ? `font-size:${em(size, bodySize)}` : '',
      bold ? 'font-weight:bold' : '',
      alignRight ? 'text-align:right' : '',
    ].filter(Boolean);
    const text = block.lines.map((l) => l.text).reduce(joinWrapped);
    const attribute = style.length > 0 ? ` style="${style.join(';')}"` : '';
    return `<p${attribute}>${escapeHtml(text)}</p>`;
  });
  const font = serifChars * 2 >= total ? 'serif' : 'sans';
  return `<div data-font="${font}">${paragraphs.join('')}</div>`;
}
