import { PREFECTURES } from '@/constants/app.constants';
import { z } from 'zod';

import type { UpdateMemberProfileAdminDto } from '@/lib/api-real/types.gen';

export const NAME_MAX_LENGTH = 50;

/**
 * 7 digits plus one optional hyphen — the longest value `postalCodeRegex` accepts. A schema cap on
 * the formatted value only: it is not the input's `maxLength`, which would count the 〒 / spaces of
 * a pasted code and cut its last digits.
 */
export const POSTAL_CODE_MAX_LENGTH = 8;

/**
 * `+` and 15 digits — the longest valid E.164 value (JP domestic display is 13). A schema cap on
 * the formatted value only: it is not the input's `maxLength`, which would count the separators of
 * a pasted number and cut its last digits.
 */
export const PHONE_MAX_LENGTH = 16;

/** The endpoint's own caps (`UpdateMemberProfileAdminDto`), tighter than the project default. */
export const EMAIL_MAX_LENGTH = 254;
export const STREET_ADDRESS_MAX_LENGTH = 200;
export const BUILDING_MAX_LENGTH = 100;

/**
 * 性別 as the update endpoint accepts it. Derived from the real DTO so a change to the
 * backend enum breaks this file at compile time instead of at runtime.
 */
type Gender = NonNullable<UpdateMemberProfileAdminDto['gender']>;

const GENDER_VALUES = [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
] as const satisfies ReadonlyArray<Gender>;

/** The endpoint's own `lastNameKana` / `firstNameKana` pattern: katakana, ー, ・ and a space. */
const kanaRegex = /^[ァ-ヶー・\u3000 ]+$/;
const postalCodeRegex = /^\d{3}-?\d{4}$/;
/** The endpoint's `phone` pattern (API-093 §18.3 v0.14): JP domestic, no hyphens, or E.164. */
const phoneShapeRegex = /^0\d{9,10}$|^\+[1-9]\d{1,14}$/;
const phoneDigits = (value: string) =>
  `${value.trim().startsWith('+') ? '+' : ''}${value.replace(/\D/g, '')}`;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `dateOfBirth` must be in the past; flag it inline instead of letting the save 400. */
const isPastDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < new Date().setHours(0, 0, 0, 0);
};

/** Full years of age on today's date; `NaN` for an unparseable value. */
const ageOn = (value: string) => {
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return Number.NaN;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return age;
};

const requiredName = (blankMessage: string) =>
  z
    .string()
    .max(NAME_MAX_LENGTH, '50文字以内で入力してください')
    .refine((value) => value.trim().length > 0, { message: blankMessage });

const requiredKana = (blankMessage: string) =>
  z
    .string()
    .max(NAME_MAX_LENGTH, '50文字以内で入力してください')
    .refine((value) => value.trim().length > 0, { message: blankMessage })
    .refine((value) => value.trim().length === 0 || kanaRegex.test(value.trim()), {
      message: '全角カタカナで入力してください',
    });

/**
 * 都道府県 options for the select: value = the 2-digit JIS X 0401 code the endpoint stores,
 * label = the name. `PREFECTURES` is already in JIS order, so the code is the 1-based index —
 * the frontend owns this table because there is no prefecture-master endpoint.
 */
export const PREFECTURE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = PREFECTURES.map(
  (name, index) => ({
    value: String(index + 1).padStart(2, '0'),
    label: name,
  }),
);

const PREFECTURE_CODES = new Set(PREFECTURE_OPTIONS.map((option) => option.value));

/**
 * The full rule set for a member's personal information. Every field is validated on submit,
 * whoever left it blank or invalid — a stored value that breaks a required or format rule blocks
 * the save just as a freshly typed one would (FR-016, FR-018; PO ruling 2026-09-23). Only the
 * fields the operator actually changed are then sent, which is a payload question, not a
 * validation one (FR-024).
 */
