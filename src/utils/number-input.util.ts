import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react';

/**
 * `<input type="number">` accepts `e` / `+` (so `1e3` reads as 1000). Amounts and counts are
 * plain integers, so those characters are refused at the keyboard and on paste.
 * The key check matches the whole `event.key`: a substring test would also swallow named keys
 * that merely contain an `e` (`Backspace`, `Delete`, `ArrowLeft`, `Home`, `End`, `Enter`, …).
 */
const EXPONENT_CHARS = /[eE+]/;
const EXPONENT_KEY = /^[eE+]$/;

const blockInput = (key: RegExp, chars: RegExp) => ({
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
    if (key.test(event.key)) event.preventDefault();
  },
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
    if (chars.test(event.clipboardData.getData('text'))) event.preventDefault();
  },
});

export const blockExponentInput = blockInput(EXPONENT_KEY, EXPONENT_CHARS);

/**
 * Text the browser cannot parse as a number (`1-2`, or `1+2` typed through an IME, which
 * `blockExponentInput` never sees) comes back as `value === ''` with `validity.badInput` set.
 * Reading that as blank would let it pass the optional fields, so it becomes `NaN` and the
 * schema rejects it; a truly empty input is still `null`.
 */
const readNumberInput = (input: HTMLInputElement): number | null => {
  if (input.validity.badInput) return Number.NaN;
  return input.value === '' ? null : Number(input.value);
};

/**
 * Change handlers for a controlled number input. `onInput` is needed as well as `onChange`:
 * typing unparseable text into an empty input leaves `value` at '', so React drops the change
 * event and the field would keep reading as blank.
 */
export const numberInputHandlers = (onChange: (value: number | null) => void) => {
  const handle = (event: FormEvent<HTMLInputElement>) =>
    onChange(readNumberInput(event.currentTarget));
  return { onChange: handle, onInput: handle };
};

/** Controlled value for a number input. `NaN` renders as '' so React keeps the typed text on screen. */
export const numberInputValue = (value: number | null | undefined): number | '' =>
  value == null || Number.isNaN(value) ? '' : value;

/**
 * Full-width digits, hyphen and plus → half-width, so a number typed with the IME still in
 * Japanese input mode (`０９０…`, `＋８４…`) is kept rather than dropped by a digits-only filter.
 */
export const toHalfWidthDigits = (value: string) =>
  value.replace(/[０-９－＋]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));

/**
 * Text for a whole-number field (人数 etc.), or `null` when the text must be refused.
 * Full-width digits from the IME become half-width (`１２` → `12`); anything else that is not a
 * digit — `-` `.` `e` `+`, full-width `．` `－`, letters, spaces — refuses the WHOLE change, so the
 * field keeps what it had instead of showing `9.88` or `-5`.
 * A number past `Number.MAX_SAFE_INTEGER` (16+ digits) is refused too: the value round-trips
 * through a number, so it would be rounded, and from 22 digits shown as `1e+21`, which a
 * Backspace turns into `1e+2` — text this filter refuses, so the field would be stuck.
 */
export const toWholeNumberText = (raw: string): string | null => {
  const text = toHalfWidthDigits(raw);
  if (!/^\d*$/.test(text)) return null;
  return text === '' || Number.isSafeInteger(Number(text)) ? text : null;
};
