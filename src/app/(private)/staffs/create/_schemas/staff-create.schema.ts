import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  STAFF_BULK_INVITE_MAX_ROWS,
} from '@/constants/app.constants';
import { z } from 'zod';

import { getStoreSelectionError } from '../../_utils/store-affiliation.util';

// Field limits come from the API contract, because Y-01.md defines none — see
// specs/020-staff-permission-management/spec.md "Field Validation Constraints" (2026-09-18).
//   姓 / 名   1–50   (BulkInviteRowDto.lastName / .firstName)
//   email     ≤ 254  (BulkInviteRowDto.email — NOT the generic TEXT_MAX_LENGTH 255)
//   備考      ≤ 1000 (InviteStaffBulkRequestDto.memo)
//   rows      1–50   (InviteStaffBulkRequestDto.staff minItems/maxItems)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Same shape check the row schema applies. Exported so the availability pre-check can
 * skip addresses the user is still typing — `email-availability` 400s on a malformed one.
 */
function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

function isRowFilled(row: { last_name: string; first_name: string; email: string }): boolean {
  return Boolean(row.last_name.trim() || row.first_name.trim() || row.email.trim());
}

export const staffCreateRowSchema = z.object({
  last_name: z.string(),
  first_name: z.string(),
  email: z.string(),
});

export const staffCreateFormSchema = z
  .object({
    rows: z
      .array(staffCreateRowSchema)
      .superRefine((rows, ctx) => {
        rows.forEach((row, index) => {
          // A blank *added* row is skipped, like the prototype. The first row is always
          // validated — a submission needs at least one staff — so clearing its 姓 / 名 keeps
          // their required errors instead of silently dropping them (Y-01 Bug No.8).
          if (index > 0 && !isRowFilled(row)) return;
          if (!row.last_name.trim()) {
            ctx.addIssue({ code: 'custom', message: '姓は必須です', path: [index, 'last_name'] });
          } else if (row.last_name.length > NAME_MAX_LENGTH) {
            ctx.addIssue({
              code: 'custom',
              message: `姓は${NAME_MAX_LENGTH}文字以内で入力してください`,
              path: [index, 'last_name'],
            });
          }
          if (!row.first_name.trim()) {
            ctx.addIssue({ code: 'custom', message: '名は必須です', path: [index, 'first_name'] });
          } else if (row.first_name.length > NAME_MAX_LENGTH) {
            ctx.addIssue({
              code: 'custom',
              message: `名は${NAME_MAX_LENGTH}文字以内で入力してください`,
              path: [index, 'first_name'],
            });
          }
          if (!row.email.trim()) {
            ctx.addIssue({
              code: 'custom',
              message: 'メールアドレスは必須です',
              path: [index, 'email'],
            });
          } else if (!EMAIL_REGEX.test(row.email.trim())) {
            ctx.addIssue({
              code: 'custom',
              message: 'メール形式が正しくありません',
              path: [index, 'email'],
            });
          } else if (row.email.trim().length > EMAIL_MAX_LENGTH) {
            ctx.addIssue({
              code: 'custom',
              message: `メールアドレスは${EMAIL_MAX_LENGTH}文字以内で入力してください`,
              path: [index, 'email'],
            });
          }
        });
      })
      .refine((rows) => rows.some(isRowFilled), {
        message: '少なくとも1名分の情報を入力してください',
      })
      // `InviteStaffBulkRequestDto.staff` caps one submission at 50 rows (maxItems). Enforced
      // here as well as in the UI so a paste that overshoots is reported rather than 400ing.
      .refine((rows) => rows.filter(isRowFilled).length <= STAFF_BULK_INVITE_MAX_ROWS, {
        message: `一度に登録できるのは${STAFF_BULK_INVITE_MAX_ROWS}名までです`,
      }),
    role: z.enum(['headquarter', 'manager', 'staff', 'trainer', 'observer'], {
      message: 'ロールを選択してください',
    }),
    /**
     * 職位マスター ID (real API: `positions.id` is a UUID string). Optional — leaving it
     * empty keeps the staff on the role's 未割当 position (`InviteStaffBulkRequestDto.positionId`).
     */
    position_id: z.string(),
    /**
     * 所属設定 — UI-only discriminator; picks which of storeId / fcCompanyId is sent.
     * Both affiliation values are **optional**: Y-01 L178 lists 所属店舗 / FC企業 under
     * 「任意入力項目」, the prototype marks both 「（任意）」, and `InviteStaffRequestDto.required`
     * covers only email/role/lastName/firstName. The only real constraint is XOR — never send
     * both — which `buildInviteStaffBulkPayload` enforces by construction.
     *
     * FIXED 2026-09-18: a `superRefine` here forced one of the two to be selected
     * (「店舗を選択してください」/「FC企業を選択してください」), contradicting all three sources.
     * See specs/020-staff-permission-management/spec.md "Field Validation Constraints".
     */
    affiliation_type: z.enum(['direct_store', 'fc_company']),
    /**
     * 所属店舗 (パターンA), in selection order. Multi-select for a Manager — every store is
     * one it manages — and at most one store for every other role (spec.md "Manager
     * multi-store affiliation"). Sent as `storeIds`.
     */
    store_ids: z.array(z.string()),
    /**
     * UI-only: set when a role change away from Manager dropped a multi-store selection, so
     * the user has to pick the one store again instead of the form silently keeping one.
     */
    store_reselect_required: z.boolean(),
    fc_company_id: z.string().optional(),
    note: z
      .string()
      .max(NOTE_MAX_LENGTH, `備考は${NOTE_MAX_LENGTH}文字以内で入力してください`)
      .optional(),
  })
  .superRefine((values, ctx) => {
    const message = getStoreSelectionError({
      role: values.role,
      isDirectStore: values.affiliation_type === 'direct_store',
      storeIds: values.store_ids,
      reselectRequired: values.store_reselect_required,
    });
    if (message) ctx.addIssue({ code: 'custom', message, path: ['store_ids'] });
  });

export type StaffCreateFormValues = z.infer<typeof staffCreateFormSchema>;
export { isRowFilled, isValidEmailFormat };
