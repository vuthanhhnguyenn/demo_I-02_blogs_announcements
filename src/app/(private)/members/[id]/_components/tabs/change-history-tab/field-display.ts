import { formatDate } from '@/utils/format.util';

import { MEMBER_STATUS_LABELS, type MemberStatusValue } from '../../../../_constants/constants';
import { PREFECTURE_OPTIONS } from '../../../../_schemas/member-form.schema';
import { brandGroupLabel, genderLabel, memberTypeLabel } from '../../../_constants/member-labels';

/**
 * On `source=member` the history is a diff over raw `members` columns, so both sides of a row need
 * translating before they can be shown: the column name into the label the rest of A-01 uses for
 * that field, and the stored value into the same vocabulary the member screens render elsewhere.
 * Labels follow the member form, which is where an operator edits these fields in the first place.
 */
export const MEMBER_FIELD_LABELS: Record<string, string> = {
  lastName: '氏名（姓）',
  firstName: '氏名（名）',
  lastNameKana: 'フリガナ（姓）',
  firstNameKana: 'フリガナ（名）',
  dateOfBirth: '生年月日',
  gender: '性別',
  postalCode: '郵便番号',
  prefecture: '都道府県',
  streetAddress: '市町村・番地',
  building: '建物名',
  phone: '電話番号',
  email: 'メールアドレス',
  memberStatus: 'ステータス',
  memberType: '会員種別',
  brandGroup: 'ブランド',
  enrolledAt: '入会日',
  memo: 'メモ',
  bloodType: '血液型',
  rhesusFactor: 'Rh因子',
  emergencyContactLastName: '緊急連絡先（姓）',
  emergencyContactFirstName: '緊急連絡先（名）',
  emergencyContactPhone: '緊急連絡先電話番号',
  facePhotoS3Key: '顔写真',
  familyParentId: '家族会員（親会員）',
};

/**
 * Only labelled columns are shown. The rest (`id`, timestamps, sync and pointer columns) are
 * bookkeeping the snapshot carries along, not fields an operator edits.
 */
export function isDisplayedMemberField(fieldCode: string): boolean {
  return fieldCode in MEMBER_FIELD_LABELS;
}

export function memberFieldLabel(fieldCode: string): string {
  return MEMBER_FIELD_LABELS[fieldCode] ?? fieldCode;
}

/**
 * `prefecture` is stored as the JIS X 0401 code. The form pads it to two digits, the history rows
 * carry it unpadded (`"1"` as well as `"13"`), so normalise before the lookup.
 */
function prefectureLabel(code: string): string {
  const padded = code.padStart(2, '0');
  return PREFECTURE_OPTIONS.find((option) => option.value === padded)?.label ?? code;
}

function statusLabel(value: string): string {
  return MEMBER_STATUS_LABELS[value as MemberStatusValue] ?? value;
}

/** `null` means "nothing to show" — the table renders its own em dash for that. */
export function formatMemberFieldValue(fieldCode: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  switch (fieldCode) {
    case 'prefecture':
      return prefectureLabel(String(value));
    case 'gender':
      return genderLabel(String(value)) ?? String(value);
    case 'memberStatus':
      return statusLabel(String(value));
    case 'memberType':
      return memberTypeLabel(String(value)) ?? String(value);
    case 'brandGroup':
      return brandGroupLabel(String(value)) ?? String(value);
    case 'dateOfBirth':
    case 'enrolledAt':
      return formatDate(String(value));
    case 'rhesusFactor':
      // Stored as the legacy enum verbatim (`rh+` / `rh-`).
      return String(value) === 'rh+' ? 'Rh+' : String(value) === 'rh-' ? 'Rh-' : String(value);
    case 'facePhotoS3Key':
      // The raw S3 key says nothing to an operator; the change itself is what the row records.
      return '登録あり';
    default:
      break;
  }

  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
