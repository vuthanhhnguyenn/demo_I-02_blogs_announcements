'use client';

import { useRef, useState } from 'react';

import { formatDateMonthDayJP } from '@/utils/date.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { adminLessonBookingControllerCreateMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonBookingSeatStatusDto, LessonScheduleDetailDto } from '@/lib/api-real/types.gen';

import { formatMemberName, invalidateBookingQueries } from '../_utils/booking-api.util';
import {
  buildCreateBookingBody,
  buildSeatQueue,
  findBlockingPenalty,
  listFreeSeats,
  pickMonthlyPlanContract,
} from '../_utils/booking-create.util';
import { formatScheduleDateLong, formatScheduleTimeRange } from '../_utils/schedule-datetime.util';
import {
  AddReservationMemberSearch,
  type MemberSearchSelection,
} from './add-reservation-member-search';

const AUTO_SEAT = 'auto';
/** API-113 §7.1 `notes` max 2,000 chars. */
const NOTES_MAX_LENGTH = 2000;

interface AddReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  schedule: LessonScheduleDetailDto;
  /** `booking-stats.seats[]` — the seat picker and the 自動割り当て candidates. */
  seats: LessonBookingSeatStatusDto[];
  /** Members holding a seat on the schedule (`booking-stats.seats[].memberId`, pending included) — greyed out in the search. */
  bookedMemberIds: string[];
  preselectedSeatId?: string | null;
  /** `booking-stats.available` (decision D9). */
  remainingSeats: number;
}

type MemberWarning = {
  type: 'no-count' | 'penalty';
  message: string;
};

