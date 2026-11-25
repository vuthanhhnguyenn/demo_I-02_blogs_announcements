'use client';

import { useEffect, useState } from 'react';

import { formatDateMonthDayJP } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';

import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  LessonScheduleListItemDto,
  MemberLookupItemDto,
} from '@/lib/api-real/types.gen';

import { formatMemberName } from '../[id]/reservations/_utils/booking-api.util';

/**
 * The most API-113 #20 returns (`limit` 1–50, no paging) — five hid most namesakes (CRM UT D-01
 * No22); past 50 the user narrows the search (hint below the list).
 */
const SEARCH_RESULT_LIMIT = 50;

/**
 * A picked member together with the remaining-count answer the modal validates it with — always
 * a complete one: a member whose plan / penalties could not be read cannot be picked.
 */
export interface ManualReservationMemberSelection {
  member: MemberLookupItemDto;
  remaining: LessonRemainingResponseDto;
}

type LessonType = NonNullable<LessonScheduleListItemDto['lessonType']>;

/**
 * The penalty in force that bars this lesson type (BR-LSN-013), if any. Read from
 * `activePenalties` — `activePenalty` is only the one that ends last, which can be another type.
 */
export function findPenaltyFor(
  remaining: LessonRemainingResponseDto | null | undefined,
  lessonType: LessonType | null | undefined,
) {
  if (!remaining || !lessonType) return null;
  return remaining.activePenalties.find((p) => p.penaltyType === lessonType) ?? null;
}

/**
 * 「月次プラン 残N回」 / 「都度払い」: a member holding a monthly-plan option shows the contract with
 * the most sessions left; no monthly-plan option means the member pays per use.
 */
export function formatPlanLabel(remaining: LessonRemainingResponseDto): string {
  if (remaining.contracts.length === 0) return '都度払い';
  const best = Math.max(...remaining.contracts.map((c) => c.effectiveRemaining));
  return `月次プラン 残${best}回`;
}

/** A monthly-plan member with no session left anywhere (FR-006 異常系 「残回数が不足しています」). */
export function hasNoSessionLeft(remaining: LessonRemainingResponseDto): boolean {
  return (
    remaining.contracts.length > 0 && remaining.contracts.every((c) => c.effectiveRemaining <= 0)
  );
}

interface ManualReservationMemberSearchProps {
  /** The picked セッション枠 — API-113 #20 scopes the lookup to it; null keeps the search closed. */
  scheduleId: string | null;
  lessonType: LessonType | null;
  /** Members already holding a seat on the schedule — the server would refuse them (422 E-LSB-002). */
  bookedMemberIds: string[];
  selectedMemberId: string;
  onSelect: (selection: ManualReservationMemberSelection) => void;
}

