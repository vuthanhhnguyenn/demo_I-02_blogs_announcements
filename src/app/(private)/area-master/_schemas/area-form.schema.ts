import { z } from 'zod';

import {
  AREA_BRAND_GROUPS,
  AREA_GENDER_CONDITIONS,
  AREA_NAME_MAX_LENGTH,
  AREA_NOTE_MAX_LENGTH,
  type AreaBrandGroup,
  type AreaGenderCondition,
} from '../_constants/area.constants';

/**
 * E-02 FR-016 登録項目, mirroring `CreateAreaDto` / `UpdateAreaDto`: brand group and 性別の条件
 * required (no default — a forgotten 女性のみ area must not be saved as one anyone can enter),
 * name 1–100 after trimming, note up to 1000.
 */
export const areaFormSchema = z.object({
  brandGroup: z.enum(AREA_BRAND_GROUPS, { message: 'ブランドを選択してください' }),
  name: z
    .string()
    .trim()
    .min(1, 'エリア名を入力してください')
    .max(AREA_NAME_MAX_LENGTH, `エリア名は${AREA_NAME_MAX_LENGTH}文字以内で入力してください`),
  genderCondition: z.enum(AREA_GENDER_CONDITIONS, { message: '性別の条件を選択してください' }),
  note: z
    .string()
    .trim()
    .max(AREA_NOTE_MAX_LENGTH, `備考は${AREA_NOTE_MAX_LENGTH}文字以内で入力してください`),
});

export type AreaFormValues = z.infer<typeof areaFormSchema>;

/** The form state before validation: the two choices start unpicked. */
export type AreaFormInput = {
  brandGroup: AreaBrandGroup | undefined;
  name: string;
  genderCondition: AreaGenderCondition | undefined;
  note: string;
};
