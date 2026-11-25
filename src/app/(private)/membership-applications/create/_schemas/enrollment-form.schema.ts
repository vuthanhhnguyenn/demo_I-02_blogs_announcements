import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PREFECTURES,
  TEXT_MAX_LENGTH,
} from '@/constants/app.constants';
import { calcAge, isBelowMinAge } from '@/utils/age.util';
import { isJapanesePhoneNumber, japanesePhoneMessage } from '@/utils/validation.util';
import { addMonths, format, startOfDay } from 'date-fns';
import { z } from 'zod';

// ─── Limits ──────────────────────────────────────────────────────────────────
// Caps follow the BE validation (`CreateApplicationMemberDto` / `CreateApplicationAddressDto`);
// only fields the BE leaves uncapped fall back to app.constants (BUG-D-05).

/** フリガナ（姓）/（名） — `lastNameKana` / `firstNameKana` maxLength. */
const KANA_MAX_LENGTH = 100;
/** 市町村・番地 / 建物名 — `streetAddress` / `building` maxLength. */
const ADDRESS_MAX_LENGTH = 200;
/** 保護者氏名 — the API answers E-VAL-001 above 100 (not yet in the OpenAPI document). */
const GUARDIAN_NAME_MAX_LENGTH = 100;

/** Messages name the field by its exact label (BUG-D-03). */
const requiredMessage = (label: string) => `${label}を入力してください`;
const maxLengthMessage = (label: string, max: number) =>
  `${label}は${max}文字以内で入力してください`;

/** Required text — whitespace-only counts as empty (BUG-D-04). */
const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, { message: requiredMessage(label) })
    .max(max, { message: maxLengthMessage(label, max) });

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: maxLengthMessage(label, max) });

const todayIso = () => format(startOfDay(new Date()), 'yyyy-MM-dd');

/** 利用開始日 window — today through two months ahead, as the API enforces (E-ENR-004). */
export const USAGE_START_MAX_MONTHS = 2;
export const USAGE_START_RANGE_MESSAGE = `利用開始日は本日から${USAGE_START_MAX_MONTHS}か月以内で選択してください`;
export function isUsageStartInRange(value: string): boolean {
  const today = startOfDay(new Date());
  return (
    value >= format(today, 'yyyy-MM-dd') &&
    value <= format(addMonths(today, USAGE_START_MAX_MONTHS), 'yyyy-MM-dd')
  );
}

/** A birth date must be before today (BUG-D-06). */
export function isPastBirthDate(value: string): boolean {
  return value < todayIso();
}

// ─── Applicant (FR-044 – FR-047) ────────────────────────────────────────────

/** 住所 — 郵便番号 / 都道府県 / 市町村・番地 / 建物名, the member-form split (prototype 9/17). */
export const DirectEnrollmentAddressSchema = z.object({
  postal_code: z
    .string()
    .trim()
    .min(1, { message: requiredMessage('郵便番号') })
    .regex(/^\d{3}-?\d{4}$/, { message: '郵便番号は7桁で入力してください（例: 150-0001）' }),
  prefecture: z
    .string()
    .min(1, { message: '都道府県を選択してください' })
    .refine((v) => (PREFECTURES as readonly string[]).includes(v), {
      message: '都道府県を選択してください',
    }),
  street_address: requiredText('市町村・番地', ADDRESS_MAX_LENGTH),
  building: optionalText('建物名', ADDRESS_MAX_LENGTH).optional(),
});

const KANA_PATTERN = /^[゠-ヿ\s]+$/;

export const DirectEnrollmentApplicantSchema = z.object({
  family_name: requiredText('氏名（姓）', NAME_MAX_LENGTH),
  given_name: requiredText('氏名（名）', NAME_MAX_LENGTH),
  family_name_kana: requiredText('フリガナ（姓）', KANA_MAX_LENGTH).regex(KANA_PATTERN, {
    message: 'フリガナ（姓）はカタカナで入力してください',
  }),
  given_name_kana: requiredText('フリガナ（名）', KANA_MAX_LENGTH).regex(KANA_PATTERN, {
    message: 'フリガナ（名）はカタカナで入力してください',
  }),
  birth_date: z
    .string()
    .min(1, { message: requiredMessage('生年月日') })
    .check(z.iso.date('生年月日に有効な日付を入力してください'))
    .refine(isPastBirthDate, { message: '生年月日は本日より前の日付を入力してください' }),
  gender: z.enum(['male', 'female', 'other', 'no_answer'] as const, {
    error: '性別を選択してください',
  }),
  phone: z
    .string()
    .trim()
    .min(1, { message: requiredMessage('電話番号') })
    // 10–11 digits from 0 once hyphens are stripped — the API's `^0[0-9]{9,10}$`.
    .refine(isJapanesePhoneNumber, { message: japanesePhoneMessage('電話番号') }),
  email: requiredText('メールアドレス', EMAIL_MAX_LENGTH).check(
    z.email({ error: '有効なメールアドレスを入力してください' }),
  ),
  address: DirectEnrollmentAddressSchema,
  face_photo_id: z.string().min(1, { message: '顔写真をアップロードしてください' }),
});

// ─── Contract (FR-048 – FR-050) ──────────────────────────────────────────────

