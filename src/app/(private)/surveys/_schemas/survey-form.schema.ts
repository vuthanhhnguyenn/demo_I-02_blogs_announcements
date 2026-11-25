import { z } from 'zod';

import type { BrandEnumValue } from '@/components/common/brand-badge';

import type {
  CreateQuestionnaireDto,
  QuestionnaireDetailDto,
  SaveQuestionnaireDto,
} from '@/lib/api-real/types.gen';

import { SURVEY_RESPONSE_CATEGORIES } from '../_constants/constants';
import {
  getSurveyBrandEnumsOfGroup,
  getSurveyBrandGroupOfEnums,
} from '../_constants/survey-brand-group';

/** Formats the form lets an operator pick (create and edit). */
export const SURVEY_QUESTION_FORMAT_VALUES = [
  'single_choice',
  'multiple_choice',
  'free_text',
] as const;

/**
 * `rating` (FR-S002 ④, Phase 2) is not offered by the form, but a survey can already hold such a
 * question (created through the API): the edit form must load and save it unchanged.
 */
export const SURVEY_RATING_FORMAT = 'rating' as const;

/** Server limits (`name` / question `text` / choice `text`); a longer value is a 400 E-VAL-001. */
export const SURVEY_NAME_MAX_LENGTH = 200;
export const SURVEY_QUESTION_TEXT_MAX_LENGTH = 1000;
export const SURVEY_CHOICE_TEXT_MAX_LENGTH = 500;
/** Server limits (`questions` / a question's `choices` `maxItems`); more is a 400 E-VAL-001. */
export const SURVEY_QUESTIONS_MAX_COUNT = 100;
export const SURVEY_CHOICES_MAX_COUNT = 50;

export const surveyQuestionChoiceFormSchema = z.object({
  id: z.string(),
  /** Server id of an existing choice; absent for a choice added in this form. */
  choiceId: z.string().optional(),
  // Required only for a choice format (see `superRefine` below): a free-text question keeps the
  // blank starter row hidden, which must not block the save.
  text: z
    .string()
    .trim()
    .max(
      SURVEY_CHOICE_TEXT_MAX_LENGTH,
      `選択肢テキストは${SURVEY_CHOICE_TEXT_MAX_LENGTH}文字以内で入力してください`,
    ),
});

export const surveyQuestionFormSchema = z.object({
  id: z.string(),
  /** Server id of an existing question; absent for a question added in this form. */
  questionId: z.string().optional(),
  content: z
    .string()
    .trim()
    .min(1, '設問内容を入力してください')
    .max(
      SURVEY_QUESTION_TEXT_MAX_LENGTH,
      `設問内容は${SURVEY_QUESTION_TEXT_MAX_LENGTH}文字以内で入力してください`,
    ),
  format: z.enum([...SURVEY_QUESTION_FORMAT_VALUES, SURVEY_RATING_FORMAT], {
    error: '回答形式を選択してください',
  }),
  required: z.boolean(),
  hasResponses: z.boolean(),
  choices: z
    .array(surveyQuestionChoiceFormSchema)
    .max(SURVEY_CHOICES_MAX_COUNT, `選択肢は${SURVEY_CHOICES_MAX_COUNT}件以内で入力してください`),
});

export const surveyFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'アンケート名を入力してください')
      .max(
        SURVEY_NAME_MAX_LENGTH,
        `アンケート名は${SURVEY_NAME_MAX_LENGTH}文字以内で入力してください`,
      ),
    // The form picks one brand GROUP (JOYFIT / FIT365) and the API stores its sub-brands: JOYFIT = all four
    // JOYFIT sub-brands. An edit keeps any other stored set (legacy / mixed) until the operator picks a group.
    brandEnums: z.array(z.custom<BrandEnumValue>()).min(1, 'ブランドを選択してください'),
    type: z.enum(SURVEY_RESPONSE_CATEGORIES),
    trigger: z
      .string({ error: '発動トリガーを選択してください' })
      .min(1, '発動トリガーを選択してください'),
    status: z.enum(['active', 'inactive']),
    questions: z
      .array(surveyQuestionFormSchema)
      .min(1, '設問を1件以上追加してください')
      .max(
        SURVEY_QUESTIONS_MAX_COUNT,
        `設問は${SURVEY_QUESTIONS_MAX_COUNT}件以内で入力してください`,
      ),
  })
  .superRefine((value, ctx) => {
    value.questions.forEach((question, index) => {
      if (!question.format || question.format === 'free_text' || question.format === 'rating')
        return;
      if (question.choices.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', index, 'choices'],
          message: '選択肢を1件以上追加してください',
        });
        return;
      }
      question.choices.forEach((choice, choiceIndex) => {
        if (choice.text.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['questions', index, 'choices', choiceIndex, 'text'],
            message: '選択肢テキストを入力してください',
          });
        }
      });
    });
  });

