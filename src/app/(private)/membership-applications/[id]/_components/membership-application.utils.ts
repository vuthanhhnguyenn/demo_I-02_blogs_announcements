import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import type {
  ApplicationCalculatedAmountsDto,
  ApplicationStaffRefDto,
  ApplicationTimelineItemDto,
  EnrollmentApplicationDetailDto,
} from '@/lib/api-real/types.gen';

import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '../../_constants/constants';
import {
  type EnrollmentFeeWaiver,
  type ReenrollmentWaiver,
  readEnrollmentFeeWaiver,
  readReenrollmentWaiver,
} from '../../_utils/application-dto.util';
import {
  type ApplicationApiStatus,
  type ApplicationUiStatus,
  isReviewable,
  toUiStatus,
} from '../../_utils/application-status.util';

export type ApplicationDetail = EnrollmentApplicationDetailDto;

export { isReviewable };

export function uiStatusOf(app: ApplicationDetail): ApplicationUiStatus {
  return toUiStatus(app.status, app.approvalMethod);
}

export function getStatusLabel(status: ApplicationUiStatus): string {
  return STATUS_LABELS[status];
}

export function getStatusBadge(status: ApplicationUiStatus): string {
  return STATUS_BADGE_CLASSES[status];
}

export function formatApplicationDate(value: string | undefined | null): string {
  return formatDateYYYYMMDD_HHMM(value ?? undefined, '—');
}

/** 「姓 名」 / 「セイ メイ」 — null parts are skipped; fully empty renders 「—」. */
export function applicantName(app: ApplicationDetail): string {
  return [app.member.lastName, app.member.firstName].filter(Boolean).join(' ') || '—';
}

export function applicantKana(app: ApplicationDetail): string {
  return [app.member.lastNameKana, app.member.firstNameKana].filter(Boolean).join(' ') || '—';
}

export const GENDER_LABELS: Record<ApplicationDetail['member']['gender'], string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
  prefer_not_to_say: '回答しない',
};

/** 申請元 — the API's `applicationSource`. */
export const APPLICATION_SOURCE_LABELS: Record<string, string> = {
  mobile_app: 'アプリ',
  crm_direct: '管理画面',
  proxy: '管理画面（代理申請）',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  sbps_credit: 'クレジットカード（SBPS）',
  jaccs_bank: '口座振替（JACCS）',
};

export function isCardPayment(app: ApplicationDetail): boolean {
  return app.paymentMethod === 'sbps_credit';
}

/**
 * FR-028 — an application filed from the admin screen must carry an agreement timestamp
 * before approval. The API's `proxy` is null exactly when the member applied from the app.
 */
export function isAgreementMissing(app: ApplicationDetail): boolean {
  return app.proxy !== null && !app.proxy.agreedAt;
}

/** A staff reference as a display name: null = a member / system action. */
export function staffLabel(ref: ApplicationStaffRefDto | null | undefined): string {
  if (!ref) return 'システム';
  return ref.displayName ?? 'スタッフ';
}

// ─── Timeline ────────────────────────────────────────────────────────────────

const STATUS_EVENT_TEXT: Record<ApplicationApiStatus, string> = {
  submitted: '申請を受け付けました。',
  under_review: '審査を開始しました。',
  approved: '入会申請を承認しました。',
  rejected: '入会申請を否認しました。',
  cancelled: '申請を取り消しました。',
};

function isApiStatus(value: string | null | undefined): value is ApplicationApiStatus {
  return !!value && value in STATUS_EVENT_TEXT;
}

export interface TimelineRow {
  id: string;
  kind: 'system' | 'memo';
  occurredAt: string;
  operator: string;
  content: string;
  canDelete: boolean;
}

/**
 * Event rows carry a status transition, not text — the copy is built here. A null actor is a
 * member / system event (「システム」); a staff without a directory name reads 「スタッフ」.
 */
/**
 * @param rejectReasonLabel The application's 否認理由 label — timeline events carry no reason
 *   code, so the rejection entry borrows the application-level one (C-BUG-03).
 */