export const DirectEnrollmentContractSchema = z.object({
  brand_id: z.enum(['FIT365', 'JOYFIT'] as const, { error: 'ブランドを選択してください' }),
  store_id: z.string().min(1, { message: '入会店舗を選択してください' }),
  // Decided by the campaign, not chosen (C-01 L212, integration-plan D17): the required check
  // lives on campaign_id, so a missing plan never raises a second message.
  plan_id: z.string(),
  usage_start_date: z
    .string()
    .min(1, { message: requiredMessage('利用開始日') })
    .check(z.iso.date('利用開始日に有効な日付を入力してください'))
    .refine(isUsageStartInRange, { message: USAGE_START_RANGE_MESSAGE }),
  payment_method: z.enum(['credit_card', 'bank_transfer'] as const, {
    error: '決済方法を選択してください',
  }),
  // C-01 L212: the enrolment flow starts from a campaign — required, no 「なし」 (prototype 9/8).
  campaign_id: z.string().min(1, { message: '適用キャンペーンを選択してください' }),
  // 紹介コード — optional; when filled the route becomes 紹介経由 (C-01 FR-M009, prototype 9/16).
  referral_code: optionalText('紹介コード', TEXT_MAX_LENGTH),
  // SBPS card token — required only for credit-card payment (prototype 9/16).
  card_token: optionalText('カードトークン', TEXT_MAX_LENGTH),
  // TODO(round2) B20 — temporary: JACCS fields of `CreateApplicationDto` (jaccsContractorNumber /
  // jaccsCallbackStatus), typed by hand until the JACCS registration flow is specified. Both
  // optional, as in the contract; sent only for 口座振替（JACCS）.
  jaccs_contractor_number: optionalText('JACCS契約者番号', TEXT_MAX_LENGTH),
  jaccs_callback_status: z.enum(['', 'pending', 'completed', 'failed'] as const),
  // B12 (closed 2026-10-07): kept for the (read-only) 入会金 select; never sent — the API applies the
  // plan's own enrolment fee.
  enrollment_fee_master_id: z.string().nullable().optional(),
});

// ─── Consent / proxy record (FR-051) ────────────────────────────────────────

export const DirectEnrollmentConsentSchema = z.object({
  agreement_datetime: z.string().min(1, { message: '合意日時を入力してください' }),
  parental_consent: z.boolean(),
  // Minors only — guardian name and consent time (C-01 FR-M004, prototype 9/8).
  guardian_name: optionalText('保護者氏名', GUARDIAN_NAME_MAX_LENGTH),
  guardian_consent_at: z.string(),
  // 規約同意 — one flag per terms document id (API-076 §3, prototype 9/17). The documents depend
  // on the selected store, so "all agreed" is gated by the form, not here.
  terms: z.record(z.string(), z.boolean()),
});

// ─── Full request schema ─────────────────────────────────────────────────────

export const DirectEnrollmentRequestBaseSchema = z.object({
  applicant: DirectEnrollmentApplicantSchema,
  contract: DirectEnrollmentContractSchema,
  consent: DirectEnrollmentConsentSchema,
});

export const directEnrollmentSchema = DirectEnrollmentRequestBaseSchema.superRefine((data, ctx) => {
  // A missing / future birth date already has its own field error — no age verdict on it.
  if (!isPastBirthDate(data.applicant.birth_date)) return;
  const age = calcAge(data.applicant.birth_date);
  const brand = data.contract.brand_id;
  const isMinor = age < 18 && !isBelowMinAge(age, brand);

  // Below the brand minimum (FR-046) — the route also enforces this server-side.
  if (isBelowMinAge(age, brand)) {
    ctx.addIssue({
      code: 'custom',
      path: ['applicant', 'birth_date'],
      message: `${brand === 'FIT365' ? '16' : '15'}歳未満は申請できません。`,
    });
  }

  // Parental consent required for a minor (FR-047).
  if (isMinor && !data.consent.parental_consent) {
    ctx.addIssue({
      code: 'custom',
      path: ['consent', 'parental_consent'],
      message: '保護者の同意確認が必要です。',
    });
  }

  // Guardian name + consent time recorded with the consent check (prototype 9/8).
  if (isMinor && !data.consent.guardian_name.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['consent', 'guardian_name'],
      message: requiredMessage('保護者氏名'),
    });
  }
  if (isMinor && !data.consent.guardian_consent_at) {
    ctx.addIssue({
      code: 'custom',
      path: ['consent', 'guardian_consent_at'],
      message: requiredMessage('同意日時'),
    });
  }

  // Agreement timestamp must not be in the future (FR-051).
  if (data.consent.agreement_datetime && new Date(data.consent.agreement_datetime) > new Date()) {
    ctx.addIssue({
      code: 'custom',
      path: ['consent', 'agreement_datetime'],
      message: '合意日時は未来の日時を指定できません。',
    });
  }

  // Card token is required for SBPS card payment (prototype 9/16).
  if (data.contract.payment_method === 'credit_card' && !data.contract.card_token.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['contract', 'card_token'],
      message: requiredMessage('カードトークン'),
    });
  }
});

export type DirectEnrollmentFormValues = z.infer<typeof directEnrollmentSchema>;
