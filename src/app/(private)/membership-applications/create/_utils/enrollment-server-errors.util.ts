import type { FieldPath } from 'react-hook-form';

import type { ErrorResponseDto, ValidationErrorDetailDto } from '@/lib/api-real/types.gen';

import {
  type DirectEnrollmentFormValues,
  USAGE_START_RANGE_MESSAGE,
} from '../_schemas/enrollment-form.schema';

type FormField = FieldPath<DirectEnrollmentFormValues>;

/** `CreateApplicationDto` path → form field + its on-screen label. */
const API_FIELD_TO_FORM: Record<string, { name: FormField; label: string }> = {
  'member.lastName': { name: 'applicant.family_name', label: '氏名（姓）' },
  'member.firstName': { name: 'applicant.given_name', label: '氏名（名）' },
  'member.lastNameKana': { name: 'applicant.family_name_kana', label: 'フリガナ（姓）' },
  'member.firstNameKana': { name: 'applicant.given_name_kana', label: 'フリガナ（名）' },
  'member.dateOfBirth': { name: 'applicant.birth_date', label: '生年月日' },
  'member.phoneNumber': { name: 'applicant.phone', label: '電話番号' },
  'member.email': { name: 'applicant.email', label: 'メールアドレス' },
  'member.address.postalCode': { name: 'applicant.address.postal_code', label: '郵便番号' },
  'member.address.prefectureCode': { name: 'applicant.address.prefecture', label: '都道府県' },
  'member.address.streetAddress': {
    name: 'applicant.address.street_address',
    label: '市町村・番地',
  },
  'member.address.building': { name: 'applicant.address.building', label: '建物名' },
  'member.facePhotoS3Key': { name: 'applicant.face_photo_id', label: '顔写真' },
  usageStartDate: { name: 'contract.usage_start_date', label: '利用開始日' },
  // プラン is read-only and follows the campaign (D17) — a plan error belongs to the campaign.
  campaignId: { name: 'contract.campaign_id', label: '適用キャンペーン' },
  planId: { name: 'contract.campaign_id', label: '適用キャンペーン' },
  parentName: { name: 'consent.guardian_name', label: '保護者氏名' },
  parentApprovalAt: { name: 'consent.guardian_consent_at', label: '同意日時' },
  proxyAgreedAt: { name: 'consent.agreement_datetime', label: '合意日時' },
};

/** 422 — usage start date outside the today … +2 months window. */
const USAGE_START_OUT_OF_RANGE = 'E-ENR-004';

/**
 * Create-call codes that name one form field (API-098 v1.17), with fallback wording for a
 * response that carries no `userMessage`. E-ENR-014 (unpaid balance) and anything else names
 * none and falls back to the toast.
 */
const FIELD_ERROR_BY_CODE: Record<string, EnrollmentFieldError> = {
  /** 422 — 合意日時 missing (crm_direct / proxy) */
  'E-ENR-008': { name: 'consent.agreement_datetime', message: '合意日時を入力してください' },
  /** 409 — campaign capacity full */
  'E-CMP-019': {
    name: 'contract.campaign_id',
    message: 'このキャンペーンは定員に達しています。別のキャンペーンを選択してください',
  },
  /** 422 — campaign not usable at this store (not accepting / not linked / not published) */
  'E-CMP-021': {
    name: 'contract.campaign_id',
    message: 'このキャンペーンは選択した店舗では利用できません',
  },
  /** 422 — usage start date outside the campaign's usage period */
  'E-CMP-022': {
    name: 'contract.usage_start_date',
    message: '利用開始日がキャンペーンの利用期間外です',
  },
  /** 422 — the applicant's 性別 does not meet the campaign plan's gender condition (E-02 FR-016) */
  'E-ARE-003': {
    name: 'contract.campaign_id',
    message: '会員の性別が条件に合わないため、この主契約・オプションは契約できません。',
  },
};

function detailMessage(label: string, code: ValidationErrorDetailDto['code']): string {
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

export interface EnrollmentFieldError {
  name: FormField;
  message: string;
}

/**
 * Field errors carried by a failed create call — E-VAL-001 `details`, E-ENR-004 and the
 * codes in `FIELD_ERROR_BY_CODE` — so
 * they land under the field instead of a generic toast (BUG-D-05 / BUG-D-07). Empty when
 * the error names no form field.
 */
export function toEnrollmentFieldErrors(error: unknown): EnrollmentFieldError[] {
  if (!error || typeof error !== 'object') return [];
  const body = error as Partial<ErrorResponseDto>;
  if (body.code === USAGE_START_OUT_OF_RANGE) {
    return [{ name: 'contract.usage_start_date', message: USAGE_START_RANGE_MESSAGE }];
  }
  const byCode = body.code ? FIELD_ERROR_BY_CODE[body.code] : undefined;
  // The API's own wording wins; the fixed text only covers a response without one (BUG-D-21).
  if (byCode) return [{ name: byCode.name, message: body.userMessage || byCode.message }];
  return (body.details ?? []).flatMap((detail) => {
    const target = API_FIELD_TO_FORM[detail.field];
    return target ? [{ name: target.name, message: detailMessage(target.label, detail.code) }] : [];
  });
}
