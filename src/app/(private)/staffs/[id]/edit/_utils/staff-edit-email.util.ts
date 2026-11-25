/**
 * Email-change rules for the staff edit screen (Y-01 - Bug No.16, API-070 v0.11.1 §6.5.3).
 */
import { getApiErrorCode } from '@/lib/api-error.util';
import type { StaffDetailDto, UpdateStaffResponseDto } from '@/lib/api-real/types.gen';

/** Cognito's limit — an IDaaS address over this is rejected with `400 E-VAL-001 too_long`. */
export const STAFF_EMAIL_COGNITO_MAX_LENGTH = 128;

export const EMAIL_LOCK_REASON_GOOGLE = 'Googleアカウントのメールアドレスは変更できません';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The backend treats the same address in another case as a no-op, so the FE must too. */
export function isEmailChanged(nextEmail: string, currentEmail: string): boolean {
  return normalizeEmail(nextEmail) !== normalizeEmail(currentEmail);
}

/**
 * Why the email input is locked, or `null` when it may be edited.
 * A Google-route staff cannot change it (`422 E-STF-016`) — the address belongs to Google.
 * `authProvider: null` (seeded without an invitation) is handled like `cognito` by the API.
 */
export function getEmailLockReason(authProvider: StaffDetailDto['authProvider']): string | null {
  if (authProvider === 'google') return EMAIL_LOCK_REASON_GOOGLE;
  return null;
}

/**
 * Field-level wording for the PATCH rejections that are about the new address. The global
 * mutation toast still fires; this pins the cause to the input the user has to fix.
 */
const EMAIL_PATCH_ERROR_MESSAGES: Record<string, string> = {
  'E-STF-002': 'このメールアドレスはすでに登録されています',
  'E-DMN-006': 'このメールドメインはCRMのアクセス許可対象ではありません',
  'E-STF-016': 'このメールアドレスには変更できません（ログイン方式が異なるドメインです）',
  'E-STF-005': '認証基盤への反映に失敗しました。時間をおいて再度お試しください',
};

export function getEmailPatchErrorMessage(error: unknown): string | undefined {
  const code = getApiErrorCode(error);
  if (!code) return undefined;
  if (code === 'E-VAL-001') {
    const details = (error as { details?: unknown }).details;
    const isEmailDetail =
      Array.isArray(details) &&
      details.some(
        (detail) =>
          typeof detail === 'object' &&
          detail !== null &&
          (detail as { field?: unknown }).field === 'email',
      );
    return isEmailDetail ? 'メールアドレスの形式または文字数が正しくありません' : undefined;
  }
  return EMAIL_PATCH_ERROR_MESSAGES[code];
}

/**
 * Save toast for `PATCH /admin/staff/{id}`. An email change of a 招待中 staff makes the API
 * re-send the invitation itself and report it in `reinvite` (Otaki-san decision, Y-01 - Bug No.16):
 * the FE must not call `POST /reinvite` again, only tell the user what happened.
 */
export function getStaffSaveToast(reinvite: UpdateStaffResponseDto['reinvite']): {
  type: 'success' | 'warning';
  message: string;
} {
  switch (reinvite) {
    case 'failed':
      return {
        type: 'warning',
        message:
          'スタッフ情報を更新しました。招待メールを送信できませんでした。一覧または詳細画面の「再招待」から再送してください。',
      };
    case 'sent':
      return {
        type: 'success',
        message: 'スタッフ情報を更新しました。新しいメールアドレスに招待メールを送信しました。',
      };
    case 'skipped':
      return {
        type: 'success',
        message: 'スタッフ情報を更新しました。無効のスタッフのため招待メールは送信していません。',
      };
    default:
      return { type: 'success', message: 'スタッフ情報を更新しました' };
  }
}
