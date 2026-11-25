'use client';
// Client component: react-quill-new touches `document` and is loaded with `next/dynamic` +
// `ssr: false` (not allowed in a Server Component).
import 'react-quill-new/dist/quill.snow.css';

import dynamic from 'next/dynamic';

import { cn } from '@/lib/utils';

import { BLOG_BODY_QUILL_FORMATS } from '../_constants/blog.constants';

/**
 * The body is the form editor's HTML. Quill renders it read-only — it parses the markup into its
 * own document model, so no raw HTML is injected into the page.
 */
const ReadOnlyQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface BlogBodyViewerProps {
  html: string;
  /** Size / colour of the rendered text, e.g. `[&_.ql-editor]:text-sm`. */
  className?: string;
}

/** Read-only article body (detail 本文 card and both preview tabs). */
export function BlogBodyViewer({ html, className }: Readonly<BlogBodyViewerProps>) {
  return (
    // quill.snow.css is unlayered, so it beats Tailwind's layered utilities of equal specificity:
    // every override of a rule it sets needs `!` — container border (#ccc frame) / font
    // (Helvetica 13px), editor padding / line-height / overflow-wrap. Paragraph spacing and
    // heading size follow the V0 detail body (space-y-4, headings text-base font-medium).
    <div
      className={cn(
        'min-w-0 wrap-anywhere [&_.ql-container]:border-0! [&_.ql-container]:font-sans! [&_.ql-editor]:p-0! [&_.ql-editor]:leading-relaxed! [&_.ql-editor]:wrap-anywhere! [&_.ql-editor_h1]:text-base! [&_.ql-editor_h1]:font-medium [&_.ql-editor_h2]:text-base! [&_.ql-editor_h2]:font-medium [&_.ql-editor>*+*]:mt-4!',
        className,
      )}
    >
      <ReadOnlyQuill
        theme="snow"
        readOnly
        modules={{ toolbar: false }}
        formats={BLOG_BODY_QUILL_FORMATS}
        value={html}
      />
    </div>
  );
}
