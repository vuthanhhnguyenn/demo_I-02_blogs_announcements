import type { QueryClient } from '@tanstack/react-query';

import {
  adminRefundControllerDetailQueryKey,
  adminRefundControllerListQueryKey,
  adminRefundControllerRefundabilityQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminRefundControllerApproveData,
  AdminRefundControllerListData,
  AdminRefundControllerMarkExecutedData,
  RefundApplicationListItemDto,
  RefundabilityResultDto,
} from '@/lib/api-real/types.gen';

import { UserRole } from '@/types/permission.type';

import { invalidateMemberSalesReads } from '../../_utils/sales-query.util';

/**
 * Refund queue (API-118) — the hand-written seam between the `/sales/refunds` screen and the real
 * API: filter / sort vocabulary, approver resolution, error codes, request bodies and cache
 * invalidation. Display labels shared with 015 live in `sales/_constants/sales-labels.constant.ts`.
 */

export type RefundListQuery = NonNullable<AdminRefundControllerListData['query']>;
export type ApplicantRole = RefundApplicationListItemDto['appliedRole'];
export type ApproverLevel = RefundApplicationListItemDto['approverLevel'];
export type RefundSortKey = NonNullable<RefundListQuery['sort']>;
export type ExecutionMethod = NonNullable<
  NonNullable<AdminRefundControllerApproveData['body']>['executionMethod']
>;
export type MarkExecutedBody = AdminRefundControllerMarkExecutedData['body'];

/** API-118 §5: `limit` is 1–100 */
export const REFUND_PAGE_SIZE_OPTIONS = [20, 50, 100];
export const REFUND_DEFAULT_PAGE_SIZE = 50;

/** The table's sortable column ids: API-118 §5 sort keys minus `approvedAt` (no 承認日 column, FR-004-a) */
export const REFUND_SORT_KEYS = [
  'appliedAt',
  'totalRefundAmount',
  'status',
] as const satisfies readonly RefundSortKey[];

/** q: 会員名 / 申請事由 partial match, max 100 chars (API-118 §5) */
export const REFUND_SEARCH_MAX_LENGTH = 100;

export const APPLICANT_ROLE_FILTER_LABELS: Record<ApplicantRole, string> = {
  staff: 'スタッフ',
  manager: 'マネージャー',
  headquarter: '本部',
};

/** Badge copy — the same words as the 申請者ロール filter (016D-02; the prototype's "HQ" read as English) */
export const APPLICANT_ROLE_BADGE_LABELS: Record<ApplicantRole, string> =
  APPLICANT_ROLE_FILTER_LABELS;

/** BR-REF-001 (API-118 §13.1): the resolved approver level, as shown in explanations */
export const APPROVER_LEVEL_LABELS: Record<ApproverLevel, string> = {
  manager: 'Manager',
  headquarter: '本部（Headquarter）',
  system: 'System管理者',
};

/** D11: the JACCS 2-choice (`alertVariant = jaccs_manual_or_cashpost`) */
export const EXECUTION_METHOD_LABELS: Record<ExecutionMethod, string> = {
  jaccs_manual: '手動返金',
  cashpost: 'CASHPOST',
};

export const EXECUTION_METHODS = Object.keys(EXECUTION_METHOD_LABELS) as ExecutionMethod[];

export function isExecutionMethod(value: unknown): value is ExecutionMethod {
  return typeof value === 'string' && (EXECUTION_METHODS as string[]).includes(value);
}

export function needsExecutionMethod(alertVariant: string | null | undefined): boolean {
  return alertVariant === 'jaccs_manual_or_cashpost';
}

/** API-118 §8: rejectionReason 1–500 */
export const REJECTION_REASON_MAX_LENGTH = 500;
/** API-118 §12.2 */
export const EXTERNAL_REFERENCE_ID_MAX_LENGTH = 64;
export const EXECUTOR_MEMO_MAX_LENGTH = 500;
export const FAILURE_REASON_MAX_LENGTH = 200;

// --- approver resolution (D13) ---

/**
 * BR-REF-001: the chain is strictly one level up — only `JWT.role === approverLevel` may approve
 * or reject, and never the applicant themself (E-REF-004). The detail's `editableActions` is the
 * authoritative answer; the list derives it from the row because the list DTO carries no
 * per-caller actions. The server re-checks either way (E-REF-003 / E-REF-004).
 */
export function canDecideRefund(
  item: Pick<RefundApplicationListItemDto, 'approverLevel' | 'appliedBy' | 'displayStatus'>,
  user: { role: UserRole; id: string } | null | undefined,
): boolean {
  if (!user || item.displayStatus !== 'pending_approval') return false;
  if (item.appliedBy === user.id) return false;
  return (item.approverLevel as string) === (user.role as string);
}

// --- refundability (D10) ---

