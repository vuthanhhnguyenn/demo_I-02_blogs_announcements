import { CheckCircle, Clock, LucideIcon, PauseCircle, Undo2, XCircle } from 'lucide-react';

import { StatusTone } from '@/components/common/status-card';

import type { SuspWdrDetailDto, SuspWdrListItemDto } from '@/lib/api-real/types.gen';

import type { BrandGroupFilter } from '../../_constants/constants';

export const LeaveType = {
  SUSPENSION: 'suspension',
  WITHDRAWAL: 'withdrawal',
} as const satisfies Record<string, SuspWdrListItemDto['applicationType']>;
export type LeaveType = SuspWdrListItemDto['applicationType'];

/**
 * The four in-progress states travel as the real `displayStatus` (API-092 §3.4); the two
 * closed states are the application `status`, which takes over once `displayStatus` is null.
 */
export const LeaveStatus = {
  SUSPENSION_SCHEDULED: 'pending_suspended',
  SUSPENDED: 'suspended',
  WITHDRAWAL_SCHEDULED: 'pending_withdrawal',
  WITHDRAWAL_PENDING: 'withdrawal_pending_processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];
export type LeaveListStatus = Exclude<
  LeaveStatus,
  typeof LeaveStatus.COMPLETED | typeof LeaveStatus.CANCELLED
>;

export const CancellationBlockedReason = {
  NOT_CANCELLABLE_STATUS: 'not_cancellable_status',
  BATCH_PROCESSING_STARTED: 'batch_processing_started',
  USAGE_STARTED: 'usage_started',
} as const satisfies Record<string, NonNullable<SuspWdrDetailDto['cancellationBlockedReason']>>;

export type ProxyAgreementMethod = NonNullable<SuspWdrDetailDto['proxyAgreementMethod']>;

/**
 * The four states the A-03 list can show. `completed` (処理完了) is deliberately absent:
 * a completed application leaves the list entirely and survives only on the detail
 * screen (spec Q-10 / FR-010, FR-022).
 */
export const LIST_LEAVE_STATUSES: readonly LeaveListStatus[] = [
  LeaveStatus.SUSPENSION_SCHEDULED,
  LeaveStatus.SUSPENDED,
  LeaveStatus.WITHDRAWAL_SCHEDULED,
  LeaveStatus.WITHDRAWAL_PENDING,
] as const;

/** `displayStatus` is typed as a plain string; anything outside the four states is unknown. */
export function toListStatus(displayStatus: string | null): LeaveListStatus | null {
  return LIST_LEAVE_STATUSES.find((s) => s === displayStatus) ?? null;
}

/** The detail keeps a closed application readable: its closure lives in `status`. */
export function toDetailStatus(
  detail: Pick<SuspWdrDetailDto, 'displayStatus' | 'status'>,
): LeaveStatus | null {
  if (detail.status === LeaveStatus.COMPLETED) return LeaveStatus.COMPLETED;
  if (detail.status === LeaveStatus.CANCELLED) return LeaveStatus.CANCELLED;
  return toListStatus(detail.displayStatus);
}

/** 会員名 — the applicant block carries the two name parts separately, either may be null. */
export function memberDisplayName(
  member: Pick<SuspWdrListItemDto['member'], 'lastName' | 'firstName'>,
) {
  return [member.lastName, member.firstName].filter(Boolean).join(' ') || '—';
}

/**
 * 申請者 — derived from how the application was filed: the member on a 本人 filing, the
 * operator (proxy staff, else creator) on a CRM filing, the batch on a system one.
 */
export function applicantLabel(
  detail: Pick<SuspWdrDetailDto, 'applicationSource' | 'member' | 'proxyStaff' | 'createdBy'>,
): string {
  if (detail.applicationSource === 'mobile_app')
    return `${memberDisplayName(detail.member)}（本人）`;
  if (detail.applicationSource === 'system') return 'システム';
  const staff = detail.proxyStaff?.displayName ?? detail.createdBy?.displayName;
  return staff ? `${staff}（スタッフ）` : '—';
}

/** 最終更新 — the latest status change; an application never changed reads its filing time. */
export function lastUpdatedAt(detail: Pick<SuspWdrDetailDto, 'statusHistories' | 'appliedAt'>) {
  return detail.statusHistories.reduce<string>(
    (latest, h) => (h.changedAt > latest ? h.changedAt : latest),
    detail.appliedAt,
  );
}

/** Pill colours keyed by the store's brand group, which the API returns as-is (qa-155 ④). */
export const LEAVE_BRAND_GROUP_CLASSES: Record<BrandGroupFilter, string> = {
  JOYFIT: 'bg-primary/15 text-primary border-primary/20',
  FIT365: 'bg-destructive/15 text-destructive border-destructive/20',
};

/**
 * FR-031 — 200 is not offered: both the mock request schema and the real endpoint
 * cap `limit` at 100, so a 200-row request is rejected outright (research.md §1).
 */
export const LEAVE_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** A-03 FR-001 (v3) — the list can be read per application (一覧) or per member and month (月別ビュー). */
export const LEAVE_VIEW_MODES = ['list', 'monthly'] as const;
export type LeaveViewMode = (typeof LEAVE_VIEW_MODES)[number];

/** 月別ビュー's own 表示 filter. */
export const MONTHLY_SCOPES = ['all', 'suspension_only'] as const;
export type MonthlyScope = (typeof MONTHLY_SCOPES)[number];

export const MONTHLY_SCOPE_OPTIONS: { value: MonthlyScope; label: string }[] = [
  { value: 'all', label: '表示: 全て（休会・退会）' },
  { value: 'suspension_only', label: '表示: 休会のみ' },
];

/** 月別ビュー columns — the current month and three months either side. */
export const MONTHLY_VIEW_MONTH_RANGE = 3;

/** 月別ビュー fetches the whole filtered set in pages of the endpoint's maximum size. */
export const MONTHLY_VIEW_FETCH_LIMIT = 100;

/** A-03 FR-002 (v3) — the cancellation reason is mandatory and capped at 500 characters. */
export const LEAVE_CANCEL_REASON_MAX_LENGTH = 500;

// ─── Label Maps ──────────────────────────────────────────────────────────────

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  [LeaveType.SUSPENSION]: '休会',
  [LeaveType.WITHDRAWAL]: '退会',
};

