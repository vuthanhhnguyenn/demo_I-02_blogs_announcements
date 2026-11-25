import { TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

/**
 * Group / class session memo — a single free-text record.
 * `maxLength` is the API-113 §7.5 cap for the lesson type (studio 5,000 / PT 10,000).
 */
export function createGroupMemoFormSchema(maxLength: number) {
  return z.object({
    content: z
      .string()
      .trim()
      .min(1, 'メモを入力してください')
      .max(maxLength, `メモは${maxLength}文字以内で入力してください`),
  });
}

export type GroupMemoFormValues = z.infer<ReturnType<typeof createGroupMemoFormSchema>>;

/**
 * Personal (PT) session memo — structured fields.
 * All fields are individually optional, but at least one must be filled in, and the joined
 * text (see `buildPersonalMemoContent`) must fit the lesson type's cap.
 */
const personalMemoFieldsSchema = (maxLength: number) =>
  z.object({
    menu: z
      .string()
      .max(TEXT_MAX_LENGTH, `実施メニューは${TEXT_MAX_LENGTH}文字以内で入力してください`)
      .optional(),
    weight: z
      .string()
      .max(TEXT_MAX_LENGTH, `重量は${TEXT_MAX_LENGTH}文字以内で入力してください`)
      .optional(),
    reps: z
      .string()
      .max(TEXT_MAX_LENGTH, `回数は${TEXT_MAX_LENGTH}文字以内で入力してください`)
      .optional(),
    condition: z
      .string()
      .max(maxLength, `会員の状態は${maxLength}文字以内で入力してください`)
      .optional(),
    handover: z
      .string()
      .max(maxLength, `次回への申し送りは${maxLength}文字以内で入力してください`)
      .optional(),
  });

export type PersonalMemoFormValues = z.infer<ReturnType<typeof personalMemoFieldsSchema>>;

export function createPersonalMemoFormSchema(maxLength: number) {
  return personalMemoFieldsSchema(maxLength)
    .refine((values) => Object.values(values).some((field) => field?.trim()), {
      message: '少なくとも1項目を入力してください',
      path: ['menu'],
    })
    .refine((values) => buildPersonalMemoContent(values).length <= maxLength, {
      message: `メモ全体は${maxLength}文字以内で入力してください`,
      path: ['handover'],
    });
}

/** The five PT fields joined into the single memo text the API stores (spec §5.2). */
export function buildPersonalMemoContent(values: PersonalMemoFormValues): string {
  return [
    values.menu?.trim() && `実施メニュー: ${values.menu.trim()}`,
    values.weight?.trim() && `重量: ${values.weight.trim()}`,
    values.reps?.trim() && `回数: ${values.reps.trim()}`,
    values.condition?.trim() && `会員の状態: ${values.condition.trim()}`,
    values.handover?.trim() && `次回への申し送り: ${values.handover.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');
}
