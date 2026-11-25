'use client';

import { CircleAlert } from 'lucide-react';

import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { LessonAreaHeatmapRowDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { toPercent } from '../_utils/lesson-schedule-api.util';

/** API-112 §6.13.5 bands, by schedule start time (午前 < 12:00 ≤ 昼 < 16:00 ≤ 夕 < 19:00 ≤ 夜). */
const BANDS = [
  { key: 'morning', label: '午前' },
  { key: 'daytime', label: '昼' },
  { key: 'evening', label: '夕' },
  { key: 'night', label: '夜' },
] as const;

/** Same thresholds as the store comparison table's fill-rate bar. */
function cellClass(rate: number | null): string {
  if (rate === null) return 'text-muted-foreground';
  if (rate >= 80) return 'bg-success/15 text-success';
  if (rate >= 60) return 'bg-warning/15 text-warning';
  return 'bg-destructive/15 text-destructive';
}

interface AreaHeatmapProps {
  /** `area-dashboard.heatmap[]` — one row per store, in the comparison table's order */
  rows: LessonAreaHeatmapRowDto[];
  onStoreClick?: (storeId: string) => void;
}

/** FR-001-a (3) 時間帯ヒートマップ: fill rate per store × time band; a cell opens the store's 店舗別 tab. */
export function AreaHeatmap({ rows, onStoreClick }: Readonly<AreaHeatmapProps>) {
  return (
    <Card className="flex shrink-0 flex-col gap-0 overflow-hidden py-0">
      <div className="bg-background border-b px-4 py-2">
        <span className="text-sm font-semibold">時間帯ヒートマップ</span>
        <p className="text-muted-foreground text-[10px]">
          店舗×時間帯の予約充足率。セルをクリックすると店舗別ビューを開きます
        </p>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 sticky top-0 z-10">
              <TableHead className="text-xs font-semibold">店舗名</TableHead>
              {BANDS.map((b) => (
                <TableHead key={b.key} className="w-[110px] text-center text-xs font-semibold">
                  {b.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.storeId}>
                <TableCell className="text-sm font-medium">{row.storeName}</TableCell>
                {BANDS.map((b) => {
                  const rate = toPercent(row[b.key]);
                  return (
                    <TableCell key={b.key} className="p-1 text-center">
                      <button
                        type="button"
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-center gap-1 rounded px-2 py-1.5 text-xs font-medium hover:opacity-80',
                          cellClass(rate),
                        )}
                        onClick={() => onStoreClick?.(row.storeId)}
                      >
                        {rate === null ? '—' : `${rate}%`}
                        {row.bandAlerts[b.key] && (
                          <CircleAlert
                            className="text-destructive size-3"
                            aria-label="要対応レッスンあり"
                          />
                        )}
                      </button>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="text-muted-foreground flex items-center gap-4 border-t px-4 py-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="bg-success/15 size-3 rounded" />
          80%以上
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-warning/15 size-3 rounded" />
          60〜79%
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-destructive/15 size-3 rounded" />
          60%未満
        </span>
        <span className="flex items-center gap-1">
          <CircleAlert className="text-destructive size-3" />
          要対応レッスンあり
        </span>
      </div>
    </Card>
  );
}
