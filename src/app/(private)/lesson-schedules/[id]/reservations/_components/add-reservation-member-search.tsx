'use client';

import { useEffect, useState } from 'react';

import { formatDateMonthDayJP } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { Check, Search, UserRoundPlus } from 'lucide-react';

import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminLessonBookingControllerLessonRemainingOptions,
  adminLessonBookingControllerMemberLookupOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  LessonRemainingResponseDto,
  MemberLookupItemDto,
  ScheduleLessonSummaryDto,
} from '@/lib/api-real/types.gen';

import { formatMemberName } from '../_utils/booking-api.util';
import { findBlockingPenalty, pickMonthlyPlanContract } from '../_utils/booking-create.util';

/**
 * The most API-113 #20 returns (`limit` 1–50, no paging). Five hid most namesakes (CRM UT D-01
 * No22: 「タム」 matched 82 members); past 50 the user narrows the search (hint below the list).
 */
const SEARCH_RESULT_LIMIT = 50;

/**
 * A search hit together with the remaining-count answer the dialog needs to validate it —
 * always a complete one: a member whose plan / penalties could not be read cannot be added.
 */
export interface MemberSearchSelection {
  member: MemberLookupItemDto;
  remaining: LessonRemainingResponseDto;
}

interface AddReservationMemberSearchProps {
  /** The schedule being booked — API-113 #20 scopes the lookup to it. */
  scheduleId: string;
  lesson: ScheduleLessonSummaryDto | null;
  addedMemberIds: string[];
  /** Already booked on the schedule — the server would refuse them (422 E-LSB-002). */
  bookedMemberIds: string[];
  remainingSeats: number;
  onAdd: (selection: MemberSearchSelection) => void;
}

export function AddReservationMemberSearch({
  scheduleId,
  lesson,
  addedMemberIds,
  bookedMemberIds,
  remainingSeats,
  onAdd,
}: AddReservationMemberSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // API-113 #20 member lookup, bound to the schedule — prefix match over member number /
  // legacy code / name / kana for every role (Trainer: members with an active / suspended main
  // contract at the schedule's store). API-093 stays closed to Trainer (PO decision 2026-10-09).
  const searchQuery = useQuery({
    ...adminLessonBookingControllerMemberLookupOptions({
      query: { scheduleId, query: debouncedQuery, limit: SEARCH_RESULT_LIMIT },
    }),
    enabled: debouncedQuery.length > 0,
  });

  const members = searchQuery.data?.items ?? [];

  // A failed search must not read as "no such member" (BUG-D01B-05): Observer gets 403
  // (E-LSB-101), a schedule outside the caller's write scope 404, and a network/500 failure
  // is not an empty result either.
  const emptyStateMessage = (() => {
    if (searchQuery.isLoading) return '検索中...';
    if (searchQuery.isError) {
      return getApiErrorStatus(searchQuery.error) === 403
        ? '会員を検索する権限がありません'
        : '会員の検索に失敗しました';
    }
    return '該当する会員が見つかりません';
  })();

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">会員検索（氏名・会員ID）</Label>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="会員名または会員番号で検索"
          className="h-9 pl-9 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {debouncedQuery.length > 0 && (
        <div className="max-h-80 overflow-auto rounded-lg border">
          <Table className="w-full min-w-105 table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-22.5 text-xs font-semibold">会員番号</TableHead>
                <TableHead className="w-40 text-xs font-semibold">会員名</TableHead>
                <TableHead className="w-16 text-xs font-semibold">残回数</TableHead>
                <TableHead className="w-20 text-xs font-semibold" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-16 text-center text-xs">
                    {emptyStateMessage}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <MemberSearchRow
                    key={member.memberId}
                    member={member}
                    lesson={lesson}
                    isAdded={addedMemberIds.includes(member.memberId)}
                    isBooked={bookedMemberIds.includes(member.memberId)}
                    disabled={remainingSeats <= 0}
                    onAdd={onAdd}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {members.length >= SEARCH_RESULT_LIMIT && (
        <p className="text-muted-foreground text-xs">
          上位{SEARCH_RESULT_LIMIT}
          件を表示しています。見つからない場合は検索条件を追加してください。
        </p>
      )}
    </div>
  );
}

interface MemberSearchRowProps {
  member: MemberLookupItemDto;
  lesson: ScheduleLessonSummaryDto | null;
  isAdded: boolean;
  isBooked: boolean;
  disabled: boolean;
  onAdd: (selection: MemberSearchSelection) => void;
}

/** One result row; the remaining count / penalty come from `GET /members/{id}/lesson-remaining`. */
function MemberSearchRow({
  member,
  lesson,
  isAdded,
  isBooked,
  disabled,
  onAdd,
}: MemberSearchRowProps) {
  const remainingQuery = useQuery({
    ...adminLessonBookingControllerLessonRemainingOptions({
      path: { memberId: member.memberId },
    }),
  });
  // A failed read is not 「0回」, nor is `available: false` (contracts-svc not reached, so the
  // plan is unknown): the row shows the failure with 再試行 and cannot be added until it loads.
  const remaining = remainingQuery.data?.available ? remainingQuery.data : null;
  const isRemainingUnknown = !remaining && !remainingQuery.isFetching;
  const contract = pickMonthlyPlanContract(remaining);
  const penalty = findBlockingPenalty(remaining, lesson?.lessonType);
  const isMonthlyPlanLesson = lesson?.feeType === 'monthly_plan';

  const remainingCell = remaining ? (
    !isMonthlyPlanLesson ? (
      <span className="text-muted-foreground text-xs">—</span>
    ) : contract ? (
      <span className="text-xs">{contract.effectiveRemaining}回</span>
    ) : (
      <span className="text-destructive text-xs font-medium">0回</span>
    )
  ) : isRemainingUnknown ? (
    <span className="flex flex-col items-start">
      <span className="text-destructive text-xs">取得失敗</span>
      <Button
        type="button"
        variant="link"
        size="xs"
        className="h-auto p-0"
        onClick={() => void remainingQuery.refetch()}
      >
        再試行
      </Button>
    </span>
  ) : (
    <span className="text-muted-foreground text-xs">…</span>
  );

  return (
    <TableRow
      className={
        isAdded ? 'bg-success/10' : isBooked ? 'text-muted-foreground opacity-60' : undefined
      }
    >
      <TableCell className="text-muted-foreground text-xs">
        <TextWithTooltip text={member.memberNumber} className="max-w-[74px] text-xs" />
      </TableCell>
      <TableCell className="max-w-40">
        <div className="flex min-w-0 flex-col">
          <TextWithTooltip
            text={formatMemberName(member)}
            className="max-w-[144px] text-sm font-medium"
          />
          {penalty && (
            <TextWithTooltip
              text={`ペナルティ中（${formatDateMonthDayJP(penalty.endAt)}まで）`}
              className="text-destructive max-w-[144px] text-[10px]"
            />
          )}
        </div>
      </TableCell>
      <TableCell>{remainingCell}</TableCell>
      <TableCell>
        {isAdded ? (
          <span className="text-success flex items-center gap-1 text-xs font-medium">
            <Check className="size-3" />
            追加済み
          </span>
        ) : isBooked ? (
          <span className="text-muted-foreground text-xs">予約済み</span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => remaining && onAdd({ member, remaining })}
            disabled={disabled || !remaining}
          >
            <UserRoundPlus className="mr-1 size-3" />
            追加
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
