import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Check, Clock, FileText, type LucideIcon } from 'lucide-react';

import type { StatusTone } from '@/components/common/status-card';

import type {
  AdminTransferControllerListData,
  TransferBulkApproveResultDto,
  TransferDetailDto,
  TransferListItemDto,
} from '@/lib/api-real/types.gen';

type AdminTransferListQuery = NonNullable<AdminTransferControllerListData['query']>;

// ─── Real API (API-091) presentation ──────────────────────────────────────────
// The list and the detail both run on `/admin/transfer-applications`.

export type TransferApplicationStatus = TransferListItemDto['status'];

export const TRANSFER_APPLICATION_STATUS = {
  SUBMITTED: 'submitted',
  PENDING_SOURCE_APPROVAL: 'pending_source_approval',
  PENDING_DESTINATION_APPROVAL: 'pending_destination_approval',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const satisfies Record<string, TransferApplicationStatus>;

export const TRANSFER_APPLICATION_STATUS_LABELS: Record<TransferApplicationStatus, string> = {
  submitted: '申請中',
  pending_source_approval: '移籍元承認待ち',
  pending_destination_approval: '移籍先承認待ち',
  completed: '完了',
  rejected: '否認',
};

export const TRANSFER_APPLICATION_STATUS_CLASSES: Record<TransferApplicationStatus, string> = {
  submitted: 'bg-info/15 text-info border-info/20',
  pending_source_approval: 'bg-warning/15 text-warning border-warning/20',
  pending_destination_approval: 'bg-warning/15 text-warning border-warning/20',
  completed: '',
  rejected: 'bg-destructive/15 text-destructive border-destructive/20',
};

export const TRANSFER_APPLICATION_STATUS_DOT_CLASSES: Record<TransferApplicationStatus, string> = {
  submitted: 'bg-info',
  pending_source_approval: 'bg-warning',
  pending_destination_approval: 'bg-warning',
  completed: '',
  rejected: 'bg-destructive',
};

/**
 * The statuses an operator can still approve or reject — exactly the `expectedStatus` lock values.
 * 申請中 (`submitted`) is shown but not actionable: the approve/reject lock enum does not accept it.
 */
export type PendingTransferApplicationStatus = Extract<
  TransferApplicationStatus,
  'pending_source_approval' | 'pending_destination_approval'
>;

export function isTransferApplicationPending(
  status: TransferApplicationStatus,
): status is PendingTransferApplicationStatus {
  return (
    status === TRANSFER_APPLICATION_STATUS.PENDING_SOURCE_APPROVAL ||
    status === TRANSFER_APPLICATION_STATUS.PENDING_DESTINATION_APPROVAL
  );
}

export type TransferBrandGroup = 'JOYFIT' | 'FIT365';

/**
 * Transfers are intra-brand, and the API carries the brand only as the source store's
 * `brandEnum`. Every JOYFIT-family brand shares the JOYFIT approval model (A-02 FR-003).
 */
export function toTransferBrandGroup(
  brandEnum: TransferListItemDto['fromStore']['brandEnum'],
): TransferBrandGroup | null {
  if (!brandEnum) return null;
  return brandEnum === 'Fit365' ? 'FIT365' : 'JOYFIT';
}

export const TRANSFER_BRAND_GROUP_CLASSES: Record<TransferBrandGroup, string> = {
  JOYFIT: 'bg-primary/15 text-primary border-primary/20',
  FIT365: 'bg-destructive/15 text-destructive border-destructive/20',
};

export type TransferExclusionReason = NonNullable<
  TransferListItemDto['autoTransfer']
>['exclusionReasons'][number];

export const TRANSFER_EXCLUSION_LABELS: Record<TransferExclusionReason, string> = {
  arrears: '除外: 未納あり',
  cancellation_fee_period: '除外: 縛り期間中',
};

/** Why an excluded JOYFIT row cannot be approved from the list (prototype wording). */
export const TRANSFER_EXCLUSION_BLOCK_REASONS: Record<TransferExclusionReason, string> = {
  arrears: '未納金があるため承認できません。未納解消後に再申請してください',
  cancellation_fee_period:
    'キャンペーン縛り期間中のため承認できません。移籍詳細から管理者権限で手動解除してください',
};

/**
 * The same block on the detail screen, where the manual release sits right above the button — so
 * the 縛り期間 wording points at it instead of sending the operator to the detail screen.
 */
export const TRANSFER_DETAIL_EXCLUSION_BLOCK_REASONS: Record<TransferExclusionReason, string> = {
  arrears: TRANSFER_EXCLUSION_BLOCK_REASONS.arrears,
  cancellation_fee_period:
    'キャンペーン縛り期間中のため承認できません。管理者権限で手動解除すると承認できます',
};

export function getTransferExclusionBlockReason(
  autoTransfer: TransferListItemDto['autoTransfer'],
  blockReasons: Record<TransferExclusionReason, string> = TRANSFER_EXCLUSION_BLOCK_REASONS,
): string | null {
  if (autoTransfer?.eligibility !== 'excluded') return null;
  // 未納 is reported first: it cannot be lifted manually, unlike the 縛り期間 exclusion.
  const reasons = autoTransfer.exclusionReasons;
  if (reasons.includes('arrears')) return blockReasons.arrears;
  if (reasons.includes('cancellation_fee_period')) return blockReasons.cancellation_fee_period;
  return null;
}

/**
 * Max applications per bulk-approve request (`transferApplicationIds`, 1–50). The spec defines no
 * UI limit yet, so 50 is provisional: adjust here once the spec is confirmed.
 */
export const TRANSFER_BULK_APPROVE_MAX = 50;

export const TRANSFER_BULK_APPROVE_LIMIT_REASON = `一括承認は最大${TRANSFER_BULK_APPROVE_MAX}件までです`;

/** `comment` limit of approve / reject / bulk-approve (`TransferActionRequestDto`). */
export const TRANSFER_COMMENT_MAX_LENGTH = 500;

/**
 * Comment / reason textareas in the decision dialogs. The shared Textarea sizes itself to its
 * content (`field-sizing-content`), which makes an unbroken string widen the whole dialog and push
 * its buttons off-screen — so the width is pinned and long tokens wrap inside the box.
 */
export const TRANSFER_COMMENT_TEXTAREA_CLASS =
  'field-sizing-fixed max-h-32 resize-none overflow-y-auto text-sm wrap-anywhere';

// ─── Bulk approval (QA #161) ─────────────────────────────────────────────────

/** Why one id of a bulk approval was not approved — per-item codes of `results[].errorCode`. */
export const TRANSFER_BULK_APPROVE_ERROR_LABELS: Record<
  NonNullable<TransferBulkApproveResultDto['errorCode']>,
  string
> = {
  'E-TRF-001': '申請が見つかりません',
  'E-TRF-002': '承認権限がありません',
  'E-TRF-003': '承認対象の店舗が担当外です',
  'E-TRF-004': '承認待ちではありません',
  'E-SYS-001': '移籍を実行できませんでした',
};

// en-CA formats a date as YYYY-MM-DD; pinning the zone gives the JST calendar day.
const JST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' });

/**
 * Days left of the 縛り期間 (cancellation-fee period) as of `today`; `null` when the API has no end
 * date. `cancellationFeeUntil` is exclusive (the first day outside the period), so the count is a
 * plain `until − today (JST)` with no +1, and "today" is taken on the JST calendar whatever the
 * viewer's timezone.
 */
export function getCancellationFeeRemainingDays(
  cancellationFeeUntil: string | null | undefined,
  today: Date,
): number | null {
  if (!cancellationFeeUntil) return null;
  const todayJst = JST_DATE_FORMATTER.format(today);
  return Math.max(0, differenceInCalendarDays(parseISO(cancellationFeeUntil), parseISO(todayJst)));
}

// ─── Filter options (V0 order) ────────────────────────────────────────────────

export const ALL_OPTION_VALUE = 'all';

export const TRANSFER_STATUS_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: '全ステータス' },
  ...(Object.keys(TRANSFER_APPLICATION_STATUS_LABELS) as TransferApplicationStatus[]).map(
    (status) => ({ value: status, label: TRANSFER_APPLICATION_STATUS_LABELS[status] }),
  ),
];

