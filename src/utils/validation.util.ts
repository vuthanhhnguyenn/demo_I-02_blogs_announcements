/**
 * Japanese domestic phone number: 10–11 digits starting with `0`, accepted either
 * unbroken (`0920000000`, `09012345678`) or hyphenated in the usual area-code
 * groupings (`092-000-0000`, `03-1234-5678`, `0120-000-000`).
 *
 * The shape check bounds where hyphens may appear; the digit check bounds how many
 * digits there are, which the shape alone cannot express.
 */
const JP_PHONE_SHAPE_REGEX = /^0\d{0,3}-?\d{1,4}-?\d{3,4}$/;
const JP_PHONE_DIGITS_REGEX = /^0\d{9,10}$/;

/** Placeholder-style hint reused in validation messages. */
export const JP_PHONE_FORMAT_HINT = '例: 092-000-0000';

export function isJapanesePhoneNumber(value: string): boolean {
  return JP_PHONE_SHAPE_REGEX.test(value) && JP_PHONE_DIGITS_REGEX.test(value.replaceAll('-', ''));
}

/**
 * Validation message for a phone field, e.g. `電話番号は…`. Pass the field's own placeholder
 * as `example` so the message and the placeholder show the same grouping.
 */
export function japanesePhoneMessage(
  label: string,
  example: string = JP_PHONE_FORMAT_HINT,
): string {
  return `${label}は日本国内の電話番号形式（${example}）で入力してください`;
}

/** Japanese postal code: 7 digits, with or without the hyphen after the third (`160-0022`). */
const JP_POSTAL_CODE_REGEX = /^\d{3}-?\d{4}$/;

export function isJapanesePostalCode(value: string): boolean {
  return JP_POSTAL_CODE_REGEX.test(value);
}

/** Validation message for a postal-code field, e.g. `郵便番号は…`. */
export function japanesePostalCodeMessage(label: string): string {
  return `${label}は7桁（ハイフンあり/なし）で入力してください`;
}

/** Validation message for a length-capped text field, e.g. `店舗名は255文字以内で入力してください`. */
export function maxLengthMessage(label: string, max: number): string {
  return `${label}は${max}文字以内で入力してください`;
}

/** Japan's corporate number (法人番号): exactly 13 half-width digits. */
const JP_CORPORATE_NUMBER_REGEX = /^\d{13}$/;

export function isJapaneseCorporateNumber(value: string): boolean {
  return JP_CORPORATE_NUMBER_REGEX.test(value);
}

/** Validation message for a corporate-number field, e.g. `法人番号は…`. */
export function japaneseCorporateNumberMessage(label: string): string {
  return `${label}は半角数字13桁で入力してください`;
}
