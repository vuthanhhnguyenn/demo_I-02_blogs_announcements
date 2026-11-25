'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { TEXTAREA_MAX_LENGTH } from '@/constants/app.constants';
import { toSelectItems } from '@/utils/app.util';
import { formatDateMonthDayJP } from '@/utils/date.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  adminLessonBookingControllerBookingStatsOptions,
  adminLessonBookingControllerCreateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  CreateLessonBookingRequestDto,
  LessonRemainingPlanItemDto,
  LessonScheduleListItemDto,
} from '@/lib/api-real/types.gen';

import {
  formatMemberName,
  invalidateBookingQueries,
} from '../[id]/reservations/_utils/booking-api.util';
import {
  listFreeSeats,
  pickMonthlyPlanContract,
} from '../[id]/reservations/_utils/booking-create.util';
import {
  type ManualReservationFormValues,
  manualReservationFormSchema,
} from '../_schemas/manual-reservation-form.schema';
import {
  type LessonScheduleListQuery,
  formatTrainerNames,
  invalidateLessonScheduleQueries,
  lessonScheduleAllPagesOptions,
} from '../_utils/lesson-schedule-api.util';
import { formatTimeRange, seatBookingCount } from '../_utils/lesson-schedule-display.util';
import {
  ManualReservationMemberSearch,
  type ManualReservationMemberSelection,
  findPenaltyFor,
  hasNoSessionLeft,
} from './manual-reservation-member-search';

type ManualReservationCourse = 'monthly' | 'single_30' | 'single_60';

const COURSE_OPTIONS: { value: ManualReservationCourse; label: string }[] = [
  { value: 'monthly', label: '月次プラン' },
  { value: 'single_30', label: '都度30分' },
  { value: 'single_60', label: '都度60分' },
];
const COURSE_ITEMS = toSelectItems(COURSE_OPTIONS);

const DEFAULT_VALUES: ManualReservationFormValues = {
  memberId: '',
  scheduleId: '',
  course: '',
  note: '',
};

/** The page's schedule-list scope: one store (店舗別) or the trainer's own sessions. */
export type ManualReservationScope = Pick<LessonScheduleListQuery, 'view' | 'storeId'>;

interface ManualReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The day the schedule screen shows — its sessions are the セッション枠 candidates. */
  date: string;
  /** null when the screen has no single store to list (エリア別, or 全店舗 with no store picked). */
  scope: ManualReservationScope | null;
}

export function ManualReservationModal({
  open,
  onOpenChange,
  date,
  scope,
}: ManualReservationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ManualReservationModalContent onOpenChange={onOpenChange} date={date} scope={scope} />
      )}
    </Dialog>
  );
}

