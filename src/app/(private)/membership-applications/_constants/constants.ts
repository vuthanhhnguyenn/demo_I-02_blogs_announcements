import type { ApplicationBlacklistDto, RejectApplicationDto } from '@/lib/api-real/types.gen';

import type { ApplicationUiStatus } from '../_utils/application-status.util';
import type { EnrollmentRoute } from '../_utils/enrollment-route.util';

type MembershipApplicationStatus = ApplicationUiStatus;
type BlacklistCheckState = ApplicationBlacklistDto['matchResult'];
type RejectionReason = RejectApplicationDto['rejectReasonCode'];

// ─── Status (C-01 260624_v5 — six values incl. 自動承認済) ────────────────────

export const STATUS_LABELS: Record<MembershipApplicationStatus, string> = {
  pending: '未審査',
  review: '審査中',
  approved: '承認済',
  auto_approved: '自動承認済',
  rejected: '否認',
  cancelled: '取り消し済',
};

export const STATUS_BADGE_CLASSES: Record<MembershipApplicationStatus, string> = {
  pending: 'bg-warning/15 text-warning border-warning/20',
  review: 'bg-info/15 text-info border-info/20',
  approved: 'bg-success/15 text-success border-success/20',
  auto_approved: 'bg-success/15 text-success border-success/20',
  rejected: 'bg-destructive/15 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

/**
 * Review-flow rank (FR-010, research R5) — 未審査 0 → 取り消し済 5.
 * Sorting on the stored enum string would order alphabetically and put decided
 * applications above the queue, which is the opposite of what a reviewer needs.
 */
export const STATUS_SORT_RANK: Record<MembershipApplicationStatus, number> = {
  pending: 0,
  review: 1,
  approved: 2,
  auto_approved: 3,
  rejected: 4,
  cancelled: 5,
};

export const STATUS_OPTIONS: { label: string; value: MembershipApplicationStatus | 'all' }[] = [
  { label: '全ステータス', value: 'all' },
  { label: '未審査', value: 'pending' },
  { label: '審査中', value: 'review' },
  { label: '承認済', value: 'approved' },
  { label: '自動承認済', value: 'auto_approved' },
  { label: '否認', value: 'rejected' },
  { label: '取り消し済', value: 'cancelled' },
];

/** The two statuses that make up the review queue — the BL要注意 KPI spans both. */
export const IN_QUEUE_STATUSES: MembershipApplicationStatus[] = ['pending', 'review'];

// ─── Enrollment route (入会経路 — replaces 申請種別 in v5) ────────────────────

export const ENROLLMENT_ROUTE_LABELS: Record<EnrollmentRoute, string> = {
  mobile: 'モバイル',
  manual: '手動',
  referral: '紹介経由',
};

export const ENROLLMENT_ROUTE_BADGE_CLASSES: Record<EnrollmentRoute, string> = {
  manual: 'bg-warning/15 text-warning border-warning/20',
  referral: 'bg-info/15 text-info border-info/20',
  mobile: 'bg-muted text-muted-foreground border-border',
};

export const ENROLLMENT_ROUTE_OPTIONS: {
  label: string;
  value: EnrollmentRoute | 'all';
  disabled?: boolean;
}[] = [
  { label: '全経路', value: 'all' },
  { label: 'モバイル', value: 'mobile' },
  { label: '手動', value: 'manual' },
  { label: '紹介経由', value: 'referral' },
];

// ─── Blacklist ────────────────────────────────────────────────────────────────

export const BLACKLIST_STATE_LABELS: Record<BlacklistCheckState, string> = {
  unchecked: '未照合',
  none: '該当なし',
  name_dob: '一致あり',
  email: '一致あり',
  phone: '一致あり',
  address: '一致あり',
  multiple: '一致あり',
};

/** `matchedRecords[].matchedConditions` → the 一致条件 line (C-01 FR-M003 L252). */
export const BLACKLIST_CONDITION_LABELS: Record<string, string> = {
  name_dob: '氏名＆生年月日一致',
  email: 'メールアドレス一致',
  phone: '電話番号一致',
  address: '住所一致',
};

export const BLACKLIST_OPTIONS = [
  { label: '全申請', value: 'all' as const },
  { label: '一致のみ', value: 'match' as const },
  { label: '一致なし', value: 'no_match' as const },
];

// ─── Rejection reasons (FR-031 — a closed set of exactly four) ────────────────

/** Keyed by the API's `rejectReasonCode`, so a BE enum change fails `tsc` here (D13). */
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  identity_verification_failure: '本人確認不備',
  age_restriction: '年齢制限',
  blacklist_match: 'BL該当',
  other: 'その他',
};

export const REJECTION_REASON_OPTIONS: { label: string; value: RejectionReason }[] = [
  { label: '本人確認不備', value: 'identity_verification_failure' },
  { label: '年齢制限', value: 'age_restriction' },
  { label: 'BL該当', value: 'blacklist_match' },
  { label: 'その他', value: 'other' },
];

// ─── Brand filter ─────────────────────────────────────────────────────────────

export const BRAND_OPTIONS = [
  { label: '全ブランド', value: 'all' },
  { label: 'FIT365', value: 'FIT365' },
  { label: 'JOYFIT', value: 'JOYFIT' },
];

// ─── Operational thresholds ───────────────────────────────────────────────────

/**
 * 対応超過 tooltip (FR-011). The API decides `isReviewOverdue` and serves each row's own
 * brand threshold in `reviewOverdueHours` — never hard-code it (integration-plan.md D6).
 */
export function overdueTooltip(hours: number): string {
  return `未審査のまま${hours}時間（運用設定値）を超過しています`;
}

/** Page sizes offered by the 表示件数 selector (FR-014) — 200 dropped in prototype 9/8. */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

/** Default 申請日レンジ span — the most recent 7 days (FR-007). */
export const DEFAULT_DATE_RANGE_DAYS = 7;

/** Minimum enrolment age per brand (FR-046). The same map gates form and route. */
export const BRAND_MIN_AGE: Record<string, number> = {
  JOYFIT: 15,
  FIT365: 16,
};

export const DEFAULT_BRAND_MIN_AGE = 16;

/** 利用開始日 warning threshold — a warning on the checklist, never a block (FR-027). */
export const USAGE_START_WARNING_MONTHS = 2;

// ─── Refund guidance (FR-035) ─────────────────────────────────────────────────

export const REFUND_GUIDANCE_CREDIT_CARD = 'カード決済の取消処理を実行します（90日以内）。';

export const REFUND_GUIDANCE_BANK_TRANSFER =
  '口座振替の返金は手動対応となります（CASHPOSTまたは振込）。';

/**
 * Same-day cancellation limit (FR-034) — fallback only; the detail API serves
 * `sameDayCancelLimit`, which wins whenever it is present.
 */
export const SAME_DAY_CANCEL_LIMIT = 2;

// ─── Long-text layout ─────────────────────────────────────────────────────────

/**
 * Dialog content that stays inside the viewport and never widens past its own width: a
 * 1,000-char reason scrolls inside the dialog, an unbroken token wraps (C-BUG-01 / C-BUG-04).
 */
export const BOUNDED_DIALOG_CLASS =
  'max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto';

/** Auto-growing textarea capped in height; unbroken input wraps instead of widening it. */
export const BOUNDED_TEXTAREA_CLASS = 'max-h-60 overflow-y-auto wrap-anywhere';
