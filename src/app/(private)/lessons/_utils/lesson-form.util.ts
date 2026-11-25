import type {
  CreateLessonRequestDto,
  LessonDetailDto,
  UpdateLessonRequestDto,
} from '@/lib/api-real/types.gen';

import type { LessonFormValues } from '../_schemas/lesson-form.schema';
import { detailImagesToFormImages } from '../_schemas/lesson-form.schema';
import {
  FEE_TYPE_BY_PRICING,
  LESSON_TYPE_BY_TAB,
  PRICING_BY_FEE_TYPE,
  TAB_BY_LESSON_TYPE,
} from './lesson-api.util';

type DurationMinutes = CreateLessonRequestDto['durationMinutes'];

/** Name length the API accepts (API-111 §7.1) */
const NAME_MAX_LENGTH = 255;
const COPY_SUFFIX = '（コピー）';

/** A stored lesson as form values — 編集 keeps the name, 複製 suffixes it with 「（コピー）」. */
export function detailToFormValues(
  detail: LessonDetailDto,
  mode: 'edit' | 'duplicate',
): Partial<LessonFormValues> {
  const name =
    mode === 'duplicate' && detail.name.length + COPY_SUFFIX.length <= NAME_MAX_LENGTH
      ? `${detail.name}${COPY_SUFFIX}`
      : detail.name;
  return {
    name,
    lessonType: TAB_BY_LESSON_TYPE[detail.lessonType],
    brand: detail.brand,
    duration: detail.durationMinutes,
    pricingType: PRICING_BY_FEE_TYPE[detail.feeType],
    perUseFee: detail.feeType === 'per_use' ? detail.fee : null,
    restrictedMainContracts: detail.planRestrictionIds,
    restrictedOptionContracts: detail.optionRestrictionIds,
    images: detailImagesToFormImages(detail.images),
    description: detail.description ?? '',
    notes: detail.note ?? '',
    status: detail.isActive ? 'active' : 'inactive',
  };
}

/** id → name of a stored lesson's plan / option restrictions — the form's chips before (or
 * without) the candidate lists */
export function detailRestrictionLabels(detail: LessonDetailDto): Record<string, string> {
  return Object.fromEntries([
    ...detail.planRestrictions.map((r) => [r.planId, r.planName] as const),
    ...detail.optionRestrictions.map((r) => [r.optionId, r.optionName] as const),
  ]);
}

/** The core fields both bodies share; a fee goes with per_use only (E-LSM-006 otherwise). */
function coreFields(values: LessonFormValues) {
  const feeType = FEE_TYPE_BY_PRICING[values.pricingType ?? 'free'];
  return {
    name: values.name.trim(),
    description: values.description || null,
    // Optional in the schema only so 新規作成 can start unselected; its superRefine requires it
    lessonType: LESSON_TYPE_BY_TAB[values.lessonType!],
    durationMinutes: values.duration as DurationMinutes,
    feeType,
    fee: feeType === 'per_use' ? values.perUseFee : null,
    note: values.notes || null,
    isActive: values.status === 'active',
  };
}

/**
 * 登録 / 複製 → `POST /admin/lessons` — images (by S3 key, in order) and both restriction id
 * lists go in the same transaction. The store is not set: a master is brand-wide.
 */
export function toCreateLessonBody(values: LessonFormValues): CreateLessonRequestDto {
  return {
    ...coreFields(values),
    brand: values.brand!,
    images: values.images.map((image, index) => ({ imageS3Key: image.s3Key, displayOrder: index })),
    planRestrictionIds: values.restrictedMainContracts,
    optionRestrictionIds: values.restrictedOptionContracts,
  };
}

/**
 * 編集 → `PATCH /admin/lessons/{id}` (core fields; the brand is immutable, so not sent). Images
 * and restrictions are their own sub-resources — see `useLessonEditSave`.
 */
export function toUpdateLessonBody(
  values: LessonFormValues,
  original: Pick<LessonDetailDto, 'updatedAt'>,
): UpdateLessonRequestDto {
  return { ...coreFields(values), expectedUpdatedAt: original.updatedAt };
}

export function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
