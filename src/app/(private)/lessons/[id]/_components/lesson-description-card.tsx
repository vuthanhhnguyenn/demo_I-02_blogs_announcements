'use client';

import 'react-quill-new/dist/quill.snow.css';

import dynamic from 'next/dynamic';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { LessonDetailDto } from '@/lib/api-real/types.gen';

import { LESSON_DESCRIPTION_QUILL_FORMATS } from '../../_constants/constants';

/**
 * The description is the form editor's HTML. Quill renders it read-only — it parses the markup
 * into its own document model, so no raw HTML is injected into the page.
 */
const ReadOnlyQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface LessonDescriptionCardProps {
  detail: LessonDetailDto;
}

/** Read-only "レッスン内容説明" card (FR-003-P1-06). */
export function LessonDescriptionCard({ detail }: LessonDescriptionCardProps) {
  const description = detail.description?.trim() ?? '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">レッスン内容説明</CardTitle>
      </CardHeader>
      <CardContent>
        {description ? (
          // A long unbroken string wraps instead of widening the card (`!`: quill.snow.css is
          // unlayered and sets the editor's overflow-wrap itself)
          <div className="text-muted-foreground min-w-0 wrap-anywhere [&_.ql-container]:border-0 [&_.ql-editor]:p-0 [&_.ql-editor]:text-sm [&_.ql-editor]:leading-relaxed [&_.ql-editor]:wrap-anywhere!">
            <ReadOnlyQuill
              theme="snow"
              readOnly
              modules={{ toolbar: false }}
              formats={LESSON_DESCRIPTION_QUILL_FORMATS}
              value={description}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">説明はありません</p>
        )}
      </CardContent>
    </Card>
  );
}
