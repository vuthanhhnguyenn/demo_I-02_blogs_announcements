/**
 * Unit test for the lesson form ↔ API mapping of the per-use fee. `fee` is tax-included on both
 * sides (API-111 §6.9, v0.10), so the form sends and shows it as-is — no ¥1,000 → ¥1,001 drift.
 *
 * Run with Node's built-in runner through tsx (which resolves the `@/…` tsconfig paths):
 *
 * ```sh
 * npx tsx --test "src/app/(private)/lessons/_utils/lesson-form.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LessonDetailDto } from '@/lib/api-real/types.gen';

import { LessonFormSchema } from '../_schemas/lesson-form.schema';
import { LESSON_BRAND_OPTIONS } from './lesson-api.util';
import { detailToFormValues, toCreateLessonBody, toUpdateLessonBody } from './lesson-form.util';

function formValues(pricingType: 'free' | 'monthly' | 'per_use', perUseFee: number | null) {
  return LessonFormSchema.parse({
    name: 'ヨガ',
    lessonType: 'studio',
    brand: LESSON_BRAND_OPTIONS[0].value,
    duration: 60,
    pricingType,
    perUseFee,
  });
}

function detail(fields: Pick<LessonDetailDto, 'feeType' | 'fee'>): LessonDetailDto {
  return {
    name: 'ヨガ',
    lessonType: 'studio',
    brand: LESSON_BRAND_OPTIONS[0].value,
    durationMinutes: 60,
    planRestrictionIds: [],
    optionRestrictionIds: [],
    planRestrictions: [],
    optionRestrictions: [],
    images: [],
    description: null,
    note: null,
    isActive: true,
    ...fields,
  } as unknown as LessonDetailDto;
}

describe('per-use fee: form → request body', () => {
  it('sends the typed tax-included fee unchanged on create', () => {
    assert.equal(toCreateLessonBody(formValues('per_use', 1000)).fee, 1000);
  });

  it('sends the typed tax-included fee unchanged on update', () => {
    const body = toUpdateLessonBody(formValues('per_use', 1000), {
      updatedAt: '2026-10-29T00:00:00Z',
    });
    assert.equal(body.fee, 1000);
  });

  it('sends 0 as 0', () => {
    assert.equal(toCreateLessonBody(formValues('per_use', 0)).fee, 0);
  });

  it('sends no fee for free / monthly lessons', () => {
    assert.equal(toCreateLessonBody(formValues('free', null)).fee, null);
    assert.equal(toCreateLessonBody(formValues('monthly', null)).fee, null);
  });
});

describe('per-use fee: detail → form', () => {
  it('shows the stored fee as-is (1001 stays 1001)', () => {
    assert.equal(
      detailToFormValues(detail({ feeType: 'per_use', fee: 1001 }), 'edit').perUseFee,
      1001,
    );
  });

  it('round-trips ¥1,000 without drift', () => {
    const shown = detailToFormValues(detail({ feeType: 'per_use', fee: 1000 }), 'edit').perUseFee;
    assert.equal(shown, 1000);
    assert.equal(toCreateLessonBody(formValues('per_use', shown ?? null)).fee, 1000);
  });

  it('shows no fee for a non-per-use lesson', () => {
    assert.equal(
      detailToFormValues(detail({ feeType: 'monthly_plan', fee: null }), 'edit').perUseFee,
      null,
    );
  });
});

describe('per-use fee: form max', () => {
  // The API caps `fee` at 1,000,000 (400 E-VAL-001 above it); the form stops at the same value.
  function feeError(perUseFee: number) {
    const result = LessonFormSchema.safeParse({
      name: 'ヨガ',
      lessonType: 'studio',
      brand: LESSON_BRAND_OPTIONS[0].value,
      duration: 60,
      pricingType: 'per_use',
      perUseFee,
    });
    return result.success
      ? null
      : (result.error.issues.find((issue) => issue.path[0] === 'perUseFee')?.message ?? null);
  }

  it('takes ¥1,000,000', () => {
    assert.equal(feeError(1_000_000), null);
  });

  it('rejects ¥1,000,001 with the 円以下 message', () => {
    assert.equal(feeError(1_000_001), '1,000,000円以下で入力してください');
  });
});
