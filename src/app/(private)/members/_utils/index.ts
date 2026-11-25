import { PREFECTURES } from '@/constants/app.constants';
import { toHalfWidthDigits } from '@/utils/number-input.util';

export const normalizePostalCode = (value?: string) => trimOrUndefined(value)?.replace(/\D/g, '');

/**
 * Whatever the operator typed → the 〒 display form the 郵便番号 input holds (`150-0001`).
 *
 * Only digits survive — full-width ones are folded to half-width first — and the hyphen is
 * re-inserted after the third, so the operator types numbers and the field renders the separator
 * itself, the way the mobile app does. The hyphen is stripped again on save (`normalizePostalCode`).
 *
 * No digit is ever dropped: more than the 7 a JP postal code has is kept whole so the form schema
 * flags it, instead of being cut down to a different, valid-looking code that would then be saved.
 */
export const formatPostalCode = (value: string) => {
  const digits = toHalfWidthDigits(value).replace(/\D/g, '');
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
};

/**
 * A stored postal code → what the 郵便番号 input shows on prefill.
 *
 * The endpoint stores 7 bare digits, so the hyphen is added back for display. Anything else is
 * handed over untouched: reshaping a malformed stored value would hide bad data behind a
 * valid-looking field instead of letting the form's own validation flag it.
 */
export const postalCodeForDisplay = (value?: string | null) => {
  const trimmed = trimOrUndefined(value ?? undefined);
  if (!trimmed) return '';
  return /^\d{7}$/.test(trimmed) ? formatPostalCode(trimmed) : trimmed;
};

/**
 * Any phone the form holds → the form the member endpoints take: JP domestic digits
 * (`09012345678`) or E.164 (`+84901234567`). The separators are dropped and a leading `+` kept;
 * the endpoint converts a domestic number to `+81…` itself (API-093 §18.3 v0.14).
 */
export const toApiPhone = (value?: string) => {
  const trimmed = trimOrUndefined(value);
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, '');
  return trimOrUndefined(trimmed.startsWith('+') ? `+${digits}` : digits);
};

/**
 * `prefecture` as stored → the JIS X 0401 code the 都道府県 select holds (`'13'`).
 *
 * There is no prefecture-master endpoint: the endpoint takes a 2-digit JIS code and the frontend
 * owns the code/name table, so `PREFECTURES` — which is already in JIS order — doubles as that
 * table (code = 1-based index). Rows seeded before the switch still hold the 都道府県名 itself,
 * so a name is resolved back to its code instead of leaving the select blank.
 */
export const prefectureCodeFromStored = (value?: string | null) => {
  const trimmed = trimOrUndefined(value ?? undefined);
  if (!trimmed) return '';

  if (/^\d{1,2}$/.test(trimmed)) {
    const code = Number(trimmed);
    return code >= 1 && code <= PREFECTURES.length ? String(code).padStart(2, '0') : '';
  }

  const index = PREFECTURES.indexOf(trimmed);
  return index < 0 ? '' : String(index + 1).padStart(2, '0');
};

export const trimOrUndefined = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const getTenureLabel = (joinedAt?: string): string => {
  if (!joinedAt) {
    return '—';
  }

  const joinedDate = new Date(joinedAt);
  if (Number.isNaN(joinedDate.getTime())) {
    return '—';
  }

  const now = new Date();
  const totalMonths =
    (now.getFullYear() - joinedDate.getFullYear()) * 12 + (now.getMonth() - joinedDate.getMonth());

  if (totalMonths < 0) {
    return '—';
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) {
    return `${months}ヶ月`;
  }

  return `${years}年${months}ヶ月`;
};
