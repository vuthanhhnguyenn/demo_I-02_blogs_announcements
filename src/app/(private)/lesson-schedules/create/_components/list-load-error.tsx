'use client';

import { Button } from '@/components/ui/button';

interface ListLoadErrorProps {
  /** What failed to load, e.g. 「スタジオ」 */
  label: string;
  onRetry: () => void;
}

/** A failed option / preview read — said out loud with a retry, so it never passes for 「0件」. */
export function ListLoadError({ label, onRetry }: Readonly<ListLoadErrorProps>) {
  return (
    <p className="text-destructive text-xs">
      {label}の取得に失敗しました{' '}
      <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={onRetry}>
        再試行
      </Button>
    </p>
  );
}
