import { EMAIL_MAX_LENGTH } from '@/constants/app.constants';

import type {
  AdminMemberControllerListData,
  MemberDetailDto,
  MemberListItemDto,
} from '@/lib/api-real/types.gen';
import { Brand, ContractType, Gender, MainBrand, MemberType, MemoType } from '@/lib/api/types.gen';

import { MAIN_CONTRACT_TYPE_LABELS } from '../../contracts/_constants/constants';

/** The real API's `member_type` enum — eleven values, see `REAL_MEMBER_TYPE_LABELS`. */
type RealMemberType = MemberDetailDto['memberType'];

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  [MemberType.REGULAR]: '通常会員',
  [MemberType.ONE_DAY_MEMBER]: '1Day会員',
  [MemberType.FAMILY]: '家族会員',
  [MemberType.CORPORATE]: '法人会員',
};

/**
 * 会員種別 labels for the real API's `member_type` enum, which has eleven values against the
 * mock's four and shares only `family` with it — the two are different vocabularies, not a
 * rename, so they need separate maps.
 *
 * Wording is taken from the sources rather than invented, in this order of precedence:
 * the CRM prototype where it names the type (通常会員 / 法人会員 / 家族会員 / スタッフ会員),
 * then SPEC `mobile/requirements/APP-I-01.md` §会員種別（member_type）(`withjoy` → 準会員,
 * `trainer_member` → トレーナー, `vendor_member` → 外部業者) and
 * `mobile/design/App情報設計_構造化定義書.md` (OGF会員 / Vitality会員), then the API design doc
 * (`companion` → 同伴個人).
 *
 * The three the sources give without a 会員 suffix (トレーナー, 外部業者, 同伴個人) carry one here
 * so the whole map reads as one vocabulary alongside `MEMBER_TYPE_LABELS` above.
 */
export const REAL_MEMBER_TYPE_LABELS: Record<RealMemberType, string> = {
  normal: '通常会員',
  corporate_member: '法人会員',
  family: '家族会員',
  oneday: '1Day会員',
  companion: '同伴会員',
  withjoy: '準会員',
  staff_member: 'スタッフ会員',
  trainer_member: 'トレーナー会員',
  vendor_member: '外部業者会員',
  ogf_member: 'OGF会員',
  vitality_member: 'Vitality会員',
};

/**
 * Resolves a raw `member_type` enum to its Japanese label. The shared
 * `MemberHeadupCard` takes display-ready text by contract, so every caller of it goes
 * through here rather than passing the enum straight to the card.
 *
 * Both vocabularies resolve through here: screens on the real API and screens still on the
 * mock hand it the same kind of raw string, and the two enums share no value except `family`,
 * which both label 家族会員.
 */
export function memberTypeLabel(memberType: string | null | undefined): string | null {
  if (!memberType) return null;
  return (
    REAL_MEMBER_TYPE_LABELS[memberType as RealMemberType] ??
    MEMBER_TYPE_LABELS[memberType as MemberType] ??
    memberType
  );
}

/**
 * The real API spells the brand enums in their own casing (`JOYFIT` / `FIT365` for `brandGroup`,
 * `Joyfit` / `Fit365` for `brandEnum`) while the mock uses lower case. Lower-casing before the
 * lookup lets one map serve all three spellings; unknown values fall through to the raw string so
 * a new brand shows up as itself rather than as blank.
 */
export function brandGroupLabel(brandGroup: string | null | undefined): string | null {
  if (!brandGroup) return null;
  return BRAND_GROUP_LABELS[brandGroup.toLowerCase() as MainBrand] ?? brandGroup;
}

export function brandLabel(brand: string | null | undefined): string | null {
  if (!brand) return null;
  return BRAND_LABELS[brand.toLowerCase() as Brand] ?? brand;
}

/** Same normalisation for 性別, which the real API types as a plain string. */
export function genderLabel(gender: string | null | undefined): string | null {
  if (!gender) return null;
  return GENDER_LABELS[gender as Gender] ?? gender;
}

export function genderClass(gender: string | null | undefined): string {
  if (!gender) return '';
  return GENDER_CLASSES[gender as Gender] ?? '';
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  [ContractType.REGULAR]: '通常会員',
  [ContractType.ONE_DAY_MEMBER]: '1Day会員',
  [ContractType.FAMILY]: '家族会員',
};

export const JOIN_PERIOD_LABELS: Record<string, string> = {
  this_month: '今月',
  last_month: '先月',
  this_year: '今年',
  last_year: '昨年',
};

/**
 * 最終来館日 presets.
 *
 * The two 「…来館なし」 buckets were hidden while the dev Swagger lacked
 * `includeNeverEntered`: without it a member who has never entered at all
 * (`lastEntryAt === null`) drops out of a `lastEntryTo=<cutoff>` result — the
 * highest-churn-risk population the buckets exist to surface. The backend shipped
 * the parameter on 2026-08-26, so both are offered again; see `lastVisitToRange`
 * for the cutoffs they expand to.
 */
export const LAST_VISIT_LABELS: Record<string, string> = {
  within_1w: '直近1週間',
  within_2w: '直近2週間',
  over_3w: '3週間以上来館なし',
  over_1m: '1ヶ月以上来館なし',
};

