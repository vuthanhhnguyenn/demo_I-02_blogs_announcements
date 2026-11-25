import { getApiErrorCode, resolveApiErrorMessage } from '@/lib/api-error.util';
import type { CreateAppVersionDto, ValidationErrorDetailDto } from '@/lib/api-real/types.gen';

import {
  type AppVersionFormValues,
  LATEST_BELOW_MINIMUM_MESSAGE,
} from '../_schemas/app-version-form.schema';

type AppVersionFormField = keyof AppVersionFormValues;

/** Why edit/delete is unavailable on an active or ended setting (the server's E-APP-003 wording). */
export const APP_VERSION_NOT_SCHEDULED_REASON =
  '適用中・終了したバージョン設定は編集・削除できません。新しい設定を登録してください。';

/**
 * Request DTO path → form field + on-screen label. Keyed on the generated DTO type so a
 * renamed API field fails type-check.
 */
const API_FIELD_TO_FORM: Record<
  keyof CreateAppVersionDto,
  { name: AppVersionFormField; label: string }
> = {
  brandEnum: { name: 'brandEnum', label: 'ブランド' },
  effectiveAt: { name: 'effectiveAt', label: '適用開始日時' },
  iosMinVersionName: { name: 'iosMinVersionName', label: 'iOS 最低バージョン' },
  iosMinBuildNumber: { name: 'iosMinBuildNumber', label: 'iOS 最低バージョンのビルド番号' },
  androidMinVersionName: { name: 'androidMinVersionName', label: 'Android 最低バージョン' },
  androidMinBuildNumber: {
    name: 'androidMinBuildNumber',
    label: 'Android 最低バージョンのビルド番号',
  },
  iosLatestVersionName: { name: 'iosLatestVersionName', label: 'iOS 最新バージョン' },
  iosLatestBuildNumber: { name: 'iosLatestBuildNumber', label: 'iOS 最新バージョンのビルド番号' },
  androidLatestVersionName: { name: 'androidLatestVersionName', label: 'Android 最新バージョン' },
  androidLatestBuildNumber: {
    name: 'androidLatestBuildNumber',
    label: 'Android 最新バージョンのビルド番号',
  },
  remarks: { name: 'remarks', label: '備考' },
};

/** Business-rule refusals that belong under one field; the server's `userMessage` is shown there. */
const CODE_TO_FIELD: Partial<Record<string, AppVersionFormField>> = {
  'E-APP-002': 'effectiveAt',
  'E-APP-005': 'effectiveAt',
};

/** E-VAL-001 `details[]` as an array (any other `details` shape has no field entries). */
export function validationDetailsOf(error: unknown): ValidationErrorDetailDto[] {
  const details =
    typeof error === 'object' && error !== null
      ? (error as { details?: unknown }).details
      : undefined;
  return Array.isArray(details) ? (details as ValidationErrorDetailDto[]) : [];
}

/** Japanese wording for one E-VAL-001 detail, built from its `code` (`message` is English debug). */
export function validationDetailMessage(
  label: string,
  code: ValidationErrorDetailDto['code'],
): string {
  switch (code) {
    case 'required':
    case 'too_short':
      return `${label}を入力してください`;
    case 'too_long':
      return `${label}の文字数が上限を超えています`;
    case 'too_small':
      return `${label}が下限を下回っています`;
    case 'too_large':
      return `${label}が上限を超えています`;
    case 'invalid_format':
    case 'invalid_date':
      return `${label}の形式が正しくありません`;
    default:
      return `${label}の入力内容をご確認ください`;
  }
}

export interface AppVersionFieldError {
  name: AppVersionFormField;
  message: string;
}

export interface AppVersionServerErrors {
  fieldErrors: AppVersionFieldError[];
  /** True when some part of the failure has no form field to land on and needs the toast. */
  hasUnmappedError: boolean;
}

/**
 * One (setting, OS) that breaks "latest ≥ minimum" after carry-over: an entry of E-APP-004
 * `details.violations[]`. Only the setting being saved (`self`) carries the form `field`.
 */
interface AppVersionChainViolation {
  self: boolean;
  field?: string;
}

function isChainViolation(value: unknown): value is AppVersionChainViolation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { self?: unknown }).self === 'boolean'
  );
}

/** E-APP-004 sends `details: { violations: [...] }` instead of the E-VAL-001 detail array. */
function chainViolationsOf(details: unknown): AppVersionChainViolation[] | undefined {
  if (typeof details !== 'object' || details === null || Array.isArray(details)) return undefined;
  const { violations } = details as { violations?: unknown };
  return Array.isArray(violations) ? violations.filter(isChainViolation) : undefined;
}

/**
 * The server's `userMessage` describes the first violation, so it goes under that field when the
 * first violation is the setting being saved; another field of this setting gets the client's
 * latest-vs-minimum wording. A violation of a later setting has no field on this form, so it goes
 * to the toast, whose server message names that setting's start.
 */
function chainViolationErrors(
  error: unknown,
  violations: AppVersionChainViolation[],
): AppVersionServerErrors {
  const fieldErrors: AppVersionFieldError[] = [];
  violations.forEach((violation, index) => {
    if (!violation.self || !violation.field) return;
    const target = API_FIELD_TO_FORM[violation.field as keyof CreateAppVersionDto];
    if (!target || fieldErrors.some((fieldError) => fieldError.name === target.name)) return;
    fieldErrors.push({
      name: target.name,
      message: index === 0 ? resolveApiErrorMessage(error) : LATEST_BELOW_MINIMUM_MESSAGE,
    });
  });
  const firstShownOnForm = violations[0]?.self === true && fieldErrors.length > 0;
  return { fieldErrors, hasUnmappedError: !firstShownOnForm };
}

/**
 * Splits a failed create/update call into errors shown under form fields and a remainder that
 * still needs the toast. E-VAL-001 wording is built from `details[].code` (`details[].message`
 * is English debug text); E-APP-002/005 show the server's `userMessage` under 適用開始日時, and
 * E-APP-004 follows its `details.violations` (see `chainViolationErrors`).
 */
export function toAppVersionServerErrors(error: unknown): AppVersionServerErrors {
  const code = getApiErrorCode(error);
  const codeField = code ? CODE_TO_FIELD[code] : undefined;
  if (codeField) {
    return {
      fieldErrors: [{ name: codeField, message: resolveApiErrorMessage(error) }],
      hasUnmappedError: false,
    };
  }

  const rawDetails =
    typeof error === 'object' && error !== null
      ? (error as { details?: unknown }).details
      : undefined;
  const violations = chainViolationsOf(rawDetails);
  if (violations) return chainViolationErrors(error, violations);

  const details = validationDetailsOf(error);
  const fieldErrors: AppVersionFieldError[] = [];
  let hasUnmappedError = details.length === 0;

  for (const detail of details) {
    const target = API_FIELD_TO_FORM[detail.field as keyof CreateAppVersionDto];
    if (!target) {
      hasUnmappedError = true;
      continue;
    }
    if (fieldErrors.some((fieldError) => fieldError.name === target.name)) continue;
    fieldErrors.push({
      name: target.name,
      message: validationDetailMessage(target.label, detail.code),
    });
  }

  return { fieldErrors, hasUnmappedError };
}
