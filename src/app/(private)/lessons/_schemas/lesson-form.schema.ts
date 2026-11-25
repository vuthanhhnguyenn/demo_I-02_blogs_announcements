import {
  TEXTAREA_MAX_LENGTH,
  TEXT_EDITOR_MAX_LENGTH,
  TEXT_MAX_LENGTH,
} from '@/constants/app.constants';
import { z } from 'zod';

import type { LessonImageDto } from '@/lib/api-real/types.gen';

import { LESSON_BRAND_OPTIONS } from '../_utils/lesson-api.util';

/** Highest per-use fee (tax-included) the form takes — the API's own cap on `fee` (400 E-VAL-001 above it) */
const PER_USE_FEE_MAX = 1_000_000;

export const LessonImageItemSchema = z.object({
  /** Client-side key for the list */
  id: z.string(),
  /** The stored image's id — absent for an image uploaded in this form */
  imageId: z.string().optional(),
  /** API-006 key (`member-shared/lesson-image/…`) the API stores */
  s3Key: z.string(),
  /** Preview: a stored image's signed URL, or an object URL for a fresh upload */
  url: z.string(),
});

export type LessonImageItem = z.infer<typeof LessonImageItemSchema>;

/**
 * A lesson's stored images as form items, in `displayOrder` — the first one is the main image.
 */
export function detailImagesToFormImages(
  images: LessonImageDto[] | undefined | null,
): LessonImageItem[] {
  return [...(images ?? [])]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((image) => ({
      id: crypto.randomUUID(),
      imageId: image.id,
      s3Key: image.imageS3Key,
      url: image.url,
    }));
}

const BRAND_VALUES = LESSON_BRAND_OPTIONS.map((o) => o.value) as [
  (typeof LESSON_BRAND_OPTIONS)[number]['value'],
  ...(typeof LESSON_BRAND_OPTIONS)[number]['value'][],
];

export const LessonFormSchema = z
  .object({
    name: z
      .string()
      .max(TEXT_MAX_LENGTH, `レッスン名は${TEXT_MAX_LENGTH}文字以内で入力してください。`)
      .default(''),
    /** No default — 新規作成 starts unselected (編集・複製 carry the stored value) */
    lessonType: z.enum(['studio', 'personal', 'bodycare']).optional(),
    brand: z.enum(BRAND_VALUES).optional(),
    duration: z.coerce
      .number()
      .int('所要時間は整数で入力してください。')
      .positive('所要時間は1以上で入力してください。')
      .optional(),
    pricingType: z.enum(['free', 'monthly', 'per_use']).optional(),
    /** 都度利用料金, tax-included — sent and stored as typed (API-111 §6.9) */
    perUseFee: z.coerce
      .number()
      .int('整数で入力してください')
      .min(0, '0以上で入力してください')
      .max(PER_USE_FEE_MAX, `${PER_USE_FEE_MAX.toLocaleString()}円以下で入力してください`)
      .nullable()
      .optional(),
    /** Plan ids (`planRestrictionIds`) */
    restrictedMainContracts: z.array(z.string()).default([]),
    /** Option ids (`optionRestrictionIds`) */
    restrictedOptionContracts: z.array(z.string()).default([]),
    images: z.array(LessonImageItemSchema).default([]),
    description: z
      .string()
      .max(
        TEXT_EDITOR_MAX_LENGTH,
        `レッスン内容説明は${TEXT_EDITOR_MAX_LENGTH}文字以内で入力してください。`,
      )
      .optional()
      .default(''),
    notes: z
      .string()
      .max(TEXTAREA_MAX_LENGTH, `備考は${TEXTAREA_MAX_LENGTH}文字以内で入力してください。`)
      .optional()
      .default(''),
    status: z.enum(['active', 'inactive']).default('active'),
  })
  .superRefine((data, ctx) => {
    // Required checks live here (rather than on each field's own type) so that a
    // missing brand/duration never short-circuits the other checks below it —
    // Zod skips a schema's superRefine once any sibling field has a base-type
    // (fatal) issue, which a bare `undefined` on a non-optional field triggers.
    if (!data.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'レッスン名は必須です。',
        path: ['name'],
      });
    }
    if (!data.lessonType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'レッスン区分は必須です。',
        path: ['lessonType'],
      });
    }
    if (!data.brand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ブランドは必須です。',
        path: ['brand'],
      });
    }
    if (data.duration === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '所要時間は必須です。',
        path: ['duration'],
      });
    }
    if (!data.pricingType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '料金種別は必須です。',
        path: ['pricingType'],
      });
    }
    if (
      data.pricingType === 'per_use' &&
      (data.perUseFee === null || data.perUseFee === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '都度利用料金は必須です。',
        path: ['perUseFee'],
      });
    }
  });

export type LessonFormInput = z.input<typeof LessonFormSchema>;
export type LessonFormValues = z.output<typeof LessonFormSchema>;
export type LessonFormMode = 'create' | 'edit' | 'duplicate';