/** The real API's `member_status` enum — the 8 values every member endpoint speaks. */
export type MemberStatusValue = MemberListItemDto['memberStatus'];

/**
 * Member status labels — one per `member_status` value (8 of them).
 *
 * ゲートストップ is deliberately absent: gate stop is an orthogonal flag
 * (`has_gate_stop`), not a status, so it has its own badge below. Labels for the
 * suspension/withdrawal states follow the A-03 FR-001 wording the backend
 * documents on the shared display-status enum.
 */
export const MEMBER_STATUS_LABELS: Record<MemberStatusValue, string> = {
  provisional: '仮会員',
  active: '有効',
  pending_suspended: '休会予定',
  suspended: '休会中',
  pending_withdrawal: '退会予定',
  withdrawal_pending_processing: '退会処理待ち',
  withdrawn: '退会済み',
  forced_withdrawal: '強制退会済み',
};

/** Badge for the gate-stop flag. Not a member status — see `MEMBER_STATUS_LABELS`. */
export const GATE_STOP_LABEL = 'ゲートストップ';
export const GATE_STOP_CLASSES = 'bg-destructive/15 text-destructive border-destructive/20';

/**
 * The ステータス dropdown keeps the prototype's 4 options + ゲートストップ, while the
 * API speaks all 8 DB values. Each option therefore fans out to the statuses it
 * covers, which the backend accepts as a comma-separated list.
 *
 * `gate_stop` is the odd one out: it sends `has_gate_stop=true` and NO status,
 * so it returns gate-stopped members whatever their status is (A-01, backend
 * design answer 2026-08-10).
 */
export const MEMBER_STATUS_FILTER_GATE_STOP = 'gate_stop';

export const MEMBER_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  statuses: MemberStatusValue[];
}> = [
  {
    value: 'active',
    label: '有効',
    statuses: ['active'],
  },
  {
    value: 'suspended',
    label: '休会中',
    statuses: ['suspended', 'pending_suspended'],
  },
  {
    value: 'pending_withdrawal',
    label: '退会予定',
    statuses: ['pending_withdrawal', 'withdrawal_pending_processing'],
  },
  {
    value: 'withdrawn',
    label: '退会済み',
    statuses: ['withdrawn', 'forced_withdrawal'],
  },
  { value: MEMBER_STATUS_FILTER_GATE_STOP, label: GATE_STOP_LABEL, statuses: [] },
];

/**
 * 「ブランド」 filter options on the member list — the real `brandGroup` axis of
 * `GET /api/v1/admin/members`, whose values are upper-case (`JOYFIT` / `FIT365`).
 * Kept separate from `BRAND_GROUP_LABELS` below, which keys the lower-case mock
 * `MainBrand` still used by the member detail screen.
 */
export const BRAND_GROUP_FILTER_OPTIONS = [
  { value: 'JOYFIT', label: 'JOYFIT' },
  { value: 'FIT365', label: 'FIT365' },
] as const;

export type BrandGroupFilter = (typeof BRAND_GROUP_FILTER_OPTIONS)[number]['value'];

/**
 * 契約種別 filter (A-01 FR-001) — `plans.contract_type` of the current main contract, sent as
 * `contractType`. A different axis from 主契約プラン (`planId`): one value covers every plan of
 * that type. Labels are the G-01 契約タイプ vocabulary used on 主契約一覧.
 */
export type MemberContractTypeFilter = NonNullable<
  NonNullable<AdminMemberControllerListData['query']>['contractType']
>;

const MEMBER_CONTRACT_TYPE_LABELS: Record<MemberContractTypeFilter, string> =
  MAIN_CONTRACT_TYPE_LABELS;

export const MEMBER_CONTRACT_TYPE_FILTER_OPTIONS = (
  Object.entries(MEMBER_CONTRACT_TYPE_LABELS) as [MemberContractTypeFilter, string][]
).map(([value, label]) => ({ value, label }));

/**
 * Sortable columns of the member list, named after the `sort` values the real API
 * accepts so a column id travels to the query unchanged. Matches A-01 FR-001
 * (会員ID・氏名・ステータス・入会日・最終来館日).
 */
export const MEMBER_LIST_SORT_FIELDS = [
  'memberNumber',
  'lastName',
  'memberStatus',
  'enrolledAt',
  'lastEntryAt',
] as const;

export type MemberListSortField = (typeof MEMBER_LIST_SORT_FIELDS)[number];

/**
 * Rows per page. `200` is deliberately absent: the API caps `limit` at 100 and the
 * client confirmed on 2026-08-19 (qa-155 §7) that the 200 option is dropped from the
 * UI across the three A-group list screens rather than the cap being raised.
 */
export const MEMBER_LIST_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/**
 * Longest keyword the search box takes. A-01 FR-001 sets no limit and lists メールアドレス
 * among the searchable fields, so the bound is the longest value that can be searched for —
 * an email address (`EMAIL_MAX_LENGTH`). The API currently caps `query` at 60, which is
 * shorter than an email it is expected to match; the backend is expanding it to this value
 * rather than the screen truncating what an operator may legitimately paste.
 */
