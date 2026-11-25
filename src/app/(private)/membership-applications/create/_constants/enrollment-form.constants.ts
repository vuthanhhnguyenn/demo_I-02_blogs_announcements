import type { CreateApplicationDto, CreateApplicationMemberDto } from '@/lib/api-real/types.gen';

/** Form payment-method values → the API's (D12). Keyed by the form value so both sides type-check. */
export const PAYMENT_METHOD_TO_API = {
  credit_card: 'sbps_credit',
  bank_transfer: 'jaccs_bank',
} as const satisfies Record<string, CreateApplicationDto['paymentMethod']>;

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'credit_card', label: 'クレジットカード（SBPS）' },
  { value: 'bank_transfer', label: '口座振替（JACCS）' },
];

/**
 * TODO(round2) B20 — temporary: `CreateApplicationDto.jaccsCallbackStatus` values, picked by hand
 * until the JACCS registration flow is specified.
 */
export const JACCS_CALLBACK_STATUS_OPTIONS = [
  { value: 'pending', label: '処理中（pending）' },
  { value: 'completed', label: '完了（completed）' },
  { value: 'failed', label: '失敗（failed）' },
] as const satisfies readonly {
  value: NonNullable<CreateApplicationDto['jaccsCallbackStatus']>;
  label: string;
}[];

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label]),
);

/** Form gender values → the API's (`no_answer` is the API's `prefer_not_to_say`). */
export const GENDER_TO_API = {
  male: 'male',
  female: 'female',
  other: 'other',
  no_answer: 'prefer_not_to_say',
} as const satisfies Record<string, CreateApplicationMemberDto['gender']>;

/** JOYFIT: 登録事務手数料（税別3,000円） — hint copy only; the amount comes from the estimate. */
export const REGISTRATION_FEE_HINT = 'JOYFIT: 税別3,000円';
/** FIT365: カード発行料（税別5,000円） — hint copy only; the amount comes from the estimate. */
export const CARD_ISSUANCE_FEE_HINT = 'FIT365: 税別5,000円';