/** API-118 §11: `null` when every line is refundable */
export function getBlockReason(
  refundability: RefundabilityResultDto | null | undefined,
): RefundabilityResultDto['blockReason'] | null {
  return refundability?.blockReason ?? null;
}

// --- error codes (D15) ---

export const REFUND_ERROR_CODE = {
  /** 409 — already finalized (someone else decided first) */
  finalized: 'E-REF-002',
  /** 403 — outside the approver's store scope / not eligible */
  notEligible: 'E-REF-003',
  /** 403 — self-approval */
  selfApproval: 'E-REF-004',
  /** 409 — refund window expired */
  windowExpired: 'E-REF-007',
  /** 409 — not refundable */
  notRefundable: 'E-REF-011',
  /** 409 — mark-executed on an SBPS refund */
  sbpsNotMarkable: 'E-REF-013',
  /** 409 — mark-executed on a refund already terminal / not approved */
  notMarkable: 'E-REF-014',
} as const;

/** Codes after which the row on screen is stale and must be refetched */
export const STALE_ROW_ERROR_CODES: ReadonlySet<string> = new Set([
  REFUND_ERROR_CODE.finalized,
  REFUND_ERROR_CODE.windowExpired,
  REFUND_ERROR_CODE.notRefundable,
  REFUND_ERROR_CODE.notMarkable,
]);

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors */
export function getRefundErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Per-row `failed[].code` copy for the bulk-approve result (API-118 §10) */
export const BULK_APPROVE_FAILURE_LABELS: Record<string, string> = {
  'E-REF-001': '申請が見つかりません',
  'E-REF-002': '既に処理済みです',
  'E-REF-003': '承認権限がありません',
  'E-REF-004': '自分の申請は承認できません',
  'E-REF-005': '返金可能残高を超えています',
  'E-REF-007': 'SBPS 決済から 90 日を超えているため返金できません',
  'E-REF-008': '承認できない状態です',
  'E-REF-011': '未確定・未入金の請求のため返金できません',
  'E-REF-101': '返金処理に失敗しました',
  'E-VAL-001': 'JACCS申請のため返金方法の選択が必要です',
};

// --- request bodies ---

export type MarkExecutedFormValues = {
  executionResult: MarkExecutedBody['executionResult'];
  /** ISO 8601 */
  executedAt: string;
  externalReferenceId: string;
  executorMemo: string;
  failureReason: string;
};

/**
 * B3: optional keys are omitted when empty — never sent as `null` (400 E-VAL-001 before MR !808,
 * still valid after it). `failureReason` is only sent for a failed outcome.
 */
export function toMarkExecutedBody(values: MarkExecutedFormValues): MarkExecutedBody {
  const body: MarkExecutedBody = {
    executionResult: values.executionResult,
    executedAt: values.executedAt,
  };
  const externalReferenceId = values.externalReferenceId.trim();
  const executorMemo = values.executorMemo.trim();
  const failureReason = values.failureReason.trim();
  if (externalReferenceId) body.externalReferenceId = externalReferenceId;
  if (executorMemo) body.executorMemo = executorMemo;
  if (values.executionResult === 'failed' && failureReason) body.failureReason = failureReason;
  return body;
}

// --- cache ---

/** Reads an approve / reject / mark-executed changes outside this screen: balances and arrears */
const REFUND_SIDE_EFFECT_QUERY_IDS = new Set([
  'adminSalesBillingControllerDetail',
  'adminSalesBillingControllerList',
  'adminSalesBillingControllerSummary',
  'adminTransactionControllerList',
  'adminTransactionControllerDetail',
  'adminReceivableControllerList',
  'adminReceivableControllerMemberDetail',
]);

/**
 * Without `applicationId` (bulk approve) every cached detail / refundability is stale too, so
 * those match on the generated `_id` instead of one path.
 */
export function invalidateRefundQueries(queryClient: QueryClient, applicationId?: string): void {
  void queryClient.invalidateQueries({ queryKey: adminRefundControllerListQueryKey() });
  const path = { applicationId: applicationId ?? '' };
  const detailKey = adminRefundControllerDetailQueryKey({ path });
  const refundabilityKey = adminRefundControllerRefundabilityQueryKey({ path });
  if (applicationId) {
    void queryClient.invalidateQueries({ queryKey: detailKey });
    void queryClient.invalidateQueries({ queryKey: refundabilityKey });
  }
  const ids = new Set(REFUND_SIDE_EFFECT_QUERY_IDS);
  if (!applicationId) {
    ids.add(detailKey[0]._id);
    ids.add(refundabilityKey[0]._id);
  }
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey as [{ _id?: unknown } | undefined];
      return typeof key?._id === 'string' && ids.has(key._id);
    },
  });
  invalidateMemberSalesReads(queryClient);
}
