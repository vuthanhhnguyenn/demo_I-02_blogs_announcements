import type { PDFDocumentProxy } from 'pdfjs-dist';

import { renderTermsBody } from '@/lib/utils/pdf-text-blocks.util';
import { blocksFromLayout } from '@/lib/utils/pdf-text-layout.util';
import {
  type PdfMarkedRun,
  type PdfStructurePage,
  blocksFromStructure,
} from '@/lib/utils/pdf-text-structure.util';

export interface ExtractedPdfBody {
  /** The terms body markup (`bodyText`), or '' when the PDF has no text layer (a scan). */
  readonly body: string;
  /**
   * Whether the blocks came from the PDF's own structure tags. False means they were inferred from
   * the layout (an untagged PDF, e.g. one printed to PDF on macOS), which can misplace a break.
   */
  readonly structured: boolean;
}

/**
 * Reads every page's text runs — with the marked-content sequence each was drawn in — and its
 * structure tree. Fonts are resolved through the operator list, since the text layer only names
 * pdf.js's internal font ids.
 */
async function readPages(document: PDFDocumentProxy): Promise<PdfStructurePage[]> {
  const pages: PdfStructurePage[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent({ includeMarkedContent: true });
    await page.getOperatorList();
    const fontNames = new Map<string, string>();
    const fontName = (id: string): string => {
      if (!fontNames.has(id)) {
        let name = '';
        try {
          name = (page.commonObjs.get(id) as { name?: string } | undefined)?.name ?? '';
        } catch {
          // Not a loaded font object — fall back to sans.
        }
        fontNames.set(id, name);
      }
      return fontNames.get(id) ?? '';
    };

    const runs: PdfMarkedRun[] = [];
    const sequences: { id: string | null; artifact: boolean }[] = [];
    for (const item of content.items) {
      if ('type' in item) {
        // At runtime a begin item also carries its `tag` (e.g. `Artifact`); the typings omit it,
        // and `id` is absent outside `beginMarkedContentProps`.
        const marked = item as { type: string; id?: string; tag?: string };
        if (marked.type === 'endMarkedContent') sequences.pop();
        else sequences.push({ id: marked.id ?? null, artifact: marked.tag === 'Artifact' });
        continue;
      }
      const [, , c, d, x, y] = item.transform as number[];
      runs.push({
        str: item.str,
        x,
        y,
        width: item.width,
        size: Math.hypot(c, d),
        hasEOL: item.hasEOL,
        font: fontName(item.fontName),
        mcid: sequences.findLast((s) => s.id !== null)?.id ?? null,
        artifact: sequences.some((s) => s.artifact),
      });
    }
    pages.push({
      width: page.view[2] - page.view[0],
      height: page.view[3] - page.view[1],
      tree: (await page.getStructTree()) ?? null,
      runs,
    });
  }
  return pages;
}

/**
 * Turns a loaded PDF into the terms body markup (Y-04 検討-01 方式D). A tagged PDF is split by its
 * structure tree; an untagged one, or one whose tags miss body text, by its layout. Either way the
 * indents, sizes, weight and serif/sans are kept, and no character other than a running
 * header/footer is ever dropped. Exported for running against real PDFs outside the browser.
 */
export async function readPdfBody(document: PDFDocumentProxy): Promise<ExtractedPdfBody> {
  const pages = await readPages(document);
  const tagged = blocksFromStructure(pages);
  return {
    body: renderTermsBody(tagged ?? blocksFromLayout(pages)),
    structured: tagged !== null,
  };
}

/**
 * Extracts the terms body from a PDF in the browser (method D: the backend never parses the PDF).
 * The full body is returned — never truncated: API-076 sizes its `bodyText` cap to hold any PDF
 * the form accepts (≤10MB), and an over-limit body is rejected by the API, not silently cut here.
 */
export async function extractPdfBody(file: File): Promise<ExtractedPdfBody> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    return await readPdfBody(await task.promise);
  } finally {
    void task.destroy();
  }
}
