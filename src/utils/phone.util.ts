import { toHalfWidthDigits } from '@/utils/number-input.util';

/**
 * Where the separators go, by prefix. JP area codes are 1–4 digits and only the MIC table resolves
 * them exactly, so land lines outside 03 / 06 fall back to the 3-3-4 split that covers the 3-digit
 * codes. The hyphens are display only — the member form strips them again before saving, so a fallback
 * split never changes what is saved. Longer prefixes come first: `0800` must win over `080`.
 */
const PHONE_SPLITS: ReadonlyArray<{
  prefixes: readonly string[];
  split: readonly [number, number];
}> = [
  { prefixes: ['0800'], split: [4, 3] }, // free dial, 11 digits
  { prefixes: ['0120'], split: [4, 3] }, // free dial, 10 digits
  { prefixes: ['050', '070', '080', '090'], split: [3, 4] }, // mobile + IP, 11 digits
  { prefixes: ['03', '06'], split: [2, 4] }, // Tokyo / Osaka, 10 digits
];

/**
 * Whatever the operator typed → the display form the 電話番号 input holds (`090-1234-5678`).
 *
 * Only digits survive — full-width ones are folded to half-width first; the separators are placed
 * from the prefix, so they do not jump around while the number is still being typed.
 * A number typed with a leading `+` is E.164 (`+84901234567`): the `+` is kept and no separators
 * are added.
 *
 * No digit is ever dropped: a number longer than the 11 (domestic) / 15 (E.164) digits allowed is
 * kept whole so the form schema flags it, instead of being cut down to a different, valid-looking
 * number that would then be saved.
 */
export const formatPhone = (value: string) => {
  const halfWidth = toHalfWidthDigits(value).trimStart();
  if (halfWidth.startsWith('+')) return `+${halfWidth.replace(/\D/g, '')}`;

  const digits = halfWidth.replace(/\D/g, '');
  const [first, second] = PHONE_SPLITS.find((entry) =>
    entry.prefixes.some((prefix) => digits.startsWith(prefix)),
  )?.split ?? [3, 3];

  return [digits.slice(0, first), digits.slice(first, first + second), digits.slice(first + second)]
    .filter((group) => group.length > 0)
    .join('-');
};

/**
 * A stored member phone (E.164, API-093 v0.14) → the JP domestic display form (`090-1234-5678`).
 *
 * A `+81` number loses its country code; any other country code is returned as stored (`+84…`).
 * Used by the member form prefill and by the 申込詳細 reveal, where the revealed number must read
 * like the masked one the endpoint builds the same way (`070-****-****`).
 */
export const phoneForDisplay = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  const domestic = trimmed.startsWith('+81') ? `0${trimmed.slice(3)}` : trimmed;
  return /^0\d{9,10}$/.test(domestic) ? formatPhone(domestic) : domestic;
};