export function toTimelineRows(
  timeline: ApplicationTimelineItemDto[],
  rejectReasonLabel?: string,
): TimelineRow[] {
  return [...timeline]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .map((item, index) => {
      const operator = staffLabel(item.actor);
      if (item.type === 'memo') {
        return {
          id: item.memoId ?? `memo-${index}`,
          kind: 'memo',
          occurredAt: item.occurredAt,
          operator,
          content: item.memo ?? '',
          canDelete: item.canDelete === true,
        };
      }
      const statusText = isApiStatus(item.toStatus)
        ? STATUS_EVENT_TEXT[item.toStatus]
        : 'ステータスを更新しました。';
      const base =
        item.toStatus === 'rejected' && rejectReasonLabel
          ? `${statusText} 否認理由: ${rejectReasonLabel}。`
          : statusText;
      return {
        id: item.historyId ?? `event-${index}`,
        kind: 'system',
        occurredAt: item.occurredAt,
        operator,
        content: item.comment ? `${base} ${item.comment}` : base,
        canDelete: false,
      };
    });
}

/** The newest status event that moved the application into `status`. */
export function findStatusEvent(
  app: ApplicationDetail,
  status: ApplicationApiStatus,
): ApplicationTimelineItemDto | undefined {
  return [...app.timeline]
    .filter((item) => item.type === 'event' && item.toStatus === status)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
}

// ─── Fees (FR-M006) ──────────────────────────────────────────────────────────

export interface FeeRow {
  key: keyof ApplicationCalculatedAmountsDto;
  label: string;
  /** As served (stored snapshot); null = not computed yet, rendered 「—」. */
  amount: number | null;
  isEnrollmentFee: boolean;
  isDiscount: boolean;
}

type AmountKey = {
  [K in keyof ApplicationCalculatedAmountsDto]: ApplicationCalculatedAmountsDto[K] extends
    | number
    | null
    ? K
    : never;
}[keyof ApplicationCalculatedAmountsDto];

/**
 * Display rows over the §4.3 keys, in prototype order. 入会金 / 登録事務手数料 / カード発行料 /
 * 年会費 / 先払い（3ヶ月目以降）/ オプション / キャンペーン割引 appear only when the brand / application has
 * them (non-null, discounts > 0); 初月会費（日割）and 翌月会費 always render, 「—」 when null
 * (older snapshots; 翌月会費 is also null for a one-month prepay). The total is NOT the sum of
 * these rows — render `totalInitial` as served.
 */
export function toFeeRows(amounts: ApplicationCalculatedAmountsDto): FeeRow[] {
  const rows: FeeRow[] = [];
  const add = (
    key: AmountKey,
    label: string,
    opts: { always?: boolean; isEnrollmentFee?: boolean; isDiscount?: boolean } = {},
  ) => {
    const amount = amounts[key];
    if (!opts.always && (amount === null || (opts.isDiscount && amount <= 0))) return;
    rows.push({
      key,
      label,
      amount,
      isEnrollmentFee: !!opts.isEnrollmentFee,
      isDiscount: !!opts.isDiscount,
    });
  };
  add('enrollmentFee', '入会金', { isEnrollmentFee: true });
  add('registrationFee', '登録事務手数料');
  add('cardIssueFee', 'カード発行料');
  add('firstMonthProratedFee', '初月会費（日割）', { always: true });
  add('nextMonthFee', '翌月会費', { always: true });
  // `prepaidTotal` = months 1..N, so it already holds 初月 and 翌月: listing it as a line would
  // count them twice (BUG-B-13). Only months 3..N, which no other line carries, get a row.
  const { prepaidMonths, prepaidTotal } = amounts;
  const laterMonthsRange =
    prepaidMonths === 3
      ? '3ヶ月目'
      : prepaidMonths != null && prepaidMonths > 3
        ? `3〜${prepaidMonths}ヶ月目`
        : '3ヶ月目以降';
  if (prepaidMonths != null && prepaidMonths >= 3 && prepaidTotal != null) {
    const laterMonths =
      prepaidTotal - (amounts.firstMonthProratedFee ?? 0) - (amounts.nextMonthFee ?? 0);
    if (laterMonths > 0) {
      rows.push({
        key: 'prepaidTotal',
        label: `先払い会費（${laterMonthsRange}）`,
        amount: laterMonths,
        isEnrollmentFee: false,
        isDiscount: false,
      });
    }
  }
  if (amounts.optionMonthlyTotal) add('optionMonthlyTotal', 'オプション月額');
  add('campaignDiscountMonth1', 'キャンペーン割引（初月）', { isDiscount: true });
  add('campaignDiscountMonth2', 'キャンペーン割引（翌月）', { isDiscount: true });
  // Months 3..N of a 3+ month prepay — already taken off `totalInitial`, so without this row
  // the lines would not add up to 合計.
  add('campaignDiscountLaterMonths', `キャンペーン割引（${laterMonthsRange}）`, {
    isDiscount: true,
  });
  add('campaignOptionDiscountTotal', 'オプションキャンペーン割引', { isDiscount: true });
  add('maintenanceFee', '年会費（初期費用に含まない）');
  return rows;
}

