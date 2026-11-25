import type {
  CreateLessonBookingRequestDto,
  LessonBookingSeatStatusDto,
  LessonRemainingPlanItemDto,
  LessonRemainingResponseDto,
  ScheduleLessonSummaryDto,
} from '@/lib/api-real/types.gen';

/** A seat the add dialog may assign: a normal seat with no booking and no pending hold. */
export function isFreeSeat(seat: LessonBookingSeatStatusDto): boolean {
  // A pending hold is a holder (API-113 v0.14: `bookingId` set, `bookingStatus: 'pending'`) — not free.
  return seat.seatType === 'normal' && seat.bookingId === null && seat.bookingStatus === null;
}

/** Free seats in reading order (row, then column) — the 自動割り当て candidates. */
export function listFreeSeats(seats: LessonBookingSeatStatusDto[]): LessonBookingSeatStatusDto[] {
  return seats
    .filter(isFreeSeat)
    .sort((a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex);
}

/**
 * Seats for one submit, in member order. A chosen seat goes to the first member and every
 * other member gets the next free seat (自動割り当て), so a batch never sends a member without
 * a seat (API-113 §6.1 #10 → 422 E-LSB-009). A chosen seat that is no longer free (taken
 * between renders) is ignored and the batch falls back to auto-assignment.
 */
export function buildSeatQueue(
  freeSeats: LessonBookingSeatStatusDto[],
  chosenSeatId: string | null,
): string[] {
  const freeIds = freeSeats.map((s) => s.studioSeatId);
  if (chosenSeatId === null || !freeIds.includes(chosenSeatId)) return freeIds;
  return [chosenSeatId, ...freeIds.filter((id) => id !== chosenSeatId)];
}

/** The monthly-plan contract the booking should consume: highest `effectiveRemaining` > 0. */
export function pickMonthlyPlanContract(
  remaining: LessonRemainingResponseDto | null | undefined,
): LessonRemainingPlanItemDto | undefined {
  if (!remaining) return undefined;
  return remaining.contracts
    .filter((c) => c.effectiveRemaining > 0)
    .sort((a, b) => b.effectiveRemaining - a.effectiveRemaining)[0];
}

/**
 * The member's penalty that blocks THIS lesson type, if any (decision D4). Read from
 * `activePenalties` — `activePenalty` is only the one that ends last, which can be another type.
 */
export function findBlockingPenalty(
  remaining: LessonRemainingResponseDto | null | undefined,
  lessonType: ScheduleLessonSummaryDto['lessonType'] | undefined,
) {
  if (!remaining) return null;
  if (!lessonType) return remaining.activePenalty;
  return remaining.activePenalties.find((p) => p.penaltyType === lessonType) ?? null;
}

interface BuildCreateBookingBodyArgs {
  scheduleId: string;
  memberId: string;
  lesson: ScheduleLessonSummaryDto | null;
  remaining: LessonRemainingResponseDto | null | undefined;
  /** Chosen seat (studio lessons only); null = none / auto-assigned caller picks one first. */
  studioSeatId: string | null;
  notes?: string;
}

/**
 * Decision D2 — `POST /lesson-bookings` body per member.
 *
 * - `paymentType` is always sent (spec: required; backend main still defaults it).
 * - monthly-plan lesson + a contract with remaining count → `monthly_plan` + `optionContractId`.
 * - otherwise `per_use`; `feeCharged` is omitted so the BE snapshots `lessons.fee`, except a
 *   free lesson which sends `feeCharged: 0` (API-113 §7.1 `≥ 0`).
 * - `studioSeatId` only for studio lessons; PT / body care must omit it.
 * - `statusOnCreate: 'reserved'` — manual bookings are never pending.
 * - `notes` (FR-006 備考, API-113 §7.1 max 2,000) only when the operator typed one.
 */
export function buildCreateBookingBody({
  scheduleId,
  memberId,
  lesson,
  remaining,
  studioSeatId,
  notes,
}: BuildCreateBookingBodyArgs): CreateLessonBookingRequestDto {
  const contract =
    lesson?.feeType === 'monthly_plan' ? pickMonthlyPlanContract(remaining) : undefined;
  const isFreeLesson = lesson?.feeType === 'free' || lesson?.fee == null;

  const body: CreateLessonBookingRequestDto = {
    lessonScheduleId: scheduleId,
    memberId,
    statusOnCreate: 'reserved',
    ...(contract
      ? { paymentType: 'monthly_plan', optionContractId: contract.optionContractId }
      : { paymentType: 'per_use', ...(isFreeLesson ? { feeCharged: 0 } : {}) }),
  };

  if (lesson?.lessonType === 'studio' && studioSeatId) {
    body.studioSeatId = studioSeatId;
  }
  const trimmedNotes = notes?.trim();
  if (trimmedNotes) {
    body.notes = trimmedNotes;
  }

  return body;
}
