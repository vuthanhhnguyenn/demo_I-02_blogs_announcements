import {
  BLOCK_MARKER,
  type PdfBlock,
  type PdfLine,
  type PdfTextRun,
  SENTENCE_END,
  toLines,
} from '@/lib/utils/pdf-text-blocks.util';
import { inMarginBand } from '@/lib/utils/pdf-text-layout.util';

/** A pdf.js structure-tree node: an element (`role` + `children`) or a content reference (`id`). */
export interface PdfStructNode {
  readonly role?: string;
  readonly type?: string;
  readonly id?: string;
  readonly children?: readonly PdfStructNode[];
}

/** A text run plus the marked-content sequence it was drawn in. */
export interface PdfMarkedRun extends PdfTextRun {
  /** Marked-content id the structure tree refers to; null outside any tagged sequence. */
  readonly mcid: string | null;
  /** Drawn inside an `/Artifact` sequence — page furniture by the PDF's own account. */
  readonly artifact: boolean;
}

export interface PdfStructurePage {
  readonly width: number;
  readonly height: number;
  readonly tree: PdfStructNode | null;
  readonly runs: readonly PdfMarkedRun[];
}

/** Elements that are one block of text each, whatever they nest inside. */
const BLOCK_ROLES = new Set([
  'P',
  'H',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'TD',
  'TH',
  'Caption',
  'Title',
]);
const HEADING_ROLE = /^(H[1-6]?|Title)$/;

interface TaggedBlock {
  lines: PdfLine[];
  heading: boolean;
  role: string;
  page: number;
}

/** The content ids under `node`, in reading order. */
const contentIds = (node: PdfStructNode): string[] =>
  node.id !== undefined && node.type === 'content'
    ? [node.id]
    : (node.children ?? []).flatMap(contentIds);

function pageBlocks(page: PdfStructurePage, index: number): TaggedBlock[] | null {
  if (!page.tree) return null;
  const runsById = new Map<string, PdfMarkedRun[]>();
  for (const run of page.runs) {
    if (run.mcid === null || run.artifact) continue;
    runsById.set(run.mcid, [...(runsById.get(run.mcid) ?? []), run]);
  }

  const blocks: TaggedBlock[] = [];
  const used = new Set<string>();
  const push = (ids: readonly string[], role: string) => {
    ids.forEach((id) => used.add(id));
    const lines = toLines(
      ids.flatMap((id) => runsById.get(id) ?? []),
      index,
    );
    if (lines.length > 0)
      blocks.push({ lines, heading: HEADING_ROLE.test(role), role, page: index });
  };
  const walk = (node: PdfStructNode) => {
    if (node.type === 'content') {
      if (node.id !== undefined) push([node.id], '');
      return;
    }
    if (node.role !== undefined && BLOCK_ROLES.has(node.role)) push(contentIds(node), node.role);
    else (node.children ?? []).forEach(walk);
  };
  walk(page.tree);

  // Text the tree does not reach may only be page furniture (an untagged running footer, as Chrome
  // prints it). Anything else means the tagging is incomplete — trusting it would drop content.
  const unreached = page.runs.filter(
    (run) => !run.artifact && run.str.trim() && (run.mcid === null || !used.has(run.mcid)),
  );
  if (unreached.some((run) => !inMarginBand(run.y, page.height))) return null;
  return blocks;
}

/**
 * Splits a TAGGED PDF into blocks from its structure tree: each paragraph, heading, list item or
 * table cell the document declares is one block, so nothing is guessed. Returns null when the PDF
 * is untagged or its tags leave body text uncovered — the caller then falls back to the layout.
 *
 * pdf.js hands the tree out per page and does not tell which element continues across a page
 * break, so a paragraph split by the break is rejoined when the page's last block is a paragraph
 * that does not end a sentence and the next page opens with a paragraph without a clause/list
 * marker.
 */
export function blocksFromStructure(pages: readonly PdfStructurePage[]): PdfBlock[] | null {
  const perPage: TaggedBlock[][] = [];
  for (const [index, page] of pages.entries()) {
    const hasText = page.runs.some((run) => run.str.trim());
    const blocks = pageBlocks(page, index);
    if (blocks === null) {
      if (hasText) return null;
      perPage.push([]);
    } else {
      perPage.push(blocks);
    }
  }

  const merged: TaggedBlock[] = [];
  for (const block of perPage.flat()) {
    const prev = merged[merged.length - 1];
    const continuesAcrossPages =
      prev !== undefined &&
      prev.page !== block.page &&
      prev.role === 'P' &&
      block.role === 'P' &&
      !SENTENCE_END.test(prev.lines[prev.lines.length - 1].text) &&
      !BLOCK_MARKER.test(block.lines[0].text);
    if (continuesAcrossPages)
      merged[merged.length - 1] = {
        ...prev,
        lines: [...prev.lines, ...block.lines],
        page: block.page,
      };
    else merged.push(block);
  }
  return merged.length > 0 ? merged : null;
}