// ─── Enrolment-fee waiver (FR-025 / FR-026, D9) ──────────────────────────────

export interface WaiverState {
  waiver: EnrollmentFeeWaiver | null;
  rule: ReenrollmentWaiver | null;
  /** 入会金 list price, as served. */
  enrollmentFee: number;
  /** Discount on 入会金, as served (capped at the list price). */
  discount: number;
  /** A staff waiver can still be added (reviewable, no waiver yet, 入会金 > 0). */
  staffWaiverAvailable: boolean;
}

/**
 * The server decides which waiver applies (`enrollmentFeeWaiver`) — the client no longer
 * resolves a precedence. A reviewer-entered staff reason previews a full waiver locally until
 * the approve call persists it.
 */
export function waiverStateOf(
  app: ApplicationDetail,
  localStaffReason: string,
): WaiverState | null {
  const { enrollmentFee, enrollmentFeeDiscount } = app.calculatedAmounts;
  if (enrollmentFee === null || enrollmentFee <= 0) return null;

  const waiver = readEnrollmentFeeWaiver(app.enrollmentFeeWaiver);
  const rule = readReenrollmentWaiver(app.reenrollmentWaiver);
  const reviewable = isReviewable(uiStatusOf(app));
  const staffWaiverAvailable = reviewable && waiver === null;

  const localStaff = staffWaiverAvailable && localStaffReason.trim().length > 0;
  const discount = localStaff ? enrollmentFee : Math.min(enrollmentFeeDiscount, enrollmentFee);

  return {
    waiver: localStaff
      ? { type: 'staff', reason: localStaffReason.trim(), appliedAt: null, appliedBy: null }
      : waiver,
    rule,
    enrollmentFee,
    discount,
    staffWaiverAvailable,
  };
}

export const WAIVER_TYPE_LABELS: Record<EnrollmentFeeWaiver['type'], string> = {
  campaign: 'キャンペーン',
  reenrollment: '再入会者免除',
  staff: 'スタッフ個別免除',
};

/** 「割引」 for a partial reduction, 「免除」 when 入会金 drops to ¥0 (prototype 9/17). */
export function waiverWord(state: WaiverState): '免除' | '割引' {
  return state.discount >= state.enrollmentFee ? '免除' : '割引';
}

export function waiverLabel(state: WaiverState, campaignName: string | null): string {
  const type = state.waiver?.type;
  const detail =
    type === 'campaign'
      ? `キャンペーン・${campaignName ?? '—'}`
      : type
        ? WAIVER_TYPE_LABELS[type]
        : 'キャンペーン';
  return `入会金${waiverWord(state)}（${detail}）`;
}
