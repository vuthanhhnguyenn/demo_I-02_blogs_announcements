'use client';

import { NAME_MAX_LENGTH, NOTE_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

import { getStoreSelectionError } from '../../../_utils/store-affiliation.util';

const kanaRegex = /^[ァ-ヶー・\s]+$/;
const optionalKana = (message: string) =>
  z
    .string()
    .max(NAME_MAX_LENGTH, message)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || kanaRegex.test(v.trim()), { message: 'カタカナで入力してください' });

// ─── Form Schema ───────────────────────────────────────────────────────────────
// Fields kept here are exactly what Y-01 / the reviewed staff-form.tsx prototype specify and the
// real API can persist — see specs/020-staff-permission-management/spec.md "Known Implementation
// Gaps" and research.md #13/#14 for why gender/birthday/address/login-settings/
// additional-permission/editable-scope fields were removed rather than kept unwired.
export const staffEditFormSchema = z
  .object({
    // 個人情報
    // maxLength 50 matches UpdateStaffRequestDto.lastName/firstName — the mock API allowed 255.
    last_name: z
      .string()
      .max(NAME_MAX_LENGTH, `姓は${NAME_MAX_LENGTH}文字以内で入力してください`)
      .refine((v) => v.trim().length > 0, { message: '姓は必須です' }),
    first_name: z
      .string()
      .max(NAME_MAX_LENGTH, `名は${NAME_MAX_LENGTH}文字以内で入力してください`)
      .refine((v) => v.trim().length > 0, { message: '名は必須です' }),
    // NOTE(spec-gap, 2026-09-18): フリガナ・携帯電話番号 are **out of scope per Y-01**.
    // They appear in no Y-01 requirement, in no `Y-01_権限設計v2_3.md` design note, and in no
    // `staff-form.tsx` prototype — see `specs/020-staff-permission-management/spec.md`
    // › "Out of scope for this spec" (furigana / phone bullet).
    // The backend diverges in the OTHER direction: `UpdateStaffRequestDto` accepts
    // `lastNameKana` / `firstNameKana` / `phone` and `StaffDetailDto` returns them, so the wire
    // fully supports these today. Decision (user, 2026-09-18): **Y-01 wins — keep them out of
    // scope, but do NOT delete the working UI.** Retained here so the divergence is visible in
    // code; resolve by either amending Y-01 to cover them or removing these fields.
    last_name_kana: optionalKana('姓（カナ）は50文字以内で入力してください'),
    first_name_kana: optionalKana('名（カナ）は50文字以内で入力してください'),
    // No format rule: the input is hidden (Y-01 - Bug No.15), so a stored value failing a regex
    // would block submit with an error the user cannot see.
    phone: z.string().optional(),
    // Editable for HQ/System on a cognito-route staff (Y-01 - Bug No.16). The 128-character
    // Cognito cap applies only to a changed address, so it is checked in page.tsx's onSubmit.
    email: z
      .string()
      .min(1, 'メールアドレスを入力してください')
      .email('メール形式が正しくありません'),
    // 権限設定
    role: z.enum(['system', 'headquarter', 'manager', 'staff', 'trainer', 'observer'], {
      message: '必須です',
    }),
    /**
     * 職位マスター ID (real API: `positions.id` is a UUID string). Optional — leaving it
     * empty keeps the staff on the role's 未割当 position (`UpdateStaffRequestDto.positionId`).
     */
    position_id: z.string(),
    // 所属設定 (パターンA: 店舗直接紐づき / パターンB: FC企業紐づき)
    affiliation_type: z.enum(['direct_store', 'fc_company']),
    /**
     * 所属店舗 in selection order (first = the API's `storeId`). Multi-select for a Manager
     * (管轄店舗 = 所属店舗), at most one store for every other role — spec.md "Manager
     * multi-store affiliation". Sent as `storeIds`.
     */
    affiliation_store_ids: z.array(z.string()),
    /**
     * UI-only: set when a role change away from Manager dropped a multi-store selection — the
     * user must pick the one store again (decision 2026-11-10: never keep the first store).
     */
    store_reselect_required: z.boolean(),
    affiliation_fc_company_id: z.string().optional().or(z.literal('')),
    // 備考
    note: z
      .string()
      .max(NOTE_MAX_LENGTH, `備考は${NOTE_MAX_LENGTH}文字以内で入力してください`)
      .optional()
      .or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    const message = getStoreSelectionError({
      role: values.role,
      isDirectStore: values.affiliation_type === 'direct_store',
      storeIds: values.affiliation_store_ids,
      reselectRequired: values.store_reselect_required,
    });
    if (message) ctx.addIssue({ code: 'custom', message, path: ['affiliation_store_ids'] });
  });

export type StaffEditFormValues = z.infer<typeof staffEditFormSchema>;