/**
 * 承認フロー step labels. `approval` is resolved per type by the caller (休会承認 / 退会承認);
 * 休会開始 / 休会終了 are FE wording until qa-156 ④ settles them.
 */
export const TIMELINE_STEP_LABELS: Record<
  SuspWdrDetailDto['timeline']['steps'][number]['step'],
  string
> = {
  applied: '申請',
  approval: '承認',
  recess_start: '休会開始',
  recess_end: '休会終了',
  execution: '退会処理実行',
};

/** FR-065 — the agreement method is stored as an enum and shown in Japanese. */
export const PROXY_AGREEMENT_METHOD_LABELS: Record<ProxyAgreementMethod, string> = {
  in_person: '来店',
  phone: '電話',
  email: 'メール',
  line: 'LINE',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  [LeaveStatus.SUSPENSION_SCHEDULED]: '休会予定',
  [LeaveStatus.SUSPENDED]: '休会中',
  [LeaveStatus.WITHDRAWAL_SCHEDULED]: '退会予定',
  [LeaveStatus.WITHDRAWAL_PENDING]: '退会処理待ち',
  [LeaveStatus.COMPLETED]: '処理完了',
  [LeaveStatus.CANCELLED]: '取り消し済み',
};

export const LEAVE_TYPE_CLASSES: Record<LeaveType, string> = {
  [LeaveType.SUSPENSION]: 'bg-info/15 text-info border-info/20',
  [LeaveType.WITHDRAWAL]: 'bg-destructive/15 text-destructive border-destructive/20',
};

export const LEAVE_STATUS_CLASSES: Record<LeaveStatus, { badge: string; dot: string }> = {
  [LeaveStatus.SUSPENSION_SCHEDULED]: {
    badge: 'bg-warning/15 text-warning border-warning/20',
    dot: 'bg-warning',
  },
  [LeaveStatus.SUSPENDED]: {
    badge: 'bg-info/15 text-info border-info/20',
    dot: 'bg-info',
  },
  [LeaveStatus.WITHDRAWAL_SCHEDULED]: {
    badge: 'bg-destructive/15 text-destructive border-destructive/20',
    dot: 'bg-destructive',
  },
  [LeaveStatus.WITHDRAWAL_PENDING]: {
    badge: 'bg-warning/15 text-warning border-warning/20',
    dot: 'bg-warning',
  },
  [LeaveStatus.COMPLETED]: {
    badge: '',
    dot: '',
  },
  [LeaveStatus.CANCELLED]: {
    badge: '',
    dot: '',
  },
};

export const STATUS_ICON_CONFIG: Record<
  LeaveStatus,
  {
    icon: LucideIcon;
    tone: StatusTone;
    label: string;
  }
> = {
  [LeaveStatus.SUSPENSION_SCHEDULED]: {
    icon: Clock,
    tone: 'warning',
    label: LEAVE_STATUS_LABELS[LeaveStatus.SUSPENSION_SCHEDULED],
  },
  [LeaveStatus.SUSPENDED]: {
    icon: PauseCircle,
    tone: 'info',
    label: LEAVE_STATUS_LABELS[LeaveStatus.SUSPENDED],
  },
  [LeaveStatus.WITHDRAWAL_SCHEDULED]: {
    icon: Clock,
    tone: 'destructive',
    label: LEAVE_STATUS_LABELS[LeaveStatus.WITHDRAWAL_SCHEDULED],
  },
  [LeaveStatus.WITHDRAWAL_PENDING]: {
    icon: XCircle,
    tone: 'warning',
    label: LEAVE_STATUS_LABELS[LeaveStatus.WITHDRAWAL_PENDING],
  },
  [LeaveStatus.COMPLETED]: {
    icon: CheckCircle,
    tone: 'muted',
    label: LEAVE_STATUS_LABELS[LeaveStatus.COMPLETED],
  },
  [LeaveStatus.CANCELLED]: {
    icon: Undo2,
    tone: 'muted',
    label: LEAVE_STATUS_LABELS[LeaveStatus.CANCELLED],
  },
};

// ─── Filter Option Lists ──────────────────────────────────────────────────────

export const LEAVE_TYPE_OPTIONS = [
  { value: 'all', label: '全種別' },
  ...Object.values(LeaveType).map((value) => ({
    value,
    label: LEAVE_TYPE_LABELS[value],
  })),
];

/** Built from the list-facing subset, so 処理完了 can never leak into the filter (Q-10). */
export const LEAVE_STATUS_OPTIONS = [
  { value: 'all', label: '全ステータス' },
  ...LIST_LEAVE_STATUSES.map((value) => ({
    value,
    label: LEAVE_STATUS_LABELS[value],
  })),
];

export const SCHEDULED_PERIOD_OPTIONS = [
  { value: 'all', label: '全期間' },
  { value: 'current_month', label: '今月' },
  { value: 'next_month', label: '来月' },
  { value: 'current_year', label: '今年' },
] as const;
