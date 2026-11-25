import type {
  CampaignDetailDto,
  CreateCampaignDto,
  PromotionCodeListItemDto,
} from '@/lib/api-real/types.gen';

/** API-089 vocabulary (real API). */
export type PromoCodeEffectiveStatus = PromotionCodeListItemDto['effectiveStatus'];
export type PromoCodeStatus = PromotionCodeListItemDto['status'];
export type PromoCodeScope = PromotionCodeListItemDto['scopeType'];

export type CampaignApplyStartMonth = CampaignDetailDto['applyStartMonth'];
export type CampaignPublishScope = CampaignDetailDto['publishScope'];

/** API-088 vocabulary (real API) — PascalCase brand, 3-state `acceptingStatus`, 4-value gender. */
export type CampaignBrand = NonNullable<CreateCampaignDto['brandEnum']>;
export type CampaignAcceptingStatus = CampaignDetailDto['acceptingStatus'];
export type CampaignTargetSex = NonNullable<
  NonNullable<CampaignDetailDto['campaignAutoOptions'][number]['targetSexes']>[number]
>;

export const CAMPAIGN_BRAND_VALUES = [
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
  'Fit365',
] as const satisfies readonly CampaignBrand[];

export const CAMPAIGN_BRAND_LABELS: Record<CampaignBrand, string> = {
  Joyfit: 'JOYFIT',
  Joyfit24: 'JOYFIT24',
  JoyfitYoga: 'JOYFIT YOGA',
  JoyfitPlus: 'JOYFIT+',
  Fit365: 'FIT365',
};

export const CAMPAIGN_ACCEPTING_STATUS_LABELS: Record<CampaignAcceptingStatus, string> = {
  accepting: '受付中',
  stopped_manual: '受付停止',
  capacity_reached: '上限到達',
};

export const CAMPAIGN_ACCEPTING_STATUS_BADGE_CLASSES: Record<CampaignAcceptingStatus, string> = {
  accepting: 'bg-success/15 text-success border-success/20',
  stopped_manual: 'bg-muted text-muted-foreground border-border',
  capacity_reached: 'bg-warning/15 text-warning border-warning/20',
};

export const CAMPAIGN_ACCEPTING_STATUS_VALUES = [
  'accepting',
  'stopped_manual',
  'capacity_reached',
] as const satisfies readonly CampaignAcceptingStatus[];

export const CAMPAIGN_ACCEPTING_STATUS_TONES: Record<
  CampaignAcceptingStatus,
  'success' | 'muted' | 'warning'
> = {
  accepting: 'success',
  stopped_manual: 'muted',
  capacity_reached: 'warning',
};

/**
 * infinite scroll で段階取得するマスタ（店舗・主契約の検索対応セレクト、条件/自動付与オプションのチェックボックスグリッド）の1ページあたり取得件数。
 * 100件を超える環境があるため、全件取得ではなく複数ページに分けて取得する前提の小さめの値。
 */
export const CAMPAIGN_SEARCH_PAGE_LIMIT = 30;

/** 「あり」を表すバッジ。自動付与・友達紹介連動で共用する。 */
export const CAMPAIGN_ENABLED_BADGE_CLASS = 'bg-success/15 text-success border-success/20';

/** 公開範囲「特定店舗のみ」/ 変更履歴「新規作成」の注意色。 */
export const CAMPAIGN_INFO_BADGE_CLASS = 'bg-info/15 text-info border-info/20';

export const CAMPAIGN_APPLY_START_MONTH_LABELS: Record<CampaignApplyStartMonth, string> = {
  first_month: '初月（利用開始月）',
  next_month: '翌月（利用開始月の翌月）',
  specific_month: 'X月指定',
};

export const CAMPAIGN_TARGET_SEX_LABELS: Record<CampaignTargetSex, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
  prefer_not_to_say: '回答しない',
};

export const CAMPAIGN_TARGET_SEX_BADGE_CLASSES: Record<CampaignTargetSex, string> = {
  male: 'bg-gender-male/15 text-gender-male border-gender-male/20',
  female: 'bg-gender-female/15 text-gender-female border-gender-female/20',
  other: 'bg-muted text-muted-foreground border-border',
  prefer_not_to_say: 'bg-muted text-muted-foreground border-border',
};

export const CAMPAIGN_PUBLISH_SCOPE_LABELS: Record<CampaignPublishScope, string> = {
  all_stores: '全店舗公開',
  specific_stores: '特定店舗のみ公開',
};

export const PROMO_CODE_STATUS_LABELS: Record<PromoCodeEffectiveStatus, string> = {
  active: '有効',
  expired: '期限切れ',
  exhausted: '上限到達',
  disabled: '無効',
  campaign_unavailable: 'キャンペーン利用不可',
};

/** 発行者の区分 (API `issuerType`: 発行者の現在のロールで判定)。 */
export type PromoCodeIssuerType = 'headquarter' | 'store_staff';

export const PROMO_CODE_ISSUER_TYPE_LABELS: Record<PromoCodeIssuerType, string> = {
  headquarter: '本部',
  store_staff: '店舗スタッフ',
};

/** 一覧のステータス絞り込み (API の `status` は永続ステータス 4 値のみ。campaign_unavailable では絞れない)。 */
export const PROMO_CODE_FILTER_STATUSES: readonly PromoCodeStatus[] = [
  'active',
  'expired',
  'exhausted',
  'disabled',
];

/** V0 10/7 `statusTone`: 有効=success / 期限切れ=neutral / 上限到達=warning / 無効=neutral。 */
export const PROMO_CODE_STATUS_BADGE_CLASSES: Record<PromoCodeEffectiveStatus, string> = {
  active: 'bg-success/15 text-success border-success/20',
  expired: 'bg-muted text-muted-foreground border-border',
  exhausted: 'bg-warning/15 text-warning border-warning/20',
  disabled: 'bg-muted text-muted-foreground border-border',
  campaign_unavailable: 'bg-muted text-muted-foreground border-border',
};

/** 行を淡く落とすステータス (V0 10/7: 上限到達は淡くしない)。 */
export const PROMO_CODE_INACTIVE_STATUSES: readonly PromoCodeEffectiveStatus[] = [
  'disabled',
  'expired',
  'campaign_unavailable',
];

export const PROMO_CODE_SCOPE_LABELS: Record<PromoCodeScope, string> = {
  brand_all: '全店舗',
  issuer_store_only: '発行店舗のみ',
  ogf_only: 'OGF限定',
  member_referral: '会員紹介',
  family: 'ファミリー',
};

/** コード発行ダイアログの適用店舗タイプ選択肢 (V0 10/7)。 */
export const PROMO_CODE_SCOPE_OPTIONS: {
  value: 'brand_all' | 'issuer_store_only';
  label: string;
}[] = [
  { value: 'brand_all', label: '全店舗' },
  { value: 'issuer_store_only', label: '発行店舗のみ' },
];

/**
 * フィルター開閉でテーブル高さを切り替える (list 画面共通パターン)。
 * hasActiveFilters の +41px は FilterResultBanner (py-2 + h-6 ボタン + border-t) の分。
 */
export function getCampaignTableMaxHeightClass(
  isFilterOpen: boolean,
  hasActiveFilters: boolean,
): string {
  if (isFilterOpen && hasActiveFilters) return 'max-h-[calc(100vh-381px)]';
  if (isFilterOpen) return 'max-h-[calc(100vh-340px)]';
  if (hasActiveFilters) return 'max-h-[calc(100vh-327px)]';
  return 'max-h-[calc(100vh-286px)]';
}
