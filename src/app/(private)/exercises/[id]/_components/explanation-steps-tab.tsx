'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ExerciseDescriptionsDto } from '@/lib/api-real/types.gen';

import {
  EXERCISE_STEP_LABELS,
  EXERCISE_STEP_TRANSLATION_DETAIL_LABEL,
  EXERCISE_VALUE_UNAVAILABLE,
} from '../../_constants/constants';

type ExplanationStepsTabProps = {
  descriptions: ExerciseDescriptionsDto;
};

/** Keeps the line breaks typed in the form and breaks long unbroken tokens inside the card. */
const STEP_TEXT_CLASSES = 'text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere';

export function ExplanationStepsTab({ descriptions }: Readonly<ExplanationStepsTabProps>) {
  const { ja, en } = descriptions;

  return (
    <div className="space-y-4">
      {EXERCISE_STEP_LABELS.map(({ step, label, field }) => {
        const textJa = ja[field];
        // Phase 1: hand-written EN (D25); machine translation is phase 2 (R304).
        const textEn = en?.[field];
        return (
          <Card key={step}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {step}
                </div>
                <CardTitle className="text-base font-semibold">{label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              {textJa ? (
                <p className={STEP_TEXT_CLASSES}>{textJa}</p>
              ) : (
                <p className="text-muted-foreground text-sm">未入力</p>
              )}
              <div className="border-muted border-l-2 pl-4">
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  {EXERCISE_STEP_TRANSLATION_DETAIL_LABEL}
                </p>
                {textEn ? (
                  <p className={STEP_TEXT_CLASSES}>{textEn}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">{EXERCISE_VALUE_UNAVAILABLE}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