export const createMemberFormSchema = (minAge: number | null) =>
  z.object({
    last_name: requiredName('氏名（姓）を入力してください'),
    first_name: requiredName('氏名（名）を入力してください'),
    last_name_kana: requiredKana('フリガナ（姓）を入力してください'),
    first_name_kana: requiredKana('フリガナ（名）を入力してください'),
    birthday: z
      .string()
      .min(1, '生年月日を入力してください')
      .refine((value) => value.length === 0 || isPastDate(value), {
        message: '生年月日は過去の日付を入力してください',
      })
      .refine((value) => minAge === null || !isPastDate(value) || !(ageOn(value) < minAge), {
        message: `${minAge}歳未満の方はご利用できません`,
      }),
    gender: z.enum(GENDER_VALUES, { message: '性別を選択してください' }),
    postal_code: z
      .string()
      .max(POSTAL_CODE_MAX_LENGTH, '郵便番号の形式が正しくありません')
      .refine((value) => value.trim().length > 0, { message: '郵便番号を入力してください' })
      .refine((value) => value.trim().length === 0 || postalCodeRegex.test(value.trim()), {
        message: '郵便番号の形式が正しくありません',
      }),
    // 住所 is three fields, as the client settled on 2026-08-21: a 都道府県 select holding the
    // JIS code the endpoint stores, plus 市町村・番地 and 建物名 as free text. 郵便番号 / 都道府県 /
    // 市町村・番地 are required; 建物名 is optional — it follows the member app, which made it 任意
    // (client request 11/20; Bug-No1: a member enrolled without 建物名 could not be saved here).
    prefecture: z.string().refine((value) => PREFECTURE_CODES.has(value), {
      message: '都道府県を選択してください',
    }),
    street_address: z
      .string()
      .max(STREET_ADDRESS_MAX_LENGTH, '200文字以内で入力してください')
      .refine((value) => value.trim().length > 0, { message: '市町村・番地を入力してください' }),
    building: z.string().max(BUILDING_MAX_LENGTH, '100文字以内で入力してください'),
    phone: z
      .string()
      .max(PHONE_MAX_LENGTH, '電話番号の形式が正しくありません')
      .refine((value) => value.trim().length > 0, { message: '電話番号を入力してください' })
      .refine((value) => value.trim().length === 0 || phoneShapeRegex.test(phoneDigits(value)), {
        message: '電話番号の形式が正しくありません',
      }),
    email: z
      .string()
      .max(EMAIL_MAX_LENGTH, '254文字以内で入力してください')
      .refine((value) => value.trim().length > 0, { message: 'メールアドレスを入力してください' })
      .refine((value) => value.trim().length === 0 || emailRegex.test(value.trim()), {
        message: 'メールアドレスの形式が正しくありません',
      }),
  });

export type MemberFormValues = z.infer<ReturnType<typeof createMemberFormSchema>>;

/**
 * A stored 性別 → the form value.
 *
 * The detail response types `gender` as a plain nullable string (no enum), so a value outside the
 * four the endpoint accepts would pass a cast and leave the select showing nothing. Anything
 * unknown becomes the empty selection instead, so the operator sees an unfilled required field.
 */
export const genderFromStored = (value?: string | null): MemberFormValues['gender'] =>
  (GENDER_VALUES as readonly string[]).includes(value ?? '')
    ? (value as MemberFormValues['gender'])
    : ('' as MemberFormValues['gender']);

export const emptyMemberFormValues: MemberFormValues = {
  last_name: '',
  first_name: '',
  last_name_kana: '',
  first_name_kana: '',
  birthday: '',
  // Cast: the form starts with no selection; the Select placeholder covers the
  // empty state and submit-time validation rejects a missing choice.
  gender: '' as MemberFormValues['gender'],
  postal_code: '',
  prefecture: '',
  street_address: '',
  building: '',
  phone: '',
  email: '',
};

/** 性別 options in prototype order (男性/女性/その他/回答しない). */
export const GENDER_OPTIONS: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' },
];
