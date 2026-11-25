import { z } from 'zod';

import {
  FEE_TYPE_LABELS,
  type FeeType,
  MAX_SCHEDULED_CHANGES,
} from '../../_constants/brand-real.constants';
import type { BrandFeeSheetMode } from '../_types/brand-fee.type';

/**
 * The inputs hand an empty 定価 over as `NaN`, which `z.number()` rejects with this message. Its
 * type issue stops the integer/range checks below, but — unlike `z.custom` — it does not
 * explicitly abort the parse, so the item's date rules still run (BUG-021-U4-02).
 */
/**
 * Y-07 FR-002 / API-074 set no business maximum, so the API caps 定価 at its integer DB column and
 * answers anything larger with a 400 toast instead of a field error (Y-07 - Bug No.1).
 */
export const MAX_FEE_VALUE_YEN = 2_147_483_647;

export const MAX_FEE_VALUE_MESSAGE = `定価（税込）は${MAX_FEE_VALUE_YEN.toLocaleString('ja-JP')}以下で入力してください`;

const feeValueSchema = z
  .number({ error: '定価（税込）を入力してください' })
  .refine((value) => Number.isInteger(value), '定価（税込）は整数で入力してください')
  .refine((value) => value >= 0, '定価（税込）は0以上で入力してください')
  .refine((value) => value <= MAX_FEE_VALUE_YEN, MAX_FEE_VALUE_MESSAGE);

export const REQUIRED_DATE_MESSAGE = '有効開始日を入力してください';

const effectiveDateSchema = z.string().trim().min(1, REQUIRED_DATE_MESSAGE);

export const brandScheduledFeeChangeFormSchema = z.object({
  effectiveStartDate: effectiveDateSchema,
  valueIncludingTaxYen: feeValueSchema,
});

const brandFeeItemFormObjectSchema = z.object({
  feeType: z.custom<FeeType>((value) => typeof value === 'string' && value in FEE_TYPE_LABELS),
  /** Display-only — the four fee categories are a fixed domain (Y-07 FR-002, R307). */
  itemName: z.string(),
  /** 有効開始日 of the price in force when the sheet opened; `null` when there is none. */
  originalEffectiveStartDate: z.string().nullable(),
  effectiveStartDate: effectiveDateSchema,
  currentValueIncludingTaxYen: feeValueSchema,
  scheduledChanges: z.array(brandScheduledFeeChangeFormSchema).max(MAX_SCHEDULED_CHANGES),
});

type BrandFeeItemFormObject = z.infer<typeof brandFeeItemFormObjectSchema>;

/** `YYYY/MM/DD` compares correctly as a string, so no `Date` round-trip is needed. */
function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}/${month}/${day}`;
}

export const FUTURE_CURRENT_DATE_MESSAGE = '将来日付は「予約中の改定」に登録してください';

function asDateString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The date rules the API enforces on `PATCH .../fees` (`BrandFeeCardItemDto`), checked here so
 * they surface on the field instead of as a 400 toast:
 *
 * - 現行設定の有効開始日 is today or earlier (plan D8, Δ11) — a future date belongs in 予約中の改定.
 *   This holds for 登録 too: its body carries no 予約, so a future date there would register a
 *   master with no price in force (BUG-021-U4-07).
 * - 変更 only: the 現行 date is not before the start of the price in force (a same-date save is a
 *   correction), and a 予約 must fall after the 現行 start and not repeat another 予約's date.
 *
 * It runs even when other fields of the item failed (`when` below): zod otherwise skips a
 * refinement once the object has an aborting issue — an empty 予約 row's NaN 定価 is one — which
 * held the Δ11 message back until that row was fixed (BUG-021-U4-02). So every value is read
 * leniently here and a missing date simply skips the rules that need it.
 */
function refineDateRules(mode: BrandFeeSheetMode) {
  return (item: BrandFeeItemFormObject, ctx: z.RefinementCtx) => {
    const today = todayString();
    const effectiveStartDate = asDateString(item.effectiveStartDate);
    const originalEffectiveStartDate = asDateString(item.originalEffectiveStartDate);

    if (effectiveStartDate > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: FUTURE_CURRENT_DATE_MESSAGE,
        path: ['effectiveStartDate'],
      });
    } else if (
      mode === 'edit' &&
      originalEffectiveStartDate &&
      effectiveStartDate &&
      effectiveStartDate < originalEffectiveStartDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `現在適用中の有効開始日（${originalEffectiveStartDate}）より前の日付は指定できません`,
        path: ['effectiveStartDate'],
      });
    }

    if (mode !== 'edit' || !Array.isArray(item.scheduledChanges)) return;

    const seenDates = new Map<string, number>();
    item.scheduledChanges.forEach((change: unknown, index) => {
      const path = ['scheduledChanges', index, 'effectiveStartDate'];
      const changeDate =
        typeof change === 'object' && change !== null && 'effectiveStartDate' in change
          ? asDateString(change.effectiveStartDate)
          : '';
      if (!changeDate) return;

      if (effectiveStartDate && changeDate === effectiveStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '現行の有効開始日と重複しています',
          path,
        });
      } else if (effectiveStartDate && changeDate < effectiveStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '現行の有効開始日より後の日付を指定してください',
          path,
        });
      }

      const firstIndex = seenDates.get(changeDate);
      if (firstIndex !== undefined) {
        const message = '有効開始日が他の改定と重複しています';
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ['scheduledChanges', firstIndex, 'effectiveStartDate'],
        });
      } else {
        seenDates.set(changeDate, index);
      }
    });
  };
}

export function buildBrandFeeGroupFormSchema(mode: BrandFeeSheetMode) {
  const itemSchema = brandFeeItemFormObjectSchema.superRefine(refineDateRules(mode), {
    // Run alongside the field errors so every message shows on the first save (see above).
    when: (payload) => typeof payload.value === 'object' && payload.value !== null,
  });

  return z.object({ feeItems: z.array(itemSchema).min(1) });
}

export type BrandFeeGroupFormValues = z.infer<ReturnType<typeof buildBrandFeeGroupFormSchema>>;
