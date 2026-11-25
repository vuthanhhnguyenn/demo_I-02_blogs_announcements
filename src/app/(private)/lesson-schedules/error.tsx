'use client';

import { useEffect } from 'react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';

interface LessonSchedulesErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Keeps an unexpected render error of 予約管理 inside the page, with a retry, instead of
 * Next.js's blank 「Application error」 screen (CRM UT D-01 No9). The error still reaches the
 * console so a report can quote it.
 */
export default function LessonSchedulesError({ error, reset }: LessonSchedulesErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-6 py-4">
      <DataStateBoundary
        isLoading={false}
        isError
        isEmpty={false}
        errorTitle="画面を表示できませんでした"
        errorDescription="予期しないエラーが発生しました。再度お試しください。解決しない場合は管理者にお問い合わせください。"
        onRetry={reset}
      />
    </div>
  );
}