export const MEMBER_SEARCH_MAX_LENGTH = EMAIL_MAX_LENGTH;

/** Brand groups (JOYFIT / FIT365) — the axis the 「ブランド」 filter maps to 1:1. */
export const BRAND_GROUP_LABELS: Record<MainBrand, string> = {
  [MainBrand.JOYFIT]: 'JOYFIT',
  [MainBrand.FIT365]: 'FIT365',
};

/** Store sub-brands. Read from the store, never from the member row. */
export const BRAND_LABELS: Record<Brand, string> = {
  [Brand.JOYFIT]: 'JOYFIT',
  [Brand.FIT365]: 'FIT365',
  [Brand.JOYFIT_PLUS]: 'JOYFIT+',
  [Brand.JOYFIT_YOGA]: 'JOYFIT YOGA',
  [Brand.JOYFIT24]: 'JOYFIT24',
};

export const MEMBER_STATUS_CLASSES: Record<MemberStatusValue, string> = {
  provisional: 'bg-info/15 text-info border-info/20',
  active: 'bg-success/15 text-success border-success/20',
  pending_suspended: 'bg-warning/15 text-warning border-warning/20',
  suspended: 'bg-warning/15 text-warning border-warning/20',
  pending_withdrawal: 'bg-warning/15 text-warning border-warning/20',
  withdrawal_pending_processing: 'bg-warning/15 text-warning border-warning/20',
  withdrawn: 'bg-muted text-muted-foreground border-border',
  forced_withdrawal: 'bg-destructive/15 text-destructive border-destructive/20',
};

/** Fallback pairing for a status the client does not know — see `resolveMemberStatusBadge`. */
const UNKNOWN_STATUS_CLASSES = 'bg-muted text-muted-foreground border-border';

/**
 * Whether the status badge shows its live-state dot.
 *
 * 退会済み is a closed, inactive state, so it gets no dot (prototype `shouldShowMemberStatusDot`);
 * 強制退会済み is closed for the same reason.
 * Shared between the list column and the detail head-up so the two can never disagree.
 */
export function shouldShowMemberStatusDot(status: MemberStatusValue): boolean {
  return status !== 'withdrawn' && status !== 'forced_withdrawal';
}

/**
 * Everything a status badge needs, for a value that arrives as a plain string.
 *
 * The API owns the `member_status` enum and may grow it, so a value this client has no
 * label for reads as itself in a neutral badge rather than as an empty badge carrying
 * `undefined` in its class list.
 */
export function resolveMemberStatusBadge(status: string): {
  label: string;
  className: string;
  showDot: boolean;
} {
  const known = status in MEMBER_STATUS_LABELS ? (status as MemberStatusValue) : null;
  if (!known) {
    return { label: status, className: UNKNOWN_STATUS_CLASSES, showDot: false };
  }
  return {
    label: MEMBER_STATUS_LABELS[known],
    className: MEMBER_STATUS_CLASSES[known],
    showDot: shouldShowMemberStatusDot(known),
  };
}

const MEMBER_STATUS_CLASSES_BY_LABEL: Record<string, string> = Object.fromEntries(
  (Object.keys(MEMBER_STATUS_LABELS) as MemberStatusValue[]).map((status) => [
    MEMBER_STATUS_LABELS[status],
    MEMBER_STATUS_CLASSES[status],
  ]),
);

/**
 * For places (e.g. change history) where the status only arrives as a Japanese label string.
 * Unknown labels fall back to gray.
 */
export function getMemberStatusClassByLabel(label: string): string {
  return MEMBER_STATUS_CLASSES_BY_LABEL[label] ?? UNKNOWN_STATUS_CLASSES;
}

export const BRAND_CLASSES: Record<Brand, string> = {
  [Brand.JOYFIT]: 'bg-blue-100 text-blue-600',
  [Brand.FIT365]: 'bg-green-100 text-green-600',
  [Brand.JOYFIT_PLUS]: 'bg-yellow-100 text-yellow-600',
  [Brand.JOYFIT_YOGA]: 'bg-purple-100 text-purple-600',
  [Brand.JOYFIT24]: 'bg-red-100 text-red-600',
};

export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: '男性',
  [Gender.FEMALE]: '女性',
  [Gender.OTHER]: 'その他',
  [Gender.PREFER_NOT_TO_SAY]: '回答しない',
};

export const MEMO_TYPE_LABELS: Record<MemoType, string> = {
  [MemoType.CAUTION]: '要注意',
  [MemoType.VIP]: 'VIP',
  [MemoType.OTHER]: 'その他',
};

export const GENDER_CLASSES: Record<Gender, string> = {
  [Gender.MALE]: 'bg-gender-male/15 text-gender-male border-gender-male/20',
  [Gender.FEMALE]: 'bg-gender-female/15 text-gender-female border-gender-female/20',
  [Gender.OTHER]: 'bg-muted text-muted-foreground border-muted/20',
  [Gender.PREFER_NOT_TO_SAY]: 'bg-muted text-muted-foreground border-muted/20',
};
