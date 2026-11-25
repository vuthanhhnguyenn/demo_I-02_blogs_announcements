'use client';

import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
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

import { cn } from '@/lib/utils';

type PageToken = number | 'ellipsis';

/**
 * Y-02 FR-023 window: near the start `1 2 3 4 … last`, near the end `1 … last-3 … last`, otherwise
 * `1 … p-1 p p+1 … last`. The shared footer shows `1 2 3 … last` at the edges, which drops the
 * page that follows the current one.
 */
function getPageNumbers(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

interface StoreListPaginationProps {
  readonly total: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
  readonly pageSizeOptions?: readonly number[];
  /**
   * Keep the 全 N 件 line and the 表示件数 select on screen even when everything fits on one
   * page (only the page-number row is dropped). **On by default since 2026-09-21**: an
   * operator reading a list still needs the total and the page-size control, and every
   * screen was opting in anyway. Pass `false` to restore the older behaviour of hiding
   * the footer entirely once the rows fit on a single page.
   */
  readonly alwaysShowFooter?: boolean;
  readonly className?: string;
}

export function StoreListPagination({
  total,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = API_PAGE_SIZE_OPTIONS,
  alwaysShowFooter = true,
  className,
}: StoreListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showPageNumbers = totalPages > 1;

  // Everything fits on a single page. The shared GUI checklist ("Check when the number of
  // records is less than 1 page") only requires that pagination is not shown *disabled*;
  // callers passing `alwaysShowFooter={false}` drop the whole footer, the default keeps the
  // 全 N 件 count and the 表示件数 select and drops just the page-number row.
  if (!showPageNumbers && !alwaysShowFooter) return null;

  // `pageSize` may come from a caller default that isn't one of `pageSizeOptions`
  // (e.g. a tab-local default of 10 against the app-wide API_PAGE_SIZE_OPTIONS list) —
  // insert it in sorted position so the Select always has a matching, selected option.
  const resolvedPageSizeOptions = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = Math.min(safePage * pageSize, total);
  const pageNumbers = getPageNumbers(safePage, totalPages);
  const renderedPageItems = pageNumbers.map((page, position) => {
    if (page === 'ellipsis') {
      const previousPage = pageNumbers[position - 1];
      const nextPage = pageNumbers[position + 1];
      const ellipsisKey = `ellipsis-${String(previousPage)}-${String(nextPage)}`;

      return (
        <PaginationItem key={ellipsisKey}>
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    return (
      <PaginationItem key={page}>
        <PaginationLink
          onClick={() => onPageChange(page)}
          isActive={page === safePage}
          className="cursor-pointer"
        >
          {page}
        </PaginationLink>
      </PaginationItem>
    );
  });

  return (
    <div className={cn('flex items-center justify-between gap-4 border-t px-4 py-3', className)}>
      <p className="text-muted-foreground shrink-0 text-xs">
        全 {total} 件 / {totalPages} ページ / {total === 0 ? 0 : startIndex + 1}-{endIndex} を表示
      </p>

      {showPageNumbers && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text="前へ"
                onClick={() => onPageChange(safePage - 1)}
                className={safePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>

            {renderedPageItems}

            <PaginationItem>
              <PaginationNext
                text="次へ"
                onClick={() => onPageChange(safePage + 1)}
                className={
                  safePage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-muted-foreground text-xs">表示件数</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            onPageSizeChange(Number(value));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="h-7 w-[72px] text-xs">
            <SelectValue>{(value) => `${String(value)}件`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {resolvedPageSizeOptions.map((size) => (
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