/** URL values of the ブランド filter (kept from the mock era so bookmarks keep working). */
export type TransferBrandFilter = 'joyfit' | 'fit365';

export const TRANSFER_BRAND_LABELS: Record<TransferBrandFilter, string> = {
  joyfit: 'JOYFIT',
  fit365: 'FIT365',
};

/** The ブランド filter is a brand group (JOYFIT = Joyfit / Joyfit24 / JoyfitYoga / JoyfitPlus). */
export const TRANSFER_BRAND_FILTER_TO_API: Record<
  TransferBrandFilter,
  NonNullable<AdminTransferListQuery['brandGroup']>
> = {
  joyfit: 'JOYFIT',
  fit365: 'FIT365',
};

export const TRANSFER_BRAND_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: '全ブランド' },
  { value: 'joyfit', label: 'JOYFIT' },
  { value: 'fit365', label: 'FIT365' },
];

export const TRANSFER_APPLIED_PERIOD_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: '全期間' },
  { value: 'this_month', label: '今月' },
  { value: 'last_month', label: '先月' },
  { value: 'this_year', label: '今年' },
];

export const TRANSFER_AUTO_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: '自動移籍: すべて' },
  { value: 'eligible', label: '自動可のみ' },
  { value: 'excluded', label: '除外あり' },
];

