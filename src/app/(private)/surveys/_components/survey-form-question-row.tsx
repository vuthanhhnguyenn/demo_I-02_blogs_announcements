'use client';

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { SURVEY_REAL_QUESTION_FORMAT_LABELS } from '../_constants/constants';
import {
  SURVEY_QUESTION_FORMAT_VALUES,
  SURVEY_RATING_FORMAT,
  type SurveyFormValues,
} from '../_schemas/survey-form.schema';

interface SurveyQuestionRowProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function makeChoiceId(questionId: string) {
  return `${questionId}-choice-${crypto.randomUUID()}`;
}

export function SurveyQuestionRow({
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Readonly<SurveyQuestionRowProps>) {
  const form = useFormContext<SurveyFormValues>();
  const question = useWatch({ control: form.control, name: `questions.${index}` });
  const questionErrors = form.formState.errors.questions?.[index];

  const {
    fields: choiceFields,
    append: appendChoice,
    remove: removeChoice,
    move: moveChoice,
  } = useFieldArray({
    control: form.control,
    name: `questions.${index}.choices` as const,
  });

  const choicesErrors = questionErrors?.choices;
  const choiceListError = choicesErrors?.root?.message ?? choicesErrors?.message;

  const format = question?.format;
  const isChoice = format === 'single_choice' || format === 'multiple_choice';
  const isRating = format === SURVEY_RATING_FORMAT;
  const questionId = question?.id ?? `q-${index}`;

  const handleFormatChange = (value: SurveyFormValues['questions'][number]['format'] | null) => {
    if (!value) return;
    form.setValue(`questions.${index}.format`, value, { shouldDirty: true, shouldValidate: true });
    // Switching to a choice format starts with one blank choice row.
    if (value !== 'free_text' && choiceFields.length === 0) {
      appendChoice({ id: makeChoiceId(questionId), text: '' });
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground w-6 shrink-0 text-xs">{index + 1}</span>
        <div className="flex-1">
          <Input
            placeholder="設問内容を入力"
            aria-invalid={!!questionErrors?.content}
            {...form.register(`questions.${index}.content` as const)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={isFirst}
            aria-label="設問を上へ移動"
            onClick={onMoveUp}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={isLast}
            aria-label="設問を下へ移動"
            onClick={onMoveDown}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-8"
            aria-label="設問を削除"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {questionErrors?.content && (
        <p className="text-destructive mt-1 ml-9 text-xs">{questionErrors.content.message}</p>
      )}

      <div className="mt-3 flex items-center gap-4">
        <div className="w-48">
          {/* A stored rating question keeps its format: the form cannot create or convert to it. */}
          <Select value={format} onValueChange={handleFormatChange} disabled={isRating}>
            <SelectTrigger className="w-full" aria-invalid={!!questionErrors?.format}>
              <SelectValue>
                {format ? SURVEY_REAL_QUESTION_FORMAT_LABELS[format] : '選択'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SURVEY_QUESTION_FORMAT_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {SURVEY_REAL_QUESTION_FORMAT_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={question?.required ?? false}
            onCheckedChange={(checked) =>
              form.setValue(`questions.${index}.required`, checked, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <span
            className={`text-xs ${question?.required ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
          >
            {question?.required ? '必答' : '任意'}
          </span>
        </div>
      </div>
      {questionErrors?.format && (
        <p className="text-destructive mt-1 text-xs">{questionErrors.format.message}</p>
      )}

      {isChoice && (
        <div className="mt-4 space-y-2 border-t pt-4">
          {choiceFields.map((choice, choiceIndex) => (
            <div key={choice.id}>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-5 shrink-0 text-xs">
                  {choiceIndex + 1}
                </span>
                <Input
                  className="h-8 flex-1"
                  placeholder="選択肢テキストを入力"
                  aria-invalid={!!questionErrors?.choices?.[choiceIndex]?.text}
                  {...form.register(`questions.${index}.choices.${choiceIndex}.text` as const)}
                />
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={choiceIndex === 0}
                    aria-label={`選択肢${choiceIndex + 1}を上へ移動`}
                    onClick={() => moveChoice(choiceIndex, choiceIndex - 1)}
                  >
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={choiceIndex === choiceFields.length - 1}
                    aria-label={`選択肢${choiceIndex + 1}を下へ移動`}
                    onClick={() => moveChoice(choiceIndex, choiceIndex + 1)}
                  >
                    <ArrowDown className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive size-7"
                    aria-label={`選択肢${choiceIndex + 1}を削除`}
                    onClick={() => removeChoice(choiceIndex)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
              {questionErrors?.choices?.[choiceIndex]?.text && (
                <p className="text-destructive mt-1 ml-7 text-xs">
                  {questionErrors.choices[choiceIndex]?.text?.message}
                </p>
              )}
            </div>
          ))}
          {choiceListError && (
            // `aria-invalid` so the submit scroll reaches the block; the resolver reports a
            // field-array error under `.root` on submit and on the array itself while typing.
            <div aria-invalid tabIndex={-1} className="outline-none">
              <p className="text-destructive text-xs">{choiceListError}</p>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 h-8 text-xs"
            onClick={() => appendChoice({ id: makeChoiceId(questionId), text: '' })}
          >
            <Plus className="size-3" />
            選択肢を追加
          </Button>
        </div>
      )}
    </div>
  );
}
