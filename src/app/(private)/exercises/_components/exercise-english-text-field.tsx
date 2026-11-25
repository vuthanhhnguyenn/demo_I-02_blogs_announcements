'use client';

import { useFormContext, useWatch } from 'react-hook-form';

// TODO(round3) R304 — icons and controls of the machine-translation states below.
// import { AlertCircle, Loader2 } from 'lucide-react';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  getExerciseEnPath,
  // TODO(round3) R304
  // getExerciseJaPath,
  // isExerciseTranslationStale,
  useExerciseTranslationContext,
} from '../_hooks/use-exercise-translation';
import type { ExerciseFormInput } from '../_schemas/exercise-form.schema';
import type { ExerciseTranslatableField } from '../_utils/exercise-translation.util';

/** Phase 1 (PO 2026-10-20): staff type the English by hand — no machine translation. */
const EN_PLACEHOLDER = '英語で入力（任意）';

type ExerciseEnglishTextFieldProps = {
  field: ExerciseTranslatableField;
  label: string;
  multiline?: boolean;
  /** Help line under the input (name only, as the prototype). */
  helpText?: { filled: string; empty: string };
};

/**
 * FR-014 EN block under a JP field — an always-editable input.
 *
 * TODO(round3) R304 — machine translation is phase 2 (PO 2026-10-20, BE_REQUEST No.11): the
 * 要再翻訳 badge, 「再翻訳する」, the 翻訳中 state and the failure line are commented out below.
 */
export function ExerciseEnglishTextField({
  field,
  label,
  multiline = false,
  helpText,
}: Readonly<ExerciseEnglishTextFieldProps>) {
  const form = useFormContext<ExerciseFormInput>();
  const translation = useExerciseTranslationContext();
  const en = useWatch({ control: form.control, name: getExerciseEnPath(field) }) ?? '';
  // TODO(round3) R304
  // const ja = useWatch({ control: form.control, name: getExerciseJaPath(field) }) ?? '';
  // const meta = useWatch({ control: form.control, name: `translation.${field}` });
  // const status = translation.statuses[field];
  // const isStale = isExerciseTranslationStale(ja, en, meta);

  return (
    <div className="border-muted mt-2 border-l-2 pl-4">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        {/* TODO(round3) R304 — 要再翻訳 badge + 「再翻訳する」.
        {isStale && !status ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px] focus-visible:outline-none"
              onClick={() => translation.requestRetranslate(field)}
            >
              <Badge
                variant="outline"
                className="border-warning/40 bg-warning/15 text-warning hover:bg-warning/25 cursor-pointer"
              >
                要再翻訳
              </Badge>
            </button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => translation.requestRetranslate(field)}
            >
              再翻訳する
            </Button>
          </div>
        ) : null} */}
      </div>
      <FormField
        control={form.control}
        name={getExerciseEnPath(field)}
        render={({ field: input }) => (
          <FormItem>
            <FormControl>
              {multiline ? (
                <Textarea
                  {...input}
                  value={input.value ?? ''}
                  rows={2}
                  placeholder={EN_PLACEHOLDER}
                  className="min-h-[56px] resize-none text-xs leading-relaxed"
                  onChange={(event) => {
                    input.onChange(event);
                    // Hand-written text is never listed in `machineTranslatedFields`.
                    translation.markEdited(field);
                  }}
                />
              ) : (
                <Input
                  {...input}
                  value={input.value ?? ''}
                  placeholder={EN_PLACEHOLDER}
                  className="h-8"
                  onChange={(event) => {
                    input.onChange(event);
                    translation.markEdited(field);
                  }}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {helpText ? (
        <p className="text-muted-foreground mt-1 text-xs">
          {en ? helpText.filled : helpText.empty}
        </p>
      ) : null}
      {/* TODO(round3) R304 — 翻訳中 / failure line with 「再翻訳」.
      {status === 'translating' ? (
        <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
          <Loader2 className="size-4 animate-spin" /> 翻訳中...
        </p>
      ) : status === 'failed' ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-destructive flex items-center gap-2 text-xs">
            <AlertCircle className="size-4 shrink-0" />
            英語版を生成できませんでした。日本語のみで保存できます。
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => translation.retry(field)}
          >
            再翻訳
          </Button>
        </div>
      ) : null} */}
    </div>
  );
}
