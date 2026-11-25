import { z } from 'zod';

import { TAB_META, type TabKey } from '../_constants/constants';

/** BE limits (`CreateRefBaseDto` / `CreateExplanationMasterDto`): code ≤64, name ≤200, description ≤2000 (D17). */
const CODE_MAX_LENGTH = 64;
const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
/** 表示順 is an int32 column on the BE — larger values fail there with a 500. */
const SORT_ORDER_MAX = 2147483647;

/**
 * BE code rules per master (D23, verified live 2026-10-13):
 * - categories / muscles / exercise types / tags: camelCase, `.` allowed (`stanceWidth.narrow`)
 * - tool types: camelCase without `.` (`training-equipment.schema.ts`)
 * - glossary: UPPER_CASE with `_`
 * An underscore in a camelCase code and a lowercase glossary code are both 400 on the BE.
 */
const CAMEL_CODE = {
  pattern: /^[a-z][a-zA-Z0-9.]*$/,
  message: 'コードは英小文字で始まる半角英数字・ピリオド（例: lowerBody）で入力してください',
};
const CODE_RULES: Record<TabKey, { pattern: RegExp; message: string }> = {
  category: CAMEL_CODE,
  muscle: CAMEL_CODE,
  exercise_type: CAMEL_CODE,
  tag: {
    pattern: CAMEL_CODE.pattern,
    message: 'コードは英小文字で始まる半角英数字・ピリオド（例: gripWidth.wide）で入力してください',
  },
  tool: {
    pattern: /^[a-z][a-zA-Z0-9]*$/,
    message: 'コードは英小文字で始まる半角英数字（例: barbell）で入力してください',
  },
  explanation: {
    pattern: /^[A-Z][A-Z0-9_]*$/,
    message:
      'コードは英大文字で始まる半角英大文字・数字・アンダースコア（例: ROM）で入力してください',
  },
};

export function getExerciseMasterFormSchema(kind: TabKey) {
  const { nameLabel, descriptionRequired } = TAB_META[kind];
  const codeRule = CODE_RULES[kind];
  const description = z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, `説明は${DESCRIPTION_MAX_LENGTH}文字以内で入力してください`);

  return z.object({
    code: z
      .string()
      .trim()
      .min(1, 'コードは必須です')
      .max(CODE_MAX_LENGTH, `コードは${CODE_MAX_LENGTH}文字以内で入力してください`)
      .regex(codeRule.pattern, codeRule.message),
    name: z
      .string()
      .trim()
      .min(1, `${nameLabel}は必須です`)
      .max(NAME_MAX_LENGTH, `${nameLabel}は${NAME_MAX_LENGTH}文字以内で入力してください`),
    description: descriptionRequired ? description.min(1, '説明は必須です') : description,
    sortOrder: z
      .string()
      .trim()
      .min(1, '表示順は必須です')
      .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, {
        message: '表示順は1以上の整数で入力してください',
      })
      .refine((value) => !/^\d+$/.test(value) || Number(value) <= SORT_ORDER_MAX, {
        message: `表示順は${SORT_ORDER_MAX}以下で入力してください`,
      }),
  });
}

type ExerciseMasterFormSchema = ReturnType<typeof getExerciseMasterFormSchema>;
export type ExerciseMasterFormValues = z.input<ExerciseMasterFormSchema>;
export type ExerciseMasterFormSubmitValues = z.output<ExerciseMasterFormSchema>;

export const EMPTY_EXERCISE_MASTER_FORM_VALUES: ExerciseMasterFormValues = {
  code: '',
  name: '',
  description: '',
  sortOrder: '1',
};
