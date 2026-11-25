'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

interface FilterResultBannerProps {
  /**
   * Total items before filter. Pass `null` when the baseline count is unavailable
   * (e.g. the API declines the extra COUNT): the 「全 N 件中」 prefix is dropped rather
   * than falling back to the filtered total, which would assert that nothing was
   * filtered out.
   */
  totalCount: number | null;
  /** Items after filter */
  filteredCount: number;
  /**
   * Active filter labels to display.
   * Pass a string array (e.g. ["\"keyword\"", "ブランド名", "公開中"]) — joined with ・
   * or a pre-built string.
   */
  filterSummary?: string | string[];
  onClear: () => void;
  /** Whether to render the banner (caller passes activeFilterCount > 0 || hasSearch) */
  show: boolean;
  className?: string;
}

export function FilterResultBanner({
  totalCount,
  filteredCount,
  filterSummary,
  onClear,
  show,
  className,
}: Readonly<FilterResultBannerProps>) {
  if (!show) return null;

  const summaryText = Array.isArray(filterSummary)
    ? filterSummary.filter(Boolean).join('・')
    : filterSummary;

  return (
    <div
      role="status"
      className={cn('bg-card flex items-start justify-between gap-2 border-t px-4 py-2', className)}
    >
      <p className="min-w-0 flex-1 text-xs break-all">
        {totalCount !== null && <>全 {totalCount.toLocaleString()} 件中 </>}
        <span className="font-medium">{filteredCount.toLocaleString()} 件</span>
        を抽出中
        {summaryText && <span className="text-muted-foreground ml-1">: {summaryText}</span>}
      </p>
      <Button variant="ghost" size="sm" className="h-6 shrink-0 text-xs" onClick={onClear}>
        <X className="mr-1 size-3" />
        条件をクリア
      </Button>
    </div>
  );
}