function ManualReservationModalContent({
  onOpenChange,
  date,
  scope,
}: Omit<ManualReservationModalProps, 'open'>) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<ManualReservationMemberSelection | null>(null);

  const form = useForm<ManualReservationFormValues>({
    resolver: zodResolver(manualReservationFormSchema),
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });

  const { confirmDiscard } = useUnsavedChanges(form.formState.isDirty);

  const [scheduleId, memberId, course] = useWatch({
    control: form.control,
    name: ['scheduleId', 'memberId', 'course'],
  });

  // セッション枠: the day's live sessions in the screen's scope that still have a seat —
  // unpublished ones included (FR-006: 公開設定OFFの枠にも入力可能).
  const slotsQuery = useQuery({
    ...lessonScheduleAllPagesOptions({
      from: date,
      to: date,
      sort: 'scheduledDate',
      order: 'asc',
      ...scope,
    }),
    enabled: scope !== null,
  });
  const slots = (slotsQuery.data ?? []).filter((s) => seatBookingCount(s) < s.capacity);
  const selectedSlot = slots.find((s) => s.id === scheduleId) ?? null;
  const scheduleItems = toSelectItems(
    slots.map((s) => ({ value: s.id, label: buildScheduleLabel(s) })),
  );
  const slotPlaceholder =
    scope === null
      ? '店舗を選択してください'
      : slotsQuery.isLoading
        ? '読み込み中...'
        : slotsQuery.isError
          ? '枠の取得に失敗しました'
          : slots.length === 0
            ? '予約できる枠がありません'
            : '枠を選択してください';

  // A studio session books a seat (API-113 §6.1 #10) — the first free one, read from the seat grid
  const isStudioSlot = selectedSlot?.lessonType === 'studio';
  const statsQuery = useQuery({
    ...adminLessonBookingControllerBookingStatsOptions({ path: { scheduleId } }),
    enabled: isStudioSlot,
  });
  const seats = statsQuery.data?.seats ?? [];
  const freeSeat = listFreeSeats(seats)[0] ?? null;
  const bookedMemberIds = seats.flatMap((s) => (s.memberId ? [s.memberId] : []));
  const seatReason =
    isStudioSlot && statsQuery.isSuccess && !freeSeat ? '空いているスペースがありません' : null;
  // No free seat is known until the grid loads: a failed read says so with 再試行 rather than
  // leaving 予約を登録 disabled for no visible reason; a retry counts as loading again.
  const isSeatStatsError = isStudioSlot && statsQuery.isError && !statsQuery.isFetching;

  // FR-006 異常系 — member level: no monthly-plan session left, or a penalty on this lesson type
  const remaining = selection?.remaining ?? null;
  const penalty = findPenaltyFor(remaining, selectedSlot?.lessonType);
  const blockReason = !remaining
    ? null
    : hasNoSessionLeft(remaining)
      ? '残回数が不足しています'
      : penalty
        ? `予約不可期間中の会員です（${formatDateMonthDayJP(penalty.endAt)}まで）`
        : null;
  const isBlocked = blockReason !== null;

  // 月次プラン books on a monthly-plan option contract (API-113 §6.1 #5) — a member without one
  // cannot take that course. The plan is always known here: an unread one cannot be picked.
  const monthlyContract = course === 'monthly' ? pickMonthlyPlanContract(remaining) : undefined;
  const courseBlockReason =
    course !== 'monthly' || !selection || monthlyContract ? null : '月次プランの契約がありません';

  const canSubmit =
    form.formState.isValid &&
    !!selectedSlot &&
    !!selection &&
    !isBlocked &&
    !courseBlockReason &&
    !seatReason &&
    !isSeatStatsError &&
    (!isStudioSlot || !!freeSeat);

  // Refusals (E-LSB-002 already booked, E-LSB-006 no session left, E-LSB-007 full, E-LSB-009 seat
  // taken, …) are toasted by the shared MutationCache; the slots and seats refetch either way.
  const mutation = useMutation({
    ...adminLessonBookingControllerCreateMutation(),
    onSuccess: (_data, { body }) => {
      toast.success('予約を登録しました', {
        description: `${selection ? formatMemberName(selection.member) : ''} 様の予約をスケジュールに反映しました。モバイルアプリへ予約確定通知を送信します`,
      });
      invalidateAfterWrite(body.lessonScheduleId);
      handleClose();
    },
    onError: (_error, { body }) => invalidateAfterWrite(body.lessonScheduleId),
  });

  function invalidateAfterWrite(writtenScheduleId: string) {
    invalidateLessonScheduleQueries(queryClient);
    invalidateBookingQueries(queryClient, writtenScheduleId);
  }

  function handleClose() {
    form.reset(DEFAULT_VALUES);
    setSelection(null);
    onOpenChange(false);
  }

  // The member lookup is bound to the schedule and the penalty to its lesson type, so a new
  // セッション枠 drops the picked member.
  function handleSlotChange(value: string) {
    form.setValue('scheduleId', value, { shouldDirty: true, shouldValidate: true });
    form.setValue('memberId', '', { shouldValidate: true });
    setSelection(null);
  }

  function handleMemberSelect(next: ManualReservationMemberSelection) {
    setSelection(next);
    form.setValue('memberId', next.member.memberId, { shouldDirty: true, shouldValidate: true });
  }

  function onSubmit(values: ManualReservationFormValues) {
    if (!canSubmit || !selectedSlot) return;
    mutation.mutate({
      body: buildManualBookingBody({
        slot: selectedSlot,
        memberId: values.memberId,
        contract: monthlyContract,
        studioSeatId: isStudioSlot ? (freeSeat?.studioSeatId ?? null) : null,
        note: values.note,
      }),
    });
  }

  return (
    <DialogContent className="flex max-h-[720px] w-full max-w-[560px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
      <DialogHeader className="shrink-0 border-b px-6 py-4">
        <DialogTitle>予約手動入力</DialogTitle>
        <DialogDescription>モードBの通知調整を経て確定した予約をCRMに入力します</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          id="manual-reservation-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex-1 space-y-4 overflow-y-auto px-6 py-4"
        >
          {/* The slot comes first: the member lookup (API-113 #20) is scoped to it */}
          <FormField
            control={form.control}
            name="scheduleId"
            render={({ field }) => (
              <FormItem>
                <p className="mb-1 text-xs font-bold">
                  セッション枠 <span className="text-destructive">*</span>
                </p>
                <Select
                  value={field.value}
                  onValueChange={(value) => handleSlotChange(value ?? '')}
                  items={scheduleItems}
                  disabled={slots.length === 0}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder={slotPlaceholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {slots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {buildScheduleLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {formatDateMonthDayJP(date)}
                  の枠から選択します。公開設定OFFの枠（非公開枠）にも入力できます
                </p>
                {seatReason && (
                  <div className="bg-destructive/10 text-destructive mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
                    <CircleAlert className="size-4 shrink-0" />
                    {seatReason}
                  </div>
                )}
                {isSeatStatsError && (
                  <div className="bg-destructive/10 text-destructive mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
                    <CircleAlert className="size-4 shrink-0" />
                    空席情報の取得に失敗しました
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      className="ml-auto h-auto p-0"
                      onClick={() => void statsQuery.refetch()}
                    >
                      再試行
                    </Button>
                  </div>
                )}
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="memberId"
            render={() => (
              <FormItem>
                <p className="mb-1 text-xs font-bold">
                  会員検索（会員ID・氏名） <span className="text-destructive">*</span>
                </p>
                <ManualReservationMemberSearch
                  scheduleId={selectedSlot?.id ?? null}
                  lessonType={selectedSlot?.lessonType ?? null}
                  bookedMemberIds={bookedMemberIds}
                  selectedMemberId={memberId}
                  onSelect={handleMemberSelect}
                />
                {blockReason && (
                  <div className="bg-destructive/10 text-destructive mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
                    <CircleAlert className="size-4 shrink-0" />
                    {blockReason}
                  </div>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="course"
            render={({ field }) => (
              <FormItem>
                <p className="mb-1 text-xs font-bold">
                  コース <span className="text-destructive">*</span>
                </p>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={COURSE_ITEMS}
                  disabled={isBlocked}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="コースを選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COURSE_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  月次プランの場合、残回数を1消費します
                </p>
                {courseBlockReason && (
                  <div className="bg-destructive/10 text-destructive mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
                    <CircleAlert className="size-4 shrink-0" />
                    {courseBlockReason}
                  </div>
                )}
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <p className="mb-1 text-xs font-bold">備考</p>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="備考を入力してください（例: 電話で調整済み）"
                    className="resize-none text-sm"
                    rows={2}
                    disabled={isBlocked}
                    maxLength={TEXTAREA_MAX_LENGTH}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <DialogFooter className="shrink-0 flex-col gap-2 px-6 pb-6 sm:flex-col sm:justify-between">
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-sm"
            onClick={() => confirmDiscard(handleClose)}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            form="manual-reservation-form"
            size="lg"
            disabled={!canSubmit || mutation.isPending || form.formState.isSubmitting}
          >
            {mutation.isPending ? '登録中...' : '予約を登録'}
          </Button>
        </div>
        <p className="text-muted-foreground w-full text-right text-[10px]">
          入力後、会員のモバイルアプリに予約確定通知を送信します
        </p>
      </DialogFooter>
    </DialogContent>
  );
}

interface BuildManualBookingBodyArgs {
  slot: LessonScheduleListItemDto;
  memberId: string;
  /** The monthly-plan contract to draw on (月次プラン); undefined for the 都度 courses. */
  contract: LessonRemainingPlanItemDto | undefined;
  studioSeatId: string | null;
  note: string | undefined;
}

/**
 * `POST /admin/lesson-bookings` for one manual entry (API-113 §1):
 * - 月次プラン → `monthly_plan` on the monthly-plan contract with the most sessions left;
 * - 都度 → `per_use`; `feeCharged` is left to the BE (the lesson's fee snapshot) unless the lesson
 *   has no per-use fee, which sends 0 (§6.1 #7 — 0 is allowed, omitted with no fee is a 400);
 * - `statusOnCreate: 'reserved'` — the booking was already agreed through Mode B (FR-006);
 * - `studioSeatId` only on a studio session — PT / body care must omit it (§6.1 #11).
 *
 * TODO(round2) B12: 都度30分 / 都度60分 have no API field — the session length is the lesson's,
 * so both send `per_use`.
 */
function buildManualBookingBody({
  slot,
  memberId,
  contract,
  studioSeatId,
  note,
}: BuildManualBookingBodyArgs): CreateLessonBookingRequestDto {
  const body: CreateLessonBookingRequestDto = {
    lessonScheduleId: slot.id,
    memberId,
    statusOnCreate: 'reserved',
    ...(contract
      ? { paymentType: 'monthly_plan', optionContractId: contract.optionContractId }
      : { paymentType: 'per_use', ...(slot.feeType === 'per_use' ? {} : { feeCharged: 0 }) }),
  };
  if (slot.lessonType === 'studio' && studioSeatId) {
    body.studioSeatId = studioSeatId;
  }
  const trimmedNote = note?.trim();
  if (trimmedNote) {
    body.notes = trimmedNote;
  }
  return body;
}

/** The prototype's slot line: 「14:00〜15:00 パーソナルブースA（山田 太郎）※非公開枠」. */
function buildScheduleLabel(s: LessonScheduleListItemDto) {
  const place = [s.studioName, s.lessonName].filter(Boolean).join(' ');
  const trainers = formatTrainerNames(s);
  return `${formatTimeRange(s.startTime, s.endTime)} ${place}${trainers ? `（${trainers}）` : ''}${s.isPublished ? '' : '※非公開枠'}`;
}
