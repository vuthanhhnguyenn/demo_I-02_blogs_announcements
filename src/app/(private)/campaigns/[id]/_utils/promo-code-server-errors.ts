import type { FieldPath } from 'react-hook-form';

import type {
  CreatePromotionCodeDto,
  ErrorResponseDto,
  ValidationErrorDetailDto,
} from '@/lib/api-real/types.gen';

import {
  PROMO_CODE_MAX_USES_MAX_MESSAGE,
  PROMO_CODE_MAX_USES_MIN_MESSAGE,
  type PromoCodeIssuanceValues,
} from '../_schemas/promo-code-issuance.schema';

type FormField = FieldPath<PromoCodeIssuanceValues>;

export interface PromoCodeFieldError {
  name: FormField;
  message: string;
}

type FormTarget = { name: FormField; label: string };

/**
 * `CreatePromotionCodeDto` field → form field + its on-screen label. Keyed on the generated DTO
 * so a renamed API field fails type-check after a client regen instead of silently dropping
 * the inline error.
 */
const API_FIELD_TO_FORM: Partial<Record<keyof CreatePromotionCodeDto, FormTarget>> = {
  code: { name: 'code', label: 'コード' },
  description: { name: 'description', label: '説明' },
  validFrom: { name: 'validFrom', label: '有効期間の開始日' },
  validTo: { name: 'validTo', label: '有効期間の終了日' },
  maxUses: { name: 'maxUses', label: '使用上限' },
  scopeType: { name: 'scopeType', label: '適用店舗タイプ' },
  issuedStoreId: { name: 'issuedStoreId', label: '発行店舗' },
};

/** API-089 domain codes that name a single form field; the API's `userMessage` is shown. */
const FIELD_BY_ERROR_CODE: Record<string, FormField> = {
  /** 422 — legacy naming-rule refusal (no longer sent since API-089 v0.10); kept as a fallback */
  'E-PRM-002': 'code',
  /** 409 — manual code already exists */
  'E-PRM-003': 'code',
  /** 422 — validTo before validFrom */
  'E-PRM-005': 'validTo',
  /** 422 — maxUses below 1 */
  'E-PRM-006': 'maxUses',
  /** 422 — issuedStoreId does not fit the scope */
  'E-PRM-010': 'issuedStoreId',
};

function formTargetOf(apiField: string): FormTarget | undefined {
  return Object.prototype.hasOwnProperty.call(API_FIELD_TO_FORM, apiField)
    ? API_FIELD_TO_FORM[apiField as keyof CreatePromotionCodeDto]
    : undefined;
}

function detailMessage(
  field: FormField,
  label: string,
  code: ValidationErrorDetailDto['code'],
): string {
  if (field === 'maxUses') {
    if (code === 'too_large') return PROMO_CODE_MAX_USES_MAX_MESSAGE;
    if (code === 'too_small' || code === 'invalid_format') return PROMO_CODE_MAX_USES_MIN_MESSAGE;
  }
  switch (code) {
    case 'required':
      return `${label}を入力してください`;
    case 'too_long':
      return `${label}の文字数が上限を超えています`;
    case 'invalid_format':
    case 'invalid_date':
      return `${label}の形式が正しくありません`;
    default:
      return `${label}の入力内容をご確認ください`;
  }
}

/**
 * Field errors carried by a failed issue call — E-VAL-001 `details` and the field-owning
 * E-PRM codes — so they land under the field (G-06 不具合 No9). Empty when none applies.
 */
export function toPromoCodeFieldErrors(error: unknown): PromoCodeFieldError[] {
  if (!error || typeof error !== 'object') return [];
  const body = error as Partial<ErrorResponseDto>;
  const byCode = body.code ? FIELD_BY_ERROR_CODE[body.code] : undefined;
  if (byCode && body.userMessage) return [{ name: byCode, message: body.userMessage }];
  return (body.details ?? []).flatMap((detail) => {
    const target = formTargetOf(detail.field);
    return target
      ? [{ name: target.name, message: detailMessage(target.name, target.label, detail.code) }]
      : [];
  });
}