export function AddReservationDialog({
  open,
  onOpenChange,
  scheduleId,
  schedule,
  seats,
  bookedMemberIds,
  preselectedSeatId,
  remainingSeats: initialRemainingSeats,
}: AddReservationDialogProps) {
  const [addedMembers, setAddedMembers] = useState<MemberSearchSelection[]>([]);
  const [warning, setWarning] = useState<MemberWarning | null>(null);
  const [seatId, setSeatId] = useState(preselectedSeatId ?? AUTO_SEAT);
  // FR-006 備考 — one note, applied to every booking created in this batch.
  const [notes, setNotes] = useState('');
  const [prevOpen, setPrevOpen] = useState(open);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State drives the disabled look; the ref closes the one-render window in which several
  // clicks fired in the same tick all see `isSubmitting === false` (BUG-D01B-03).
  const isSubmittingRef = useRef(false);
  const queryClient = useQueryClient();

  // Re-sync the preselected seat whenever the dialog transitions to open (it stays
  // mounted across opens, so a plain useState initializer only runs once).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSeatId(preselectedSeatId ?? AUTO_SEAT);
  }

  const lesson = schedule.lesson;
  const isStudioLesson = lesson?.lessonType === 'studio';
  const freeSeats = listFreeSeats(seats);
  const remainingSeats = initialRemainingSeats - addedMembers.length;
  // A picked seat that was taken meanwhile (refetch after a refusal) falls back to 自動割り当て
  // instead of being re-sent and refused again.
  const selectedSeatId = freeSeats.some((s) => s.studioSeatId === seatId) ? seatId : AUTO_SEAT;
  // Every studio booking needs its own seat (API-113 §6.1 #10), so the batch cannot be larger
  // than the free seats — `available` alone does not know which seats pending holds occupy.
  const isSeatShortage = isStudioLesson && addedMembers.length > freeSeats.length;

  const formatScheduleDateTime = () =>
    `${formatScheduleDateLong(schedule)} ${formatScheduleTimeRange(schedule)}`;

  // FR-006 — the confirmation notification is unconditional on the BE (spec clarification
  // 2026-10-07). Error toasts come from the shared MutationCache, one per failed member.
  const addReservation = useMutation({
    ...adminLessonBookingControllerCreateMutation(),
  });

  const handleAdd = (selection: MemberSearchSelection) => {
    if (remainingSeats <= 0) return;
    const { member, remaining } = selection;
    if (lesson?.feeType === 'monthly_plan' && !pickMonthlyPlanContract(remaining)) {
      setWarning({ type: 'no-count', message: '残回数が不足しています' });
      return;
    }
    const penalty = findBlockingPenalty(remaining, lesson?.lessonType);
    if (penalty) {
      setWarning({
        type: 'penalty',
        message: `予約不可期間中の会員です（${formatDateMonthDayJP(penalty.endAt)}まで）`,
      });
      return;
    }
    setWarning(null);
    if (!addedMembers.find((m) => m.member.memberId === member.memberId)) {
      setAddedMembers((prev) => [...prev, selection]);
    }
  };

  const handleRemove = (memberId: string) => {
    setAddedMembers((prev) => prev.filter((m) => m.member.memberId !== memberId));
  };

  /**
   * Decision D2 — one POST per member, sequentially so 自動割り当て hands each member the
   * next free seat. A member whose POST fails (422 E-LSB-006 / 007 / 009 / 010, 400 …) stays
   * in the chip list with the dialog open; successful members are removed.
   */
  const handleConfirm = async () => {
    if (addedMembers.length === 0 || isSeatShortage || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const seatQueue = buildSeatQueue(
      freeSeats,
      selectedSeatId === AUTO_SEAT ? null : selectedSeatId,
    );
    const failed: MemberSearchSelection[] = [];
    let succeeded = 0;

    for (const [index, selection] of addedMembers.entries()) {
      const studioSeatId = isStudioLesson ? (seatQueue[index] ?? null) : null;
      try {
        await addReservation.mutateAsync({
          body: buildCreateBookingBody({
            scheduleId,
            memberId: selection.member.memberId,
            lesson,
            remaining: selection.remaining,
            studioSeatId,
            notes,
          }),
        });
        succeeded += 1;
      } catch {
        failed.push(selection);
      }
    }

    isSubmittingRef.current = false;
    setIsSubmitting(false);
    if (succeeded > 0) {
      toast.success(`予約を追加しました（${succeeded}名）`);
    }
    // Refetch even when every POST failed — a refusal (E-LSB-006 seat taken, E-LSB-007 full …)
    // means the server state moved under us, so the seat picker, rows and stats must catch up
    // while the failed members stay in the chip list (BUG-D01B-04).
    invalidateBookingQueries(queryClient, scheduleId);
    if (failed.length === 0) {
      handleClose();
    } else {
      setAddedMembers(failed);
    }
  };

  const handleClose = () => {
    setAddedMembers([]);
    setWarning(null);
    setSeatId(preselectedSeatId ?? AUTO_SEAT);
    setNotes('');
    onOpenChange(false);
  };

  const seatLabel = (id: string) => seats.find((s) => s.studioSeatId === id)?.seatNumber ?? id;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-[520px] flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">予約を追加する</DialogTitle>
          <p className="text-muted-foreground text-xs">
            {formatScheduleDateTime()} | {lesson?.name ?? '—'} | 残り{remainingSeats}席
          </p>
        </DialogHeader>

        {/* Scrolls internally so many chips + result rows never push the footer off a 1024×768 screen */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          {/* Added members chips */}
          {addedMembers.length > 0 && (
            <div className="bg-success/10 border-success/20 rounded-lg border p-3">
              <p className="text-success mb-2 text-xs font-medium">
                追加予定（{addedMembers.length}名）
              </p>
              <div className="flex flex-wrap gap-2">
                {addedMembers.map(({ member }) => (
                  <span
                    key={member.memberId}
                    className="bg-background border-success/20 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                  >
                    <span className="font-medium">{formatMemberName(member)}</span>
                    <span className="text-muted-foreground">{member.memberNumber}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive ml-1 size-4"
                      onClick={() => handleRemove(member.memberId)}
                    >
                      <X className="size-3" />
                    </Button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          {warning && (
            <div
              className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
                warning.type === 'penalty'
                  ? 'bg-destructive/10 border-destructive/20 text-destructive border'
                  : 'bg-warning/10 border-warning/20 text-warning border'
              }`}
            >
              <AlertCircle className="size-4 shrink-0" />
              {warning.message}
            </div>
          )}

          {/* Member Search */}
          <AddReservationMemberSearch
            scheduleId={scheduleId}
            lesson={lesson}
            addedMemberIds={addedMembers.map((m) => m.member.memberId)}
            bookedMemberIds={bookedMemberIds}
            remainingSeats={remainingSeats}
            onAdd={handleAdd}
          />

          {/* Seat (studio lessons only — PT / body care bookings carry no seat) */}
          {isStudioLesson && (
            <div>
              <Label className="mb-2 block text-xs font-medium">スペース番号</Label>
              <Select value={selectedSeatId} onValueChange={(v) => setSeatId(v ?? AUTO_SEAT)}>
                <SelectTrigger className="h-9 w-[200px] text-sm">
                  <SelectValue>
                    {(value) =>
                      !value || value === AUTO_SEAT
                        ? '自動割り当て'
                        : `スペース ${seatLabel(String(value))}`
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_SEAT}>自動割り当て</SelectItem>
                  {freeSeats.map((s) => (
                    <SelectItem key={s.studioSeatId} value={s.studioSeatId}>
                      スペース {s.seatNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSeatId !== AUTO_SEAT && addedMembers.length > 1 && (
                <p className="text-muted-foreground mt-1 text-[10px]">
                  1人目にスペース {seatLabel(selectedSeatId)}
                  、2人目以降には空きスペースを自動で割り当てます
                </p>
              )}
              {isSeatShortage && (
                <p className="text-destructive mt-1 text-[10px]">
                  空きスペースが不足しています（空き{freeSeats.length}席）
                </p>
              )}
            </div>
          )}

          {/* 備考 (FR-006) — API-113 §7.1 `notes`, optional, max 2,000 */}
          <div>
            <Label htmlFor="add-reservation-notes" className="mb-2 block text-xs font-medium">
              備考（任意）
            </Label>
            <Textarea
              id="add-reservation-notes"
              className="min-h-[60px] text-sm"
              placeholder="予約に関するメモ（例: 初回参加、見学者同伴）"
              maxLength={NOTES_MAX_LENGTH}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-right text-[10px]">
              {notes.length} / {NOTES_MAX_LENGTH}
            </p>
            {addedMembers.length > 1 && (
              <p className="text-muted-foreground mt-1 text-[10px]">
                備考は追加予定の{addedMembers.length}名すべての予約に記録されます
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            キャンセル
          </Button>
          {addedMembers.length > 0 && (
            <Button size="sm" onClick={handleConfirm} disabled={isSubmitting || isSeatShortage}>
              追加確定（{addedMembers.length}名）
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