export type SurveyFormValues = z.infer<typeof surveyFormSchema>;
export type SurveyQuestionFormValues = z.infer<typeof surveyQuestionFormSchema>;
export type SurveyQuestionChoiceFormValues = z.infer<typeof surveyQuestionChoiceFormSchema>;

export type SurveyFormSubmitValues = SurveyFormValues;

export function createEmptySurveyQuestion(id: string): SurveyQuestionFormValues {
  return {
    id,
    content: '',
    format: undefined as unknown as SurveyQuestionFormValues['format'],
    required: false,
    hasResponses: false,
    choices: [],
  };
}

export function createEmptySurveyFormValues(): SurveyFormValues {
  return {
    name: '',
    brandEnums: [],
    type: 'lifecycle',
    trigger: undefined as unknown as SurveyFormValues['trigger'],
    status: 'active',
    // The first question starts with one blank choice row (prototype), hidden until a choice format is picked.
    questions: [
      { ...createEmptySurveyQuestion('q-1'), choices: [{ id: 'q-1-choice-1', text: '' }] },
    ],
  };
}

function normalizeBrandEnums(brandEnums: BrandEnumValue[]): BrandEnumValue[] {
  const group = getSurveyBrandGroupOfEnums(brandEnums);
  return group ? getSurveyBrandEnumsOfGroup(group) : brandEnums;
}

export function mapSurveyDetailToFormValues(survey: QuestionnaireDetailDto): SurveyFormValues {
  return {
    name: survey.name,
    // A set that is exactly one group is put in that group's canonical order, so re-picking the group
    // after a change is not seen as a modification; any other stored set is kept as is.
    brandEnums: normalizeBrandEnums(survey.brandEnums as BrandEnumValue[]),
    type: survey.category as SurveyFormValues['type'],
    trigger: survey.triggerCode ?? '',
    status: survey.status as SurveyFormValues['status'],
    questions: [...survey.questions]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((question) => ({
        id: question.questionId,
        questionId: question.questionId,
        content: question.text,
        format: question.format as SurveyQuestionFormValues['format'],
        required: question.required,
        hasResponses: question.hasResponses,
        choices: [...question.choices]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((choice) => ({ id: choice.choiceId, choiceId: choice.choiceId, text: choice.text })),
      })),
  };
}

function choicesOf(question: SurveyQuestionFormValues) {
  // Free-text / rating questions carry no choices (E-QST-007), even if the editor kept some while switching format.
  return question.format === 'free_text' || question.format === 'rating' ? [] : question.choices;
}

export function mapSurveyFormValuesToCreateBody(values: SurveyFormValues): CreateQuestionnaireDto {
  return {
    name: values.name.trim(),
    category: values.type,
    triggerCode: values.trigger,
    brandEnums: values.brandEnums,
    status: values.status,
    questions: values.questions.map((question) => ({
      text: question.content.trim(),
      format: question.format,
      required: question.required,
      choices: choicesOf(question).map((choice) => ({
        text: choice.text.trim(),
      })),
    })),
  };
}

/**
 * Full-form save: the list is the desired end state, so a question/choice left out is dropped by the
 * server (kept as `inactive` when it has answers). `status` is not part of the save — see the edit page.
 * `version` is the one the form was loaded with: a stale one is answered with 409 E-QST-016.
 */
export function mapSurveyFormValuesToSaveBody(
  values: SurveyFormValues,
  version: number,
): SaveQuestionnaireDto {
  return {
    version,
    name: values.name.trim(),
    triggerCode: values.trigger,
    brandEnums: values.brandEnums,
    questions: values.questions.map((question) => ({
      id: question.questionId,
      text: question.content.trim(),
      format: question.format,
      required: question.required,
      choices: choicesOf(question).map((choice) => ({
        id: choice.choiceId,
        text: choice.text.trim(),
      })),
    })),
  };
}
