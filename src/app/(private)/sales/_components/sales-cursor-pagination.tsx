'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SalesCursorPaginationProps {
  readonly total: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly pageItemCount: number;
  readonly hasNextPage: boolean;
  readonly onPreviousPage: () => void;
  readonly onNextPage: () => void;
  readonly onPageSizeChange: (pageSize: number) => void;
  readonly pageSizeOptions: readonly number[];
}

/**
 * Prev / next footer for the cursor-paged sales list (API-114 §5 — 015 D6). The API returns an
 * opaque `nextCursor`, so there is no page-number jump; the footer mirrors
 * `TablePaginationWithSize`'s layout otherwise.
 */
export function SalesCursorPagination({
  total,
  currentPage,
  pageSize,
  pageItemCount,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onPageSizeChange,
  pageSizeOptions,
}: SalesCursorPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = total === 0 ? 0 : startIndex + pageItemCount - 1;
  const hasPreviousPage = currentPage > 1;
  const resolvedOptions = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
      <p className="text-muted-foreground shrink-0 text-xs">
        全 {total} 件 / {totalPages} ページ / {startIndex}-{endIndex} を表示
      </p>

      {(hasPreviousPage || hasNextPage) && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text="前へ"
                onClick={onPreviousPage}
                className={hasPreviousPage ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-muted-foreground px-2 text-xs tabular-nums">
                {currentPage} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                text="次へ"
                onClick={onNextPage}
                className={hasNextPage ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-muted-foreground text-xs">表示件数</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-7 w-[72px] text-xs">
            <SelectValue>{(value) => `${String(value)}件`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {resolvedOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}件
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
