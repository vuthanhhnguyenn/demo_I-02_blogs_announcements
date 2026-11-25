import type { OptionDetailDto, OptionListItemDto } from '@/lib/api-real/types.gen';

/** Service type (`subcategory`) of API-085. */
export type OptionSubcategory = NonNullable<OptionDetailDto['subcategory']>;

type OptionTypeValue = OptionDetailDto['optionType'];
type OptionUsabilityValue = OptionDetailDto['usability'];

export const OPTION_STATUS_BADGE_CLASSES: Record<'active' | 'inactive', string> = {
  active: 'bg-success/15 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

/** Radio labels on the form; the list/detail badges use OPTION_LIST_TYPE_LABELS. */
export const OPTION_TYPE_FORM_LABELS: Record<OptionTypeValue, string> = {
  regular: '通常オプション',
  per_use: '都度オプション',
  auto_assigned: '自動付与オプション',
};

export const OPTION_TYPE_DESCRIPTIONS: Record<OptionTypeValue, string> = {
  regular: '月単位で継続して課金されるオプションです',
  per_use: '利用のたびに費用が発生します',
  auto_assigned: '入会時にベタ付けで自動的に付与されます',
};

export const OPTION_USABILITY_FORM_LABELS: Record<OptionUsabilityValue, string> = {
  unavailable: '利用不可',
  add_cancel_only: '追加・解約のみ可能',
  full: '追加・解約・変更すべて可能',
  change_cancel_only: '変更・解約のみ可能',
};

/** Only the unavailable status carries an explanation in the prototype; the other three are self-explanatory. */
export const OPTION_USABILITY_DESCRIPTIONS: Partial<Record<OptionUsabilityValue, string>> = {
  unavailable: '既存契約者のみ継続、新規追加は不可',
};

export const PRORATION_METHOD_FORM_LABELS: Record<OptionDetailDto['prorationMethod'], string> = {
  proration: '日割り計算（日数按分）',
  fixed: '固定金額',
};

export const OPTION_SUBCATEGORY_LABELS: Record<OptionSubcategory, string> = {
  protein: 'プロテイン',
  supplement: 'サプリメント',
  tanning: '日焼け',
  collagen: 'コラーゲン',
  hydrogen_water: '水素水',
  body_planner: '体組成計',
  shower: 'シャワー',
};

/** Proration flag list filter — the prototype offers all / enabled / disabled. */
export const OPTION_PRORATED_FILTER_LABELS = {
  true: '日割りあり',
  false: '日割りなし',
} as const;

/**
 * E-01 linkage (G-02 前提条件事項 / 関連機能): an option whose functional category is `locker_option` is a
 * locker contract type — the locker screen offers exactly these as a slot's 契約形態コード
 * (by `code`). List row badge, detail header badge and detail card all key off this one check.
 */
export function isLockerContractType(option: {
  category: OptionListItemDto['category'] | OptionDetailDto['category'];
}): boolean {
  return option.category === 'locker_option';
}

// ─── List + detail screens (real API-085 `OptionListItemDto` / `OptionDetailDto`) ──────────

type OptionListType = OptionListItemDto['optionType'];

export const OPTION_LIST_TYPE_LABELS: Record<OptionListType, string> = {
  regular: '通常',
  per_use: '都度',
  auto_assigned: '自動付与',
};

export const OPTION_LIST_TYPE_BADGE_CLASSES: Record<OptionListType, string> = {
  regular: '',
  per_use: 'bg-warning/15 text-warning border-warning/20',
  auto_assigned: 'bg-success/15 text-success border-success/20',
};

export const OPTION_LIST_USABILITY_LABELS: Record<OptionListItemDto['usability'], string> = {
  unavailable: '利用不可',
  add_cancel_only: '追加・解約のみ',
  full: '追加・解約・変更',
  change_cancel_only: '変更・解約のみ',
};

export const OPTION_LIST_PRORATION_METHOD_LABELS: Record<
  OptionListItemDto['prorationMethod'],
  string
> = {
  proration: '日割り計算',
  fixed: '固定金額',
};

/** 状態 filter — the URL keeps `active` / `inactive`; the request sends `isActive`. */
export const OPTION_LIST_STATUS_LABELS = {
  active: '有効',
  inactive: '無効',
} as const;

export type OptionListStatusFilter = keyof typeof OPTION_LIST_STATUS_LABELS;

/**
 * API-085 renders all 9 categories: the 6 CRM-registrable ones of G-02 FR-002 plus 3
 * system-reserved ones seeded by the backend, which G-02 gives no label for.
 */
export const OPTION_DETAIL_CATEGORY_LABELS: Record<OptionDetailDto['category'], string> = {
  supplement: 'サプリメント',
  drink: 'ドリンク',
  rental: 'レンタル',
  locker_option: 'ロッカー',
  insurance: '保険・保証',
  service: 'サービス',
  lesson_plan: 'レッスンプラン',
  oneday_pass: '1DayPass',
  one_time_pass: '1TimePass',
};

/**
 * 制約設定「変更可否」has no field of its own: it is the 変更 part of 利用可否ルール
 * (`usability`), so it is derived rather than stored.
 */
export function allowsMemberChange(usability: OptionDetailDto['usability']): boolean {
  return usability === 'full' || usability === 'change_cancel_only';
}