// ─── Detail: status card ──────────────────────────────────────────────────────

export const TRANSFER_APPLICATION_STATUS_TONES: Record<TransferApplicationStatus, StatusTone> = {
  submitted: 'info',
  pending_source_approval: 'warning',
  pending_destination_approval: 'warning',
  completed: 'muted',
  rejected: 'destructive',
};

export const TRANSFER_APPLICATION_STATUS_ICONS: Record<TransferApplicationStatus, LucideIcon> = {
  submitted: Clock,
  pending_source_approval: Clock,
  pending_destination_approval: Clock,
  completed: Check,
  rejected: FileText,
};

// ─── Detail: approval-flow presentation ───────────────────────────────────────

export const TRANSFER_FLOW_BADGE_LABELS: Record<TransferBrandGroup, string> = {
  JOYFIT: '自動移籍',
  FIT365: '手動移籍（2段階承認）',
};

export const TRANSFER_FLOW_NOTES: Record<TransferBrandGroup, string> = {
  JOYFIT: 'JOYFITの移籍は移籍元店舗の確認・承認後、システムが自動で移籍を実行します。',
  FIT365: 'FIT365の移籍は移籍元・移籍先の両店舗の承認が必要です。',
};

export const APPROVAL_STEP_STORE_TYPE_LABELS: Record<'from' | 'to', string> = {
  from: '移籍元',
  to: '移籍先',
};

export type TransferTimelineStepKey = TransferDetailDto['timeline']['steps'][number]['step'];

/** The API returns the step key only; the wording (and the execution step's per-brand name) is ours. */
export function getTransferStepLabel(
  step: TransferTimelineStepKey,
  brandGroup: TransferBrandGroup,
): string {
  switch (step) {
    case 'applied':
      return '申請';
    case 'source_approval':
      return '移籍元承認';
    case 'destination_approval':
      return '移籍先承認';
    case 'execution':
      return brandGroup === 'JOYFIT' ? 'システム自動移籍実行' : '移籍実行';
  }
}

export const TRANSFER_STEP_STORE_TYPES: Partial<Record<TransferTimelineStepKey, 'from' | 'to'>> = {
  source_approval: 'from',
  destination_approval: 'to',
};

// ─── Detail: info card ────────────────────────────────────────────────────────

const TRANSFER_REASON_LABELS: Record<NonNullable<TransferDetailDto['reasonCode']>, string> = {
  relocation: '引っ越し',
  schedule_change: '生活時間帯の変更',
  facility_upgrade: '設備の充実した店舗への移籍',
  crowding_avoidance: '混雑の回避',
  trainer_preference: 'トレーナー希望',
  other: 'その他',
};

export function getTransferReasonLabel(reasonCode: TransferDetailDto['reasonCode']): string | null {
  return reasonCode ? TRANSFER_REASON_LABELS[reasonCode] : null;
}
