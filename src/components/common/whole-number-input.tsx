'use client';

import { type ChangeEvent, type ComponentProps, type CompositionEvent, useState } from 'react';

import { toWholeNumberText } from '@/utils/number-input.util';

import { Input } from '@/components/ui/input';

type WholeNumberInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'inputMode'
> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
};

/**
 * A whole-number field that only ever holds half-width digits.
 *
 * `<input type="number">` with a key filter lets text through when it does not come from a plain
 * key press: an IME commit (`９．８８` → `9.88`, `－５` → `-5`) or a browser-dropped word (`abc`
 * → blank → 「必須です」). This is a text input instead, and every change — typed, pasted or
 * committed by the IME — is checked as a whole: digits (full-width ones converted) are kept,
 * anything else is refused and the field keeps its previous value.
 * While the IME is composing, the raw text is shown so the candidate window works; it is checked
 * when the composition ends.
 */
export function WholeNumberInput({
  value,
  onChange,
  onCompositionEnd,
  ...props
}: WholeNumberInputProps) {
  const [composing, setComposing] = useState<string | null>(null);
  const shown = value == null || Number.isNaN(value) ? '' : String(value);

  const commit = (raw: string) => {
    setComposing(null);
    const text = toWholeNumberText(raw);
    if (text == null) return;
    onChange(text === '' ? null : Number(text));
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={composing ?? shown}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        if ((event.nativeEvent as InputEvent).isComposing) {
          setComposing(event.target.value);
          return;
        }
        commit(event.target.value);
      }}
      onCompositionEnd={(event: CompositionEvent<HTMLInputElement>) => {
        commit(event.currentTarget.value);
        onCompositionEnd?.(event);
      }}
    />
  );
}
