import type {
  AdminPlanControllerListData,
  CreatePlanDto,
  PlanListItemDto,
} from '@/lib/api-real/types.gen';

/** A row of 主契約一覧, straight off the real API (API-087 `GET /admin/plans`). */
export type MainContractRow = PlanListItemDto;

type PlanListQuery = NonNullable<AdminPlanControllerListData['query']>;

/** 契約タイプ vocabulary of the plan API. */
export type PlanContractType = NonNullable<PlanListQuery['contractType']>;

/** Brand vocabulary of the plan API (`Joyfit`, `Fit365`, …). */
export type PlanBrandEnum = NonNullable<PlanListQuery['brandEnum']>;

/** 性別制限 vocabulary of the plan API (`limitOfSex`). */
export type PlanLimitOfSex = NonNullable<CreatePlanDto['limitOfSex']>;

/** 有効/無効 filter vocabulary kept in the URL; the API carries it as the boolean `isActive`. */
export type PlanActiveKey = 'active' | 'inactive';

/**
 * 表示件数 of 主契約一覧. Unlike the app-wide `API_PAGE_SIZE_OPTIONS` (capped at 100), API-087
 * `GET /admin/plans` accepts `limit` up to 200, so the prototype's 200件 option is offered here.
 */
export const MAIN_CONTRACT_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export const MAIN_CONTRACT_TYPE_LABELS: Record<PlanContractType, string> = {
  general: '通常会員',
  oneDay: '1Day Pass',
  family: '家族会員',
  kids: 'キッズ会員',
  student: '学生会員',
  corporate: '法人会員',
  welfare: '福利厚生',
  prepaid: 'プリペイド会員',
  special: '特殊契約',
};

export const PLAN_BRAND_LABELS: Record<PlanBrandEnum, string> = {
  Joyfit: 'JOYFIT',
  Joyfit24: 'JOYFIT24',
  JoyfitYoga: 'JOYFIT YOGA',
  JoyfitPlus: 'JOYFIT+',
  Fit365: 'FIT365',
};

export const PLAN_BRAND_BADGE_CLASSES: Record<PlanBrandEnum, string> = {
  Joyfit: 'bg-primary/15 text-primary border-primary/20',
  Fit365: 'bg-destructive/15 text-destructive border-destructive/20',
  Joyfit24: 'bg-info/15 text-info border-info/20',
  JoyfitYoga: 'bg-success/15 text-success border-success/20',
  JoyfitPlus: 'bg-warning/15 text-warning border-warning/20',
};

export const MAIN_CONTRACT_STATUS_LABELS: Record<PlanActiveKey, string> = {
  active: '有効',
  inactive: '無効',
};

export const MAIN_CONTRACT_TYPE_BADGE_CLASSES: Record<PlanContractType, string> = {
  general: 'bg-info/15 text-info border-info/20',
  oneDay: 'bg-warning/15 text-warning border-warning/20',
  family: 'bg-success/15 text-success border-success/20',
  kids: 'bg-success/15 text-success border-success/20',
  student: 'bg-info/15 text-info border-info/20',
  corporate: 'bg-muted text-muted-foreground border-border',
  welfare: 'bg-info/15 text-info border-info/20',
  prepaid: 'bg-warning/15 text-warning border-warning/20',
  special: 'bg-destructive/15 text-destructive border-destructive/20',
};

export const MAIN_CONTRACT_STATUS_BADGE_CLASSES: Record<PlanActiveKey, string> = {
  active: 'bg-success/15 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

export const COMPANION_BENEFIT_FILTER_LABELS = {
  all: '全て',
  true: 'あり',
  false: 'なし',
} as const;

export type CompanionBenefitFilter = keyof typeof COMPANION_BENEFIT_FILTER_LABELS;

/**
 * JOYFIT-family brands share 入会金・登録事務手数料 and the 15歳以上 age floor
 * (G-01 ブランド別設定構築 / FR-M002 ブランド別差異). Case-insensitive, so `Joyfit24` and
 * `JoyfitYoga` count as JOYFIT.
 */
export function isJoyfitBrand(brand: string | null | undefined): boolean {
  return !!brand && brand.toLowerCase().startsWith('joyfit');
}

/** 他店舗利用可否 — the API models it as the boolean `otherStoreAvailable` (qa-185 §3). */
export const PLAN_OTHER_STORE_AVAILABLE_LABELS = { true: '可', false: '不可' } as const;

export const PLAN_LIMIT_OF_SEX_LABELS: Record<PlanLimitOfSex, string> = {
  none: '制限なし',
  male: '男性のみ',
  female: '女性のみ',
};

/**
 * G-01 ブランド別設定構築 / Y-07 FR-002: the 入会時費用 items differ per brand, and the client
 * confirmed at qa-185 §1 that 「セキュリティ管理／施設メンテナンス料」 is a *single* charge carried
 * by `maintenanceFee` — the form shows two inputs per brand, never five.
 */
export const PLAN_ENROLLMENT_FEE_FIELDS = {
  joyfit: [
    { name: 'enrollmentFee', label: '入会金' },
    { name: 'registrationFee', label: '登録事務手数料' },
  ],
  fit365: [
    { name: 'maintenanceFee', label: 'セキュリティ管理／施設メンテナンス料' },
    { name: 'cardIssueFee', label: '会員カード発行料' },
  ],
} as const satisfies Record<string, readonly { name: PlanFeeField; label: string }[]>;

export type PlanFeeField = 'enrollmentFee' | 'registrationFee' | 'cardIssueFee' | 'maintenanceFee';

/** The fee inputs a brand shows; the other brand's two are cleared when the brand changes. */
export function enrollmentFeeFieldsForBrand(
  brand: string | null | undefined,
): readonly { name: PlanFeeField; label: string }[] | null {
  if (!brand) return null;
  return isJoyfitBrand(brand)
    ? PLAN_ENROLLMENT_FEE_FIELDS.joyfit
    : PLAN_ENROLLMENT_FEE_FIELDS.fit365;
}

/** G-01 ブランド別設定構築: JOYFIT family 15歳以上 / FIT365 16歳以上. */
export function defaultMinAgeForBrand(brand: string | null | undefined): number | null {
  if (!brand) return null;
  return isJoyfitBrand(brand) ? 15 : 16;
}
