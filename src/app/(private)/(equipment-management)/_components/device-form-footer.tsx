'use client';

import { type FieldErrors, type FieldValues, useFormContext, useFormState } from 'react-hook-form';

import { Button } from '@/components/ui/button';

const MISSING_FIELDS_MESSAGE = '未入力の項目があります';
const INVALID_FIELDS_MESSAGE = '入力内容に不備があります。エラー表示の項目をご確認ください。';

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Dot paths of every leaf error, so a nested field's emptiness can be read back off the form. */
function collectErrorPaths(errors: FieldErrors, prefix = ''): string[] {
  return Object.entries(errors).flatMap(([key, error]) => {
    if (!error || typeof error !== 'object') return [];
    const path = prefix ? `${prefix}.${key}` : key;
    if ('message' in error || 'type' in error) return [path];
    return collectErrorPaths(error as FieldErrors, path);
  });
}

/**
 * The form footer shared by the equipment and controller create / edit pages: the summary line
 * plus キャンセル and the submit button.
 *
 * Sticky inside the scrolling `<main>` rather than `fixed` to the viewport, so it spans the content
 * column only and never runs under the sidebar (BUG-E02-C-04 / F-01).
 *
 * The summary names the kind of failure (BUG-E02-C-06 / F-02): 「未入力の項目があります」 only
 * while a field in error is actually empty; a format or server rejection gets the prototype's
 * generic line instead.
 */
export function DeviceFormFooter({
  submitLabel,
  pendingLabel,
  isPending,
  submitDisabled = false,
  onCancel,
  onSubmit,
}: Readonly<{
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  submitDisabled?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}>) {
  const { control, getValues } = useFormContext<FieldValues>();
  const { isSubmitted, errors } = useFormState({ control });

  const errorPaths = collectErrorPaths(errors);
  const summary =
    !isSubmitted || errorPaths.length === 0
      ? null
      : errorPaths.some((path) => isEmptyValue(getValues(path)))
        ? MISSING_FIELDS_MESSAGE
        : INVALID_FIELDS_MESSAGE;

  return (
    <div className="bg-background/95 sticky bottom-0 z-10 border-t px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-[960px] items-center justify-end gap-2">
        {summary ? <p className="text-destructive mr-auto text-xs">{summary}</p> : null}
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="button" size="lg" disabled={submitDisabled || isPending} onClick={onSubmit}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
