'use client';

import { useMemo, useState } from 'react';

import { formatYen } from '@/utils/format.util';
import { useQuery } from '@tanstack/react-query';

import { MonthPicker } from '@/components/common/month-picker';
import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminStoreSettingsControllerGetOneDayPassPriceOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { getOneDayPassBasePrice } from './one-day-pass-base-price';
import { OneDayPassPriceDrawer } from './one-day-pass-price-drawer';
import { SectionHeader } from './section-header';

const WEEKDAY_SHORT = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * `'2026-03-20'` → `{ date: '2026/03/20', weekday: <weekday label> }` — split so the weekday can be
 * rendered smaller and muted next to the date, as the prototype does.
 *
 * A string reformat plus a locally-constructed `Date` for the weekday, not `formatDateYYYYMMDD`
 * / `formatDateMDWeekday`: those parse date-only text as UTC midnight, which lands on the
 * previous day for any viewer behind UTC. Same reasoning as `toDisplayDate` in
 * `../../business-settings-tab/business-hours-shared.ts`.
 */
function formatAppliedDate(date: string): { date: string; weekday: string | null } {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return { date, weekday: null };
  return {
    date: date.replaceAll('-', '/'),
    weekday: WEEKDAY_SHORT[new Date(year, month - 1, day).getDay()] ?? null,
  };
}

/**
 * `'2026-03-20'` → `'2026/03'`, the key `MonthPicker` speaks. Sliced from the text rather than
 * run through `formatDateYYYYMM` for the same date-only reason as above — that helper would
 * report `2026/02` for `'2026-03-01'` when the viewer sits behind UTC.
 */
function toMonthKey(date: string): string {
  return date.slice(0, 7).replaceAll('-', '/');
}

/**
 * Y-02 FR-003 1DayPass price setting — read-only list of the per-date prices for one month,
 * plus the drawer that sets them.
 *
 * `specs/027-store-detail/spec.md` FR-050a treated the 基準価格 as display-only because the mock
 * had no way to write it. The real API does (`PUT …/one-day-pass-price`) and returns `default`
 * as null until it has been set, so the drawer now offers it rather than showing a value the
 * operator could never establish.
 */
export function OneDayPassSection({ storeId }: { storeId: string }) {
  const { data, isLoading, isError } = useQuery({
    ...adminStoreSettingsControllerGetOneDayPassPriceOptions({ path: { id: storeId } }),
    enabled: Boolean(storeId),
  });

  // `default` is null until a base price has been set for this store (API-084 §9)
  const basePrice = getOneDayPassBasePrice(data ? (data.default?.price ?? null) : undefined);

  const exceptions = useMemo(() => data?.exceptions ?? [], [data?.exceptions]);
  const monthsWithData = useMemo(
    () => new Set(exceptions.map((row) => toMonthKey(row.date))),
    [exceptions],
  );

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  // Default to the newest month that holds data, so the table is never pointlessly empty
  const activeMonth =
    selectedMonth ??
    (exceptions.length > 0 ? toMonthKey(exceptions[exceptions.length - 1]!.date) : null);

  const rows = useMemo(
    () => exceptions.filter((row) => toMonthKey(row.date) === activeMonth),
    [exceptions, activeMonth],
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="p-4 pb-3">
        <SectionHeader
          title="1DayPass価格設定"
          count={exceptions.length}
          isLoading={isLoading}
          isError={isError && !data}
          action={
            <div className="flex items-center gap-2">
              {exceptions.length > 0 && activeMonth && (
                <MonthPicker
                  value={activeMonth}
                  onChange={setSelectedMonth}
                  isMonthEnabled={(year, month) =>
                    monthsWithData.has(`${year}/${String(month).padStart(2, '0')}`)
                  }
                  className="w-36"
                />
              )}
              {/* The drawer works against the live exception set, so it is offered only once the
                  response has actually arrived — not with a stand-in. */}
              {data && (
                <OneDayPassPriceDrawer
                  storeId={storeId}
                  basePrice={basePrice}
                  exceptions={exceptions}
                />
              )}
            </div>
          }
        />
      </CardHeader>

      {isLoading ? (
        <div className="space-y-2 px-4 pb-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : !data ? (
        // Without the response there is no base price to name, so the read failure is stated
        // rather than dressed up as "every day sells at a base price of 0". The shared
        // `QueryCache` only toasts a query that opts in, so this line is the operator's notice.
        <p className="text-muted-foreground px-4 pt-4 pb-8 text-center text-xs">
          1DayPass価格を取得できませんでした。
        </p>
      ) : exceptions.length === 0 ? (
        <p className="text-muted-foreground px-4 pt-4 pb-8 text-center text-xs">
          {basePrice.price === null
            ? '個別の価格設定はありません。基準価格も未設定です。'
            : `個別の価格設定はありません。全日 基準価格（${formatYen(basePrice.price)}）で販売されます。`}
        </p>
      ) : (
        // Full-bleed table: the header row spans the card, as in the prototype and in the
        // sibling sections' `DataTable`.
        <Table containerClassName="border-t">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[140px] text-xs font-semibold">適用日</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold">販売価格（税込）</TableHead>
              <TableHead className="min-w-[200px] text-xs font-semibold">備考</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center text-xs">
                  この月の価格設定はありません。
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const applied = formatAppliedDate(row.date);
                return (
                  <TableRow key={row.date}>
                    <TableCell className="text-xs tabular-nums">
                      {applied.date}
                      {applied.weekday && (
                        <span className="text-muted-foreground ml-1 text-[10px]">
                          （{applied.weekday}）
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium tabular-nums">
                      {formatYen(row.price)}
                    </TableCell>
                    {/* Wraps — even an unbroken token — so a long note grows the row, not the
                        table past the card; 適用日 / 価格 stay nowrap at their widths */}
                    <TableCell className="text-muted-foreground max-w-[480px] text-xs [overflow-wrap:anywhere] whitespace-normal">
                      {row.note?.trim() ? row.note : '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