export function ManualReservationMemberSearch({
  scheduleId,
  lessonType,
  bookedMemberIds,
  selectedMemberId,
  onSelect,
}: ManualReservationMemberSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // API-113 #20 member lookup, bound to the schedule — prefix match over member number / legacy
  // code / name / kana for every role (Trainer: members with an active / suspended main contract at
  // the schedule's store). The members list (API-093) is closed to Trainer, who may still enter
  // bookings on their own sessions (FR-006 権限).
  const searchQuery = useQuery({
    ...adminLessonBookingControllerMemberLookupOptions({
      query: { scheduleId: scheduleId ?? '', query: debouncedQuery, limit: SEARCH_RESULT_LIMIT },
    }),
    enabled: !!scheduleId && debouncedQuery.length > 0,
  });

  const members = searchQuery.data?.items ?? [];

  // A failed search must not read as "no such member": Observer gets 403 (E-LSB-101), a schedule
  // outside the caller's write scope 404, and a network / 500 failure is not an empty result either.
  const emptyStateMessage = (() => {
    if (!scheduleId) return '先にセッション枠を選択してください';
    if (debouncedQuery.length === 0) return '会員名または会員番号を入力してください';
    if (searchQuery.isLoading) return '検索中...';
    if (searchQuery.isError) {
      return getApiErrorStatus(searchQuery.error) === 403
        ? '会員を検索する権限がありません'
        : '会員の検索に失敗しました';
    }
    return '該当する会員がいません';
  })();

  return (
    <div>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="会員名または会員番号で検索"
          className="h-9 pl-9 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!scheduleId}
        />
      </div>
      <div className="mt-2 max-h-80 overflow-auto rounded-lg border">
        <Table className="w-full min-w-105 table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-22.5 text-xs font-semibold">会員番号</TableHead>
              <TableHead className="w-36 text-xs font-semibold">会員名</TableHead>
              <TableHead className="text-xs font-semibold">プラン・残回数</TableHead>
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
                  lessonType={lessonType}
                  isSelected={member.memberId === selectedMemberId}
                  isBooked={bookedMemberIds.includes(member.memberId)}
                  onSelect={onSelect}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {members.length >= SEARCH_RESULT_LIMIT && (
        <p className="text-muted-foreground mt-1 text-xs">
          上位{SEARCH_RESULT_LIMIT}
          件を表示しています。見つからない場合は検索条件を追加してください。
        </p>
      )}
    </div>
  );
}

interface MemberSearchRowProps {
  member: MemberLookupItemDto;
  lessonType: LessonType | null;
  isSelected: boolean;
  isBooked: boolean;
  onSelect: (selection: ManualReservationMemberSelection) => void;
}

/** One result row; plan / remaining count / penalty come from `GET /members/{id}/lesson-remaining`. */
function MemberSearchRow({
  member,
  lessonType,
  isSelected,
  isBooked,
  onSelect,
}: MemberSearchRowProps) {
  const remainingQuery = useQuery({
    ...adminLessonBookingControllerLessonRemainingOptions({
      path: { memberId: member.memberId },
    }),
  });
  // A failed read is not 「都度払い」, nor is `available: false` (contracts-svc not reached, so the
  // plan is unknown): the row shows the failure with 再試行 and cannot be picked until it loads.
  const remaining = remainingQuery.data?.available ? remainingQuery.data : null;
  const isRemainingUnknown = !remaining && !remainingQuery.isFetching;
  const penalty = findPenaltyFor(remaining, lessonType);

  const planCell = remaining ? (
    hasNoSessionLeft(remaining) ? (
      <span className="text-destructive font-medium">{formatPlanLabel(remaining)}</span>
    ) : (
      formatPlanLabel(remaining)
    )
  ) : isRemainingUnknown ? (
    <span className="flex flex-wrap items-center gap-x-1 whitespace-normal">
      <span className="text-destructive">取得に失敗しました</span>
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
    <span className="text-muted-foreground">…</span>
  );

  return (
    <TableRow
      className={
        isSelected ? 'bg-primary/10' : isBooked ? 'text-muted-foreground opacity-60' : undefined
      }
    >
      <TableCell className="text-muted-foreground text-xs">
        <TextWithTooltip text={member.memberNumber} className="max-w-[74px] text-xs" />
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 flex-col">
          <TextWithTooltip
            text={formatMemberName(member)}
            className="max-w-[136px] text-sm font-medium"
          />
          {penalty && (
            <TextWithTooltip
              text={`ペナルティ中（${formatDateMonthDayJP(penalty.endAt)}まで）`}
              className="text-destructive max-w-[136px] text-[10px]"
            />
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs">{planCell}</TableCell>
      <TableCell>
        {isSelected ? (
          <span className="text-primary flex items-center gap-1 text-xs font-medium">
            <Check className="size-3" />
            選択中
          </span>
        ) : isBooked ? (
          <span className="text-muted-foreground text-xs">予約済み</span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => remaining && onSelect({ member, remaining })}
            disabled={!remaining}
          >
            選択
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
