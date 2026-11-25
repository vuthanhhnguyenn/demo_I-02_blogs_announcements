'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

import { EXERCISE_STEP_LABELS, EXERCISE_STEP_TRANSLATION_LABEL } from '../_constants/constants';
import type { ExerciseFormInput } from '../_schemas/exercise-form.schema';
import { ExerciseEnglishTextField } from './exercise-english-text-field';

type ExerciseFormStepsTabProps = {
  hasIncompleteSteps: boolean;
};

export function ExerciseFormStepsTab({ hasIncompleteSteps }: Readonly<ExerciseFormStepsTabProps>) {
  const form = useFormContext<ExerciseFormInput>();
  const publishStatus = useWatch({ control: form.control, name: 'publishStatus' });

  return (
    <div className="mt-4 space-y-6">
      {publishStatus === 'public' && hasIncompleteSteps ? (
        <Alert className="border-warning/50 bg-warning/15">
          <AlertTriangle className="text-warning size-4" />
          <AlertTitle>解説ステップが未入力です</AlertTitle>
          <AlertDescription className="text-xs">
            公開ステータスで保存すると、モバイルアプリ側でステップが表示されません。公開前にステップ0〜4すべての入力を推奨します。
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">解説ステップ</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          {/* TODO(round3) R304 — phase 2 copy: 「英語テキストは保存時に自動翻訳で生成され、手動で編集することもできます。」 */}
          <p className="text-muted-foreground mb-4 text-xs">
            各ステップのテキストを入力してください。英語テキストは必要に応じて入力してください。公開前にステップ0〜4すべての入力を推奨します。
          </p>
          <div className="flex flex-col gap-4">
            {EXERCISE_STEP_LABELS.map(({ step, label, field: stepField }, index) => (
              <div key={step} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                    {step}
                  </div>
                  <p className="text-sm font-semibold">{label}</p>
                </div>
                <FormField
                  control={form.control}
                  name={`explanationSteps.${index}.textJa`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder={`ステップ${step}の内容を入力`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <ExerciseEnglishTextField
                  field={stepField}
                  label={EXERCISE_STEP_TRANSLATION_LABEL}
                  multiline
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
