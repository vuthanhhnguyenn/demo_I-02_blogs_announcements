import { TEXTAREA_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/constants/app.constants';
import {
  isJapaneseCorporateNumber,
  isJapanesePhoneNumber,
  japaneseCorporateNumberMessage,
  japanesePhoneMessage,
} from '@/utils/validation.util';
import { z } from 'zod';

import {
  FC_AUTH_PROVIDER_VALUES,
  MANAGEMENT_TYPE_SELECTABLE_VALUES,
} from '../_constants/constants';

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
/** Plain decimal only — no exponent (`1e2`), `+` or leading dot; `-` is kept so 0以上 can name it */
export const ROYALTY_RATE_REGEX = /^-?\d+(\.\d+)?$/;
const PERSON_NAME_MAX_LENGTH = 100;
const ADDRESS_MAX_LENGTH = 500;
const EMAIL_MAX_LENGTH = 254;

export const RENEWAL_BEFORE_START_MESSAGE =
  'FC契約更新日はFC契約開始日以降の日付を指定してください';

const optionalText = (label: string, max: number) =>
  z.string().max(max, `${label}は${max}文字以内で入力してください。`).default('');

/** JP phone shape (digits + hyphens) — a subset of API-075's `^[0-9-]{1,20}$` */
const optionalPhone = (label: string) =>
  z
    .string()
    .default('')
    .refine((value) => value.trim() === '' || isJapanesePhoneNumber(value.trim()), {
      message: japanesePhoneMessage(label),
    });

const optionalDate = (label: string) =>
  z
    .string()
    .default('')
    .refine((value) => value === '' || DATE_VALUE_REGEX.test(value), {
      message: `${label}はYYYY-MM-DD形式で入力してください`,
    });

/** Keys = the real API's camelCase names (decision D2), so the body builder is a copy. */
export const franchiseCompanyFormSchema = z
  .object({
    legalName: z
      .string()
      .trim()
      .min(1, '法人名（正式名称）を入力してください')
      .max(TEXT_MAX_LENGTH, `法人名（正式名称）は${TEXT_MAX_LENGTH}文字以内で入力してください。`),
    displayName: optionalText('法人名（表示名）', TEXT_MAX_LENGTH),
    managementType: z.enum(MANAGEMENT_TYPE_SELECTABLE_VALUES, {
      error: '直営/FC区分を選択してください',
    }),
    // Y-03 FR-002: 認証方式（セレクト・必須）
    authProvider: z.enum(FC_AUTH_PROVIDER_VALUES, { error: '認証方式を選択してください' }),
    corporateNumber: z
      .string()
      .default('')
      .refine((value) => value.trim() === '' || isJapaneseCorporateNumber(value.trim()), {
        message: japaneseCorporateNumberMessage('法人番号'),
      }),
    representativeName: optionalText('代表者名', PERSON_NAME_MAX_LENGTH),
    headOfficeAddress: optionalText('本社所在地', ADDRESS_MAX_LENGTH),
    phone: optionalPhone('電話番号'),
    contactPersonName: optionalText('担当者名', PERSON_NAME_MAX_LENGTH),
    // Y-03 FR-002 v4: 担当者連絡先はメール / 電話の2項目（両方任意）
    contactPersonEmail: z
      .string()
      .max(
        EMAIL_MAX_LENGTH,
        `担当者メールアドレスは${EMAIL_MAX_LENGTH}文字以内で入力してください。`,
      )
      .default('')
      .refine((value) => value.trim() === '' || z.email().safeParse(value.trim()).success, {
        message: '担当者メールアドレスの形式が正しくありません',
      }),
    contactPersonPhone: optionalPhone('担当者電話番号'),
    fcContractStartDate: optionalDate('FC契約開始日'),
    fcContractRenewalDate: optionalDate('FC契約更新日'),
    // Raw strings are parsed here (not by z.coerce) so exponent / signed notation such as `1e2`
    // — which <input type="number"> accepts — is rejected instead of being saved as 100
    royaltyRate: z.preprocess(
      (value) => {
        if (value === '' || value === null) return undefined;
        if (typeof value !== 'string') return value;
        return ROYALTY_RATE_REGEX.test(value) ? Number(value) : Number.NaN;
      },
      z
        .number({ error: 'ロイヤリティ率は数値で入力してください' })
        .min(0, 'ロイヤリティ率は0以上で入力してください')
        .max(100, 'ロイヤリティ率は100以下で入力してください')
        .optional(),
    ),
    note: optionalText('備考', TEXTAREA_MAX_LENGTH),
  })
  .refine(
    // Y-03 FR-002 v4: FC契約更新日（次回更新予定日）は開始日以降に限定（BE は検証しない）
    (value) =>
      !value.fcContractStartDate ||
      !value.fcContractRenewalDate ||
      value.fcContractRenewalDate >= value.fcContractStartDate,
    {
      path: ['fcContractRenewalDate'],
      message: RENEWAL_BEFORE_START_MESSAGE,
      // Zod skips object-level checks once a field aborts (e.g. an unselected 区分), which hid this
      // error behind the required ones. Both dates are all it reads, so run it whenever they are valid.
      when: ({ value }) => {
        const { fcContractStartDate, fcContractRenewalDate } = (value ?? {}) as Record<
          string,
          unknown
        >;
        return [fcContractStartDate, fcContractRenewalDate].every(
          (date) => typeof date === 'string' && (date === '' || DATE_VALUE_REGEX.test(date)),
        );
      },
    },
  );

export type FranchiseCompanyFormValues = z.input<typeof franchiseCompanyFormSchema>;
export type FranchiseCompanyFormSubmitValues = z.output<typeof franchiseCompanyFormSchema>;

export const FRANCHISE_COMPANY_FORM_EMPTY_VALUES: FranchiseCompanyFormValues = {
  legalName: '',
  displayName: '',
  managementType: undefined as unknown as FranchiseCompanyFormValues['managementType'],
  authProvider: undefined as unknown as FranchiseCompanyFormValues['authProvider'],
  corporateNumber: '',
  representativeName: '',
  headOfficeAddress: '',
  phone: '',
  contactPersonName: '',
  contactPersonEmail: '',
  contactPersonPhone: '',
  fcContractStartDate: '',
  fcContractRenewalDate: '',
  royaltyRate: undefined,
  note: '',
};
