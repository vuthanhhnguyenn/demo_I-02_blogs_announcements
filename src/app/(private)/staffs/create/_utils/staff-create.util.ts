import { STAFF_BULK_INVITE_MAX_ROWS } from '@/constants/app.constants';

import type { AdminStaffControllerInviteBulkData } from '@/lib/api-real/types.gen';

import type { EmailUnavailableReason } from '../_hooks/use-email-availability.hook';
import { type StaffCreateFormValues, isRowFilled } from '../_schemas/staff-create.schema';

/**
 * Why a row's email is flagged:
 * - `'batch'` — another row of this very form already uses it.
 * - an {@link EmailUnavailableReason} — `GET /admin/staff/email-availability` answered
 *   `available: false` and said why. Advisory only per the contract, so it warns but
 *   never blocks the submit; the authoritative check is the unique constraint at invite
 *   time (E-STF-002).
 */
export type DuplicateStatus = 'batch' | EmailUnavailableReason | null;

/**
 * Row-level copy per flag. The endpoint distinguishes a taken address from an address on
 * an unregistered domain, so the UI must too — collapsing both into 「すでに登録されて
 * います」 sent the user hunting for an account that does not exist (BUG-P2-02-11). The
 * domain wording matches the invite-time E-DMN-006 message so the two agree.
 */
export const ROW_DUPLICATE_MESSAGES: Record<NonNullable<DuplicateStatus>, string> = {
  batch: 'リスト内でメールアドレスが重複しています',
  duplicate: 'このメールアドレスはすでに登録されています',
  domain_not_registered: 'このメールドメインはCRMのアクセス許可対象ではありません',
  domain_inactive: 'このメールドメインは無効化されています',
  email_too_long: 'IDaaSのメールアドレスは128文字以内で入力してください',
  unknown: 'このメールアドレスは使用できません',
};

export function getRowDuplicateStatus(
  rows: StaffCreateFormValues['rows'],
  index: number,
  unavailableEmails?: ReadonlyMap<string, EmailUnavailableReason>,
): DuplicateStatus {
  const email = rows[index]?.email.trim().toLowerCase();
  if (!email) return null;
  if (rows.some((r, i) => i !== index && r.email.trim().toLowerCase() === email)) return 'batch';
  return unavailableEmails?.get(email) ?? null;
}

/**
 * Whether the submit must be blocked over duplicates. Deliberately asks without a
 * `takenEmails` set: an `'existing'` flag is advisory (see {@link DuplicateStatus}) and
 * only in-batch duplicates are a hard client-side stop.
 */
export function hasAnyDuplicate(rows: StaffCreateFormValues['rows']): boolean {
  return rows.some((row, i) => isRowFilled(row) && getRowDuplicateStatus(rows, i) !== null);
}

