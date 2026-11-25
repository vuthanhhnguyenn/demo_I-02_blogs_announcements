'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { type SurveyFormValues, createEmptySurveyQuestion } from '../_schemas/survey-form.schema';
import { SurveyQuestionRow } from './survey-form-question-row';

interface SurveyFormQuestionsSectionProps {
  onDeleteQuestion: (index: number) => void;
}

export function SurveyFormQuestionsSection({
  onDeleteQuestion,
}: Readonly<SurveyFormQuestionsSectionProps>) {
  const form = useFormContext<SurveyFormValues>();
  const { fields, append, move } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  const questionsError = form.formState.errors.questions;
  const questionsErrorMessage = questionsError?.message ?? questionsError?.root?.message;

  const handleAddQuestion = () => {
    append(createEmptySurveyQuestion(`q-${crypto.randomUUID()}`));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">設問設定</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <SurveyQuestionRow
              key={field.id}
              index={index}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onDelete={() => onDeleteQuestion(index)}
            />
          ))}
          {questionsErrorMessage && (
            <div aria-invalid>
              <p className="text-destructive text-xs">{questionsErrorMessage}</p>
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
            <Plus className="size-4" />
            設問を追加
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
