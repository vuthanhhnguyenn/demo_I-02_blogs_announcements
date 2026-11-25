'use client';

import { useMemo, useState } from 'react';

import { ArrowUpDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { LessonAreaStoreRowDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { toPercent } from '../_utils/lesson-schedule-api.util';

type SortKey =
  | 'store_name'
  | 'total_lessons'
  | 'occupancy_rate'
  | 'assigned_staff_count'
  | 'alert_count'
  | 'in_progress_lesson_name';

function formatInProgress(store: LessonAreaStoreRowDto): string {
  if (store.ongoingLesson) {
    return `${store.ongoingLesson.lessonName} ${store.ongoingLesson.startTime}〜`;
  }
  return '—';
}

interface AreaSummaryTableProps {
  /** `area-dashboard.storeRows[]` — server-sorted, stores with alerts first (FR-001-a (2)) */
  stores: LessonAreaStoreRowDto[];
  onStoreClick?: (storeId: string) => void;
}

function SortableHeader({ label, onSort }: { label: string; onSort: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            variant="ghost"
            className="group/sort h-auto gap-1 p-0 text-xs font-semibold hover:bg-transparent"
            onClick={onSort}
          >
            {label}
            <ArrowUpDown className="text-muted-foreground group-hover/sort:text-foreground size-3 transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">クリックで降順ソート</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getSortValue(store: LessonAreaStoreRowDto, key: SortKey): string | number {
  switch (key) {
    case 'store_name':
      return store.storeName;
    case 'total_lessons':
      return store.todayLessonCount;
    case 'occupancy_rate':
      // null (no published schedule that day) sorts below 0%
      return store.avgFillRate ?? -1;
    case 'assigned_staff_count':
      return store.staffCount;
    case 'alert_count':
      return store.alertCount;
    case 'in_progress_lesson_name':
      return store.ongoingLesson?.lessonName ?? '';
  }
}

export function AreaSummaryTable({ stores, onStoreClick }: AreaSummaryTableProps) {
  // null = the server's order (alerts first) until a header is clicked
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDesc, setSortDesc] = useState(false);

  const sortedStores = useMemo(() => {
    if (sortKey === null) return stores;
    return [...stores].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), 'ja');
      return sortDesc ? -cmp : cmp;
    });
  }, [stores, sortKey, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortDesc(false);
    }
  };

  return (
    <Card className="flex shrink-0 flex-col gap-0 overflow-hidden py-0">
      <div className="bg-background flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">店舗比較表</span>
          <Badge variant="secondary" className="text-[10px]">
            全{stores.length}店舗
          </Badge>
        </div>
        {stores.length > 3 && (
          <span className="text-muted-foreground text-[10px]">↕ スクロールで全店舗表示</span>
        )}
      </div>
      <div className="h-[220px] shrink-0 overflow-y-scroll">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 sticky top-0 z-10">
              <TableHead className="text-xs font-semibold">
                <SortableHeader label="店舗名" onSort={() => handleSort('store_name')} />
              </TableHead>
              <TableHead className="w-[100px] text-center text-xs font-semibold">
                <SortableHeader label="本日レッスン" onSort={() => handleSort('total_lessons')} />
              </TableHead>
              <TableHead className="w-[140px] text-center text-xs font-semibold">
                <SortableHeader label="平均予約率" onSort={() => handleSort('occupancy_rate')} />
              </TableHead>
              <TableHead className="w-[100px] text-center text-xs font-semibold">
                <SortableHeader
                  label="スタッフ"
                  onSort={() => handleSort('assigned_staff_count')}
                />
              </TableHead>
              <TableHead className="w-[100px] text-center text-xs font-semibold">
                <SortableHeader label="アラート" onSort={() => handleSort('alert_count')} />
              </TableHead>
              <TableHead className="text-xs font-semibold">
                <SortableHeader
                  label="実施中"
                  onSort={() => handleSort('in_progress_lesson_name')}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStores.map((store) => {
              const rate = toPercent(store.avgFillRate);
              const barColor =
                rate === null
                  ? 'bg-muted'
                  : rate >= 80
                    ? 'bg-success'
                    : rate >= 60
                      ? 'bg-warning'
                      : 'bg-destructive';

              return (
                <TableRow
                  key={store.storeId}
                  className="hover:bg-accent/50 cursor-pointer"
                  onClick={() => onStoreClick?.(store.storeId)}
                >
                  <TableCell className="text-sm font-medium">{store.storeName}</TableCell>
                  <TableCell className="text-center text-xs">
                    {store.todayLessonCount}コマ
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="bg-muted h-2 w-16 overflow-hidden rounded-full">
                        <div
                          className={cn('h-full rounded-full', barColor)}
                          style={{ width: `${Math.min(rate ?? 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs">{rate === null ? '—' : `${rate}%`}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs">{store.staffCount}名</TableCell>
                  <TableCell className="text-center">
                    {store.alertCount > 0 ? (
                      <Badge
                        variant="secondary"
                        className="bg-destructive/15 text-destructive h-auto px-1 py-0 text-[10px]"
                      >
                        {store.alertCount}件
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatInProgress(store)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground border-t px-4 py-2 text-[10px]">
        アラートがある店舗を要対応として上位に表示しています。予約率が60%未満の店舗はバーを赤で表示します。
      </p>
    </Card>
  );
}