export function parsePastedEmailLines(pasted: string): string[] {
  return pasted
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export interface PastedRowsResult {
  rows: StaffCreateFormValues['rows'];
  /** Pasted addresses left out because the batch cap was reached. */
  droppedCount: number;
}

/**
 * Distributes pasted addresses over one row each, capped so the form never holds more
 * than `STAFF_BULK_INVITE_MAX_ROWS` rows — `InviteStaffBulkRequestDto.staff` maxItems.
 * Overshooting used to build every row silently and only fail at submit.
 */
export function buildPastedRows(
  currentRows: StaffCreateFormValues['rows'],
  index: number,
  emailLines: string[],
): PastedRowsResult {
  const before = currentRows.slice(0, index);
  const after = currentRows.slice(index + 1);
  const current = currentRows[index];
  const availableSlots = Math.max(STAFF_BULK_INVITE_MAX_ROWS - before.length - after.length, 0);
  const acceptedLines = emailLines.slice(0, availableSlots);
  const newRows = acceptedLines.map((email, i) => ({
    last_name: i === 0 ? (current?.last_name ?? '') : '',
    first_name: i === 0 ? (current?.first_name ?? '') : '',
    email,
  }));
  return {
    rows: [...before, ...newRows, ...after],
    droppedCount: emailLines.length - acceptedLines.length,
  };
}

/**
 * Builds the `POST /api/v1/admin/staff/invite-bulk` body from the create form.
 * All filled rows are sent in one request; role/position/affiliation/memo apply
 * to every row.
 */
export function buildInviteStaffBulkPayload(
  values: StaffCreateFormValues,
): AdminStaffControllerInviteBulkData['body'] | null {
  const filledRows = values.rows.filter(isRowFilled);
  if (filledRows.length === 0) return null;

  return {
    staff: filledRows.map((row) => ({
      email: row.email.trim(),
      lastName: row.last_name.trim(),
      firstName: row.first_name.trim(),
    })),
    role: values.role,
    ...(values.position_id ? { positionId: values.position_id } : {}),
    // 所属 is optional (Y-01 L178). Omit the key entirely when nothing is picked — an empty
    // `storeIds` would read as "no stores" and an empty id fails `format: uuid`. Only ever
    // one of the two keys is present, which is the XOR the contract asks for. `storeIds`
    // keeps selection order: the first store is what the API returns as `storeId`.
    ...(values.affiliation_type === 'direct_store'
      ? values.store_ids.length > 0
        ? { storeIds: values.store_ids }
        : {}
      : values.fc_company_id
        ? { fcCompanyId: values.fc_company_id }
        : {}),
    ...(values.note?.trim() ? { memo: values.note.trim() } : {}),
  };
}

export function getSubmitErrorMessage(
  isSubmitted: boolean,
  hasDuplicate: boolean,
  hasFieldErrors: boolean,
  exceedsRowLimit = false,
  hasServerRowError = false,
): string {
  if (!isSubmitted) return '';
  if (hasDuplicate) return 'メールアドレスが重複しています';
  // Over the cap every field can be filled, so the generic 「未入力の必須項目があります」
  // below would be plainly wrong — say what is actually blocking the submit.
  if (exceedsRowLimit) return `一度に登録できるのは${STAFF_BULK_INVITE_MAX_ROWS}名までです`;
  if (hasFieldErrors) return '未入力の必須項目があります';
  // Same reasoning for a row the server refused: every field is filled in, the row itself
  // carries the reason, and 「未入力の必須項目があります」 pointed at nothing (BUG-P2-02-12).
  if (hasServerRowError) return '登録できないメールアドレスがあります';
  return '';
}

export interface FieldErrorFlags {
  /** At least one error the client raised — an empty or malformed field. */
  hasClientError: boolean;
  /** At least one row the server refused (`setError(..., { type: 'server' })`). */
  hasServerRowError: boolean;
}

function collectErrorTypes(node: unknown, out: string[]): void {
  if (!isRecord(node)) return;
  if (typeof node.type === 'string') {
    out.push(node.type);
    return;
  }
  Object.values(node).forEach((child) => collectErrorTypes(child, out));
}

/**
 * Splits react-hook-form's error tree by origin so the footer can tell a missing field
 * from a rejected one. Walked generically rather than per-field: the tree is nested
 * (`rows[n].email`) and grows whenever the form does.
 */
export function getFieldErrorFlags(errors: unknown): FieldErrorFlags {
  const types: string[] = [];
  collectErrorTypes(errors, types);
  return {
    hasClientError: types.some((type) => type !== 'server'),
    hasServerRowError: types.includes('server'),
  };
}

/**
 * One entry of the `details.processed[]` array that `POST /admin/staff/invite-bulk`
 * attaches to its 409 / 422 / 502 bodies to name the offending row.
 */
export interface FailedInviteRow {
  email: string;
  errorCode: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Pulls the per-row failures out of an invite-bulk rejection.
 *
 * Parsed by hand rather than through a generated type on purpose: `ErrorResponseDto`
 * in `openapi.real.json` declares only code/message/userMessage/traceId, so `details`
 * exists on the wire but nowhere in `types.gen.ts` — reported to BE. Anything that
 * doesn't match the documented shape yields `[]`, and the caller falls back to a toast.
 */
export function extractFailedInviteRows(error: unknown): FailedInviteRow[] {
  if (!isRecord(error) || !isRecord(error.details)) return [];
  const processed = error.details.processed;
  if (!Array.isArray(processed)) return [];

  return processed.flatMap<FailedInviteRow>((row) => {
    if (!isRecord(row) || row.status !== 'failed') return [];
    const { email, errorCode } = row;
    // The endpoint is all-or-nothing: the rejected row carries the code and every other
    // row is `failed` with `errorCode: null`. Only the coded one identifies the problem.
    if (typeof email !== 'string' || !email || typeof errorCode !== 'string' || !errorCode) {
      return [];
    }
    return [{ email, errorCode }];
  });
}

// Row-level wording per documented rejection code — the stock `userMessage` says the same
// thing but cannot be attached to a field.
const INVITE_ROW_ERROR_MESSAGES: Record<string, string> = {
  'E-STF-002': 'このメールアドレスはすでに登録されています',
  'E-DMN-006': 'このメールドメインはCRMのアクセス許可対象ではありません',
  'E-STF-005': '認証基盤への登録に失敗しました。時間をおいて再度お試しください',
};

export interface RowFieldError {
  /** Index into the form's `rows` array, i.e. the `rows.{index}.email` field. */
  index: number;
  message: string;
}

/**
 * Maps rejected rows back onto form rows by address — `processed[]` echoes the email, and
 * the request only carries the filled rows, so its order doesn't line up with the form's.
 */
export function mapFailedInviteRowsToFields(
  rows: StaffCreateFormValues['rows'],
  failedRows: FailedInviteRow[],
  fallbackMessage: string,
): RowFieldError[] {
  return failedRows.flatMap<RowFieldError>((failed) => {
    const email = failed.email.trim().toLowerCase();
    const index = rows.findIndex((row) => row.email.trim().toLowerCase() === email);
    if (index === -1) return [];
    return [{ index, message: INVITE_ROW_ERROR_MESSAGES[failed.errorCode] ?? fallbackMessage }];
  });
}

/** Same message the global mutation toast would have shown. */
export function getErrorUserMessage(error: unknown): string {
  if (isRecord(error)) {
    if (typeof error.userMessage === 'string' && error.userMessage) return error.userMessage;
    if (typeof error.message === 'string' && error.message) return error.message;
  }
  return 'エラーが発生しました。後で再試行してください。';
}
