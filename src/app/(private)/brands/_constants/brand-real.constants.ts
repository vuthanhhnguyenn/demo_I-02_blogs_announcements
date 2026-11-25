import type {
  BrandFeeDto,
  BrandHistoryEntryDto,
  BrandListItemDto,
  SubBrandDto,
} from '@/lib/api-real/types.gen';

/**
 * Real-API (API-074) labels for the ブランド管理 screens.
 *
 * Deliberately separate from `brand.constants.ts`: that file's `BRAND_LABELS` / `BRAND_OPTIONS` are
 * keyed off the *mock* `BrandEnum` (lowercase `joyfit`…) and are imported by eight screens that are
 * still on the mock API (article-categories, banners, campaigns). Touching it would break them.
 */

export type BrandGroup = BrandListItemDto['brandGroup'];
export type SubBrandEnum = SubBrandDto['brandEnum'];
export type FeeType = BrandFeeDto['feeType'];
export type HistoryAction = BrandHistoryEntryDto['changeAction'];
/** 費用マスタ state per sub-brand (Y-07 260928_v3 FR-001). Absent from the DTO for `staff`. */
export type FeeMasterStatus = NonNullable<SubBrandDto['feeMasterStatus']>;

export const BRAND_GROUPS = ['JOYFIT', 'FIT365'] as const satisfies readonly BrandGroup[];

export function isBrandGroup(value: string): value is BrandGroup {
  return (BRAND_GROUPS as readonly string[]).includes(value);
}

/**
 * Which fee items each brand shows, in display order — Y-07 FR-002.
 *
 * The API stores all four `feeType` generations for every sub-brand, but only some apply per
 * brand; the rest are seeded at 0 (verified live: JOYFIT has cardIssueFee / maintenanceFee = 0,
 * FIT365 has enrollmentFee / registrationFee = 0). Rendering all four would show 「¥0」 rows for
 * fees the brand does not charge.
 *
 * - **JOYFIT**（サブブランド単位で設定）: 入会金 / 登録事務手数料
 * - **FIT365**: 入会金はなく、セキュリティ管理／施設メンテナンス料 / 会員カード発行料
 *
 * Order follows the V0 prototype's fee cards (`brand-detail.tsx` `JOYFIT_FEES` / `FIT365_FEES`),
 * which put FIT365's maintenance fee in the 費用項目① slot.
 */
export const BRAND_GROUP_FEE_TYPES = {
  JOYFIT: ['enrollmentFee', 'registrationFee'],
  FIT365: ['maintenanceFee', 'cardIssueFee'],
} as const satisfies Record<BrandGroup, readonly FeeType[]>;

/**
 * Wording from G-05's 費用項目 table (the fee-master spec), which the V0 prototype uses verbatim.
 * Y-07 FR-002 words FIT365's two items slightly differently (「セキュリティ管理費・施設メンテナンス料」
 * / 「カード発行料」); G-05 wins as the spec that defines the item names (user decision 2026-10-05).
 */
export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  enrollmentFee: '入会金',
  registrationFee: '登録事務手数料',
  cardIssueFee: '会員カード発行料',
  maintenanceFee: 'セキュリティ管理／施設メンテナンス料',
};

/**
 * Sub-brand display names for the 変更履歴「対象」列 and the 費用 card titles / dialogs. The history API
 * sends only the enum, and the sub-brand API's `displayName` spells JOYFIT＋ with a half-width 「+」
 * (`"JOYFIT+"`), whereas Y-07 / the prototype use the full-width 「＋」 (U+FF0B) — so both screens
 * read the name from here rather than from the API.
 */
export const SUB_BRAND_LABELS: Record<SubBrandEnum, string> = {
  Joyfit: 'JOYFIT',
  Joyfit24: 'JOYFIT24',
  JoyfitYoga: 'JOYFIT YOGA',
  JoyfitPlus: 'JOYFIT＋',
  Fit365: 'FIT365',
};

/**
 * 変更履歴 の「変更項目」prefix. Only the actions that add meaning beyond the changed field carry a
 * prefix; an empty string means the field label already says everything.
 */
export const HISTORY_ACTION_LABELS: Record<HistoryAction, string> = {
  fee_update: '',
  fee_schedule_create: '予約登録',
  fee_schedule_cancel: '予約取消',
  cadence_update: '請求サイクル',
  suspension_fee_update: '',
  enrollment_review_overdue_update: '',
  reenrollment_waiver_update: '',
  brand_name_update: '',
  fee_master_deactivate: '無効化',
  fee_master_activate: '有効化',
  fee_master_delete: '削除',
  fee_master_register: '登録',
  migrate: '移行',
};

/**
 * Attribute suffix for a `fee_update` (現行 correction) row's 変更項目 — the prototype's 「入会金 定価」
 * (CH001). Every other fee action already names itself through `HISTORY_ACTION_LABELS`.
 */
export const HISTORY_FEE_PRICE_ATTRIBUTE_LABEL = '定価';

export const FEE_MASTER_STATUS_LABELS: Record<FeeMasterStatus, string> = {
  active: '有効',
  inactive: '無効',
  none: '未登録',
};

/**
 * `BrandHistoryChangeDto.field` is a free-form string, so this map is a best-effort lookup rather
 * than an exhaustive record — an unknown field falls back to its raw value.
 */
export const HISTORY_FIELD_LABELS: Record<string, string> = {
  ...FEE_TYPE_LABELS,
  suspensionFee: '休会手数料',
  maintenanceFeeStartMonth: 'メンテナンス料 開始月',
  maintenanceFeeCycleMonth: 'メンテナンス料 サイクル',
  reviewOverdueHours: '審査超過時間',
  reenrollmentFeeWaiverDays: '再入会免除期間',
  minEnrollmentAge: '最低入会年齢',
  displayName: 'ブランド名',
  feeMasterStatus: '費用マスタ',
};

/**
 * Max 予約中の改定 per fee item in one save — `BrandFeeCardItemDto.scheduledChanges.maxItems`.
 */
export const MAX_SCHEDULED_CHANGES = 20;

/** `UpdateBrandGroupDto.displayName.maxLength`. */
export const BRAND_NAME_MAX_LENGTH = 100;

/**
 * Compile-time drift guards. If the BE adds a `feeType` or a `changeAction`, these fail `tsc`
 * instead of letting a raw enum value reach the screen.
 */
type _FeeTypesAreCovered = FeeType extends
  | (typeof BRAND_GROUP_FEE_TYPES)['JOYFIT'][number]
  | (typeof BRAND_GROUP_FEE_TYPES)['FIT365'][number]
  ? true
  : never;
const _feeTypesAreCovered: _FeeTypesAreCovered = true;
void _feeTypesAreCovered;

type _BrandGroupsAreExhaustive = BrandGroup extends (typeof BRAND_GROUPS)[number] ? true : never;
const _brandGroupsAreExhaustive: _BrandGroupsAreExhaustive = true;
void _brandGroupsAreExhaustive;
