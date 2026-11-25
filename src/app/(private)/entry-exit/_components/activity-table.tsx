'use client';

import Link from 'next/link';

import { formatTime, getTodayJstISODate } from '@/utils/date.util';
import { formatJapaneseDate } from '@/utils/format.util';
import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';

import { DataStateBoundary, Empty } from '@/components/common/data-state-boundary';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminVisitMonitorControllerActivityOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  CompanionBadge,
  type CompanionRole,
  DeniedBadge,
  FrequencyBadge,
} from './entry-exit-badges';

const COLUMN_COUNT = 4;
const SKELETON_ROW_COUNT = 5;

const EVENT_TYPES_BY_DIRECTION = {
  entry: 'entry,companion_entry',
  exit: 'exit',
} as const;

interface ActivityTableProps {
  title: string;
  direction: 'entry' | 'exit';
  date?: string;
  /** Omitted = 全店舗: the feed spans every store in the caller's scope. */
  storeId?: string;
  /** Set to false while the caller's store scope is still resolving, to avoid an extra fetch. */
  enabled?: boolean;
}

function ActivityTableSkeleton() {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: COLUMN_COUNT }).map((__, col) => (
              <TableCell key={col} className="px-3 py-2">
                <Skeleton className="h-4 w-full max-w-[120px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** FR-B01-01/02/03/04: shared 入館/退館 table showing the 5 most recent rows for a direction. */
export function ActivityTable({
  title,
  direction,
  date,
  storeId,
  enabled = true,
}: Readonly<ActivityTableProps>) {
  const { data, isLoading, isError, refetch } = useQuery({
    ...adminVisitMonitorControllerActivityOptions({
      query: {
        eventTypes: EVENT_TYPES_BY_DIRECTION[direction],
        limit: 5,
        ...(storeId ? { storeId } : {}),
        ...(date ? { date } : {}),
      },
    }),
    enabled,
  });

  const rows = data?.items ?? [];

  // "本日" for today's realtime view; the selected date otherwise so the empty
  // state doesn't claim "today" when a past/other date is being viewed.
  const dateLabel =
    !date || date === getTodayJstISODate() ? '本日' : formatJapaneseDate(parseISO(date));

  return (
    <Card className="flex-1 gap-0 overflow-hidden py-0">
      <div className="bg-muted/50 flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {direction === 'entry' ? (
            <ArrowLeft className="text-success size-4" />
          ) : (
            <ArrowRight className="text-muted-foreground size-4" />
          )}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className="text-muted-foreground text-xs">最新5件</span>
      </div>

      {/* Empty is rendered inside the table body (DataTable `emptyContent` pattern) so the
          header row stays visible; the boundary only owns loading / error. */}
      <DataStateBoundary
        isLoading={isLoading || !enabled}
        isError={isError}
        isEmpty={false}
        onRetry={refetch}
        errorTitle={`${title}の取得に失敗しました`}
        skeleton={<ActivityTableSkeleton />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3 text-xs font-semibold">利用者</TableHead>
              <TableHead className="px-3 text-xs font-semibold">種別</TableHead>
              <TableHead className="px-3 text-xs font-semibold">時刻</TableHead>
              <TableHead className="px-3 text-xs font-semibold">ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMN_COUNT} className="p-0 whitespace-normal">
                  <Empty
                    title={`${dateLabel}の${title}記録はありません`}
                    description="日付や店舗の条件を変更すると表示されることがあります。"
                  />
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const time = formatTime(row.eventAt);
              const name = row.member?.name ?? '';
              const planName = row.member?.planName ?? '---';
              const genderClass =
                row.member?.sex === 'male'
                  ? 'text-gender-male'
                  : row.member?.sex === 'female'
                    ? 'text-gender-female'
                    : 'text-muted-foreground';
              const genderSymbol =
                row.member?.sex === 'male' ? '♂' : row.member?.sex === 'female' ? '♀' : '';
              // Codegen drops `nullable` on enums, so the runtime value can still be null.
              const companionRole: CompanionRole | null = row.companionBadge ?? null;
              // The feed includes denied scans; they must not read as a successful entry/exit.
              const isDenied = row.result !== 'allowed';

              return (
                <TableRow key={row.eventId}>
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex shrink-0 items-center gap-1">
                        <Avatar size="lg">
                          <AvatarImage
                            src={row.member?.facePhotoUrl ?? undefined}
                            alt={name}
                            className="object-cover"
                          />
                          <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        {genderSymbol && (
                          <span className={`text-xs font-medium ${genderClass}`}>
                            {genderSymbol}
                          </span>
                        )}
                      </div>
                      {/* Breakable + clamped to one line (not `truncate`/nowrap): a long name or an
                          unbroken token can shrink with the column instead of widening the table
                          and pushing 時刻/ステータス out of the card; the full value is in `title`. */}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p
                          className="line-clamp-1 text-xs font-medium break-all whitespace-normal"
                          title={name}
                        >
                          {name}
                        </p>
                        <p
                          className="text-2xs text-muted-foreground line-clamp-1 break-all whitespace-normal"
                          title={row.member?.nameKana ?? undefined}
                        >
                          {row.member?.nameKana}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[160px] px-3 py-2 whitespace-normal">
                    <p className="line-clamp-2 text-xs leading-tight" title={planName}>
                      {planName}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <p className="text-xs tabular-nums">{time}</p>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {isDenied || row.badge || companionRole ? (
                      <div className="flex flex-wrap gap-1">
                        {isDenied && <DeniedBadge />}
                        {companionRole && <CompanionBadge role={companionRole} />}
                        {row.badge && (
                          <FrequencyBadge tier={row.badge.tier} label={row.badge.label} />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">---</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataStateBoundary>

      <div className="mt-auto flex justify-center border-t py-2">
        <Button
          variant="link"
          size="sm"
          className="text-muted-foreground h-auto gap-1 p-0 text-xs"
          nativeButton={false}
          render={<Link href={navigate('/entry-exit/history')} />}
        >
          入退館履歴ですべて表示
          <ChevronRight className="size-3" />
        </Button>
      </div>
    </Card>
  );
}
