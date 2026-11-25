import type {
  OptionAreaRestriction,
  OptionCategory,
  OptionMasterChangeHistoryItem,
  OptionMasterDetail,
  OptionMasterListItem,
  OptionPaymentType,
  OptionSubcategory,
  OptionType,
} from '@/app/api/_schemas/option-master.schema';
import { toTaxIncludedPrice } from '@/utils/tax.util';

import type { OptionDiscountRow } from '../types/option-discount.type';

/**
 * Fields the mock derives per row; the seed rows and the create/update payloads carry the
 * single UI-level `option_type` and the tax-exclusive fee instead.
 */
type DerivedOptionFields =
  | 'payment_type'
  | 'is_auto_assigned'
  | 'price_including_tax'
  | 'subcategory';

export type OptionMasterListItemInput = Omit<OptionMasterListItem, DerivedOptionFields>;

/** Everything `buildOptionMasterDetail` fills in itself, so callers can pin any of it. */
export type OptionMasterDetailOverrides = Partial<
  Omit<OptionMasterDetail, keyof OptionMasterListItemInput>
>;

/**
 * Type mapping: monthly = `monthly_billing` & !auto / per-use = `per_use` & !auto /
 * auto-assigned = auto. The real API only carries this pair; `option_type` is the UI-level grouping.
 */
export function optionPaymentFields(option_type: OptionType): {
  payment_type: OptionPaymentType;
  is_auto_assigned: boolean;
} {
  switch (option_type) {
    case 'metered':
      return { payment_type: 'per_use', is_auto_assigned: false };
    case 'auto_attached':
      return { payment_type: 'monthly_billing', is_auto_assigned: true };
    default:
      return { payment_type: 'monthly_billing', is_auto_assigned: false };
  }
}

/** Service names that map onto a service type, whichever billing type the option uses. */
const SUBCATEGORY_BY_NAME: ReadonlyArray<[string, OptionSubcategory]> = [
  ['水素水', 'hydrogen_water'],
  ['プロテイン', 'protein'],
  ['シャワー', 'shower'],
  ['タンニング', 'tanning'],
  ['日焼け', 'tanning'],
  ['コラーゲン', 'collagen'],
  ['体組成', 'body_planner'],
];

/**
 * G-02 FR-002 (260731_v3): the service type is independent of the billing type, so options billed
 * differently may share one. The seeded auto-assigned rows carry none, matching the prototype's
 * mock data.
 */
export function inferOptionSubcategory(
  option: Pick<OptionMasterListItem, 'option_type' | 'code' | 'name'>,
): OptionSubcategory | null {
  if (option.option_type === 'auto_attached') return null;
  if (option.code.startsWith('PRO')) return 'protein';
  if (option.code.startsWith('H2O')) return 'hydrogen_water';
  if (option.code.startsWith('SHW')) return 'shower';
  const matched = SUBCATEGORY_BY_NAME.find(([keyword]) => option.name.includes(keyword));
  if (matched) return matched[1];
  return option.option_type === 'metered' ? 'supplement' : null;
}

export function inferOptionAreaRestrictions(
  option: Pick<OptionMasterListItem, 'code'>,
): OptionAreaRestriction[] {
  if (option.code.startsWith('PRO')) return ['protein_bar'];
  if (option.code.startsWith('LCK') || option.code.startsWith('LK-')) return ['locker_area'];
  return [];
}

export function inferOptionCategory(
  option: Pick<OptionMasterListItem, 'code' | 'name'>,
): OptionCategory {
  if (option.code.startsWith('LCK')) return 'locker';
  if (option.code.startsWith('SPT')) return 'insurance';
  if (option.code.startsWith('TWL')) return 'rental';
  if (
    option.code.startsWith('PRO') ||
    option.code.startsWith('DRK') ||
    option.code.startsWith('H2O')
  ) {
    return 'drink';
  }
  if (
    option.code.startsWith('SHW') ||
    option.code.startsWith('WIF') ||
    option.code.startsWith('MNT')
  ) {
    return 'service';
  }
  if (option.name.includes('サプリ')) return 'supplement';
  return 'service';
}

export function toOptionMasterListItem(option: OptionMasterDetail): OptionMasterListItem {
  return {
    id: option.id,
    name: option.name,
    code: option.code,
    category: option.category,
    brand: option.brand,
    option_type: option.option_type,
    payment_type: option.payment_type,
    is_auto_assigned: option.is_auto_assigned,
    price_excluding_tax: option.price_excluding_tax,
    price_including_tax: option.price_including_tax,
    tax_rate: option.tax_rate,
    prorated_enabled: option.prorated_enabled,
    prorata_method: option.prorata_method,
    usage_rule: option.usage_rule,
    linked_contracts: option.linked_contracts,
    member_count: option.member_count,
    store_id: option.store_id,
    store_name: option.store_name,
    store_count: option.store_count,
    accounting_code: option.accounting_code,
    status: option.status,
    description: option.description,
    subcategory: option.subcategory,
  };
}

export function buildOptionMasterDetail(
  option: OptionMasterListItemInput,
  overrides: OptionMasterDetailOverrides = {},
): OptionMasterDetail {
  const changeAllowed =
    option.usage_rule === 'add_remove_change' || option.usage_rule === 'change_remove';

  return {
    ...option,
    ...optionPaymentFields(option.option_type),
    // The tax-exclusive price is the source of truth; the tax-inclusive price is derived by rounding DOWN.
    price_including_tax: toTaxIncludedPrice(option.price_excluding_tax, option.tax_rate),
    option_category: overrides.option_category ?? inferOptionCategory(option),
    description:
      option.description ??
      `${option.name}をご利用いただけるオプションサービスです。ご利用条件は契約内容に準じます。`,
    note: overrides.note ?? (option.store_name ? `${option.store_name}限定オプションです。` : null),
    member_app_image: overrides.member_app_image ?? null,
    created_at: overrides.created_at ?? '2024-04-01T10:00:00+09:00',
    updated_at: overrides.updated_at ?? '2026-01-15T14:30:00+09:00',
    popularity_rank: overrides.popularity_rank ?? null,
    popularity_total: overrides.popularity_total ?? 0,
    // An explicit `subcategory` key wins even when it is null: since G-02 FR-002 (260731_v3) made
    // the service type optional, "unset" is a real user choice and must not be re-inferred.
    subcategory:
      'subcategory' in overrides ? (overrides.subcategory ?? null) : inferOptionSubcategory(option),
    constraint_main_option_change:
      overrides.constraint_main_option_change ?? option.option_type !== 'auto_attached',
    constraint_change: overrides.constraint_change ?? changeAllowed,
    area_restrictions: overrides.area_restrictions ?? inferOptionAreaRestrictions(option),
  };
}

export function buildOptionMasterChangeHistory(
  option: OptionMasterDetail,
): OptionMasterChangeHistoryItem[] {
  const currentStatus = option.status === 'active' ? '有効' : '無効';
  const previousStatus = option.status === 'active' ? '無効' : '有効';

  return [
    {
      date: '2026/02/15 14:30',
      user: '管理者A',
      field: '説明文',
      from: `${option.name}をご利用いただけるオプションです。`,
      to: option.description ?? `${option.name}をご利用いただけるオプションサービスです。`,
    },
    {
      date: '2025/10/01 09:00',
      user: '管理者B',
      field: '月額料金',
      from: `¥${Math.max(option.price_excluding_tax - 100, 0).toLocaleString()}`,
      to: `¥${option.price_excluding_tax.toLocaleString()}`,
    },
    {
      date: '2025/04/01 10:00',
      user: '管理者C',
      field: 'ステータス',
      from: previousStatus,
      to: currentStatus,
    },
    {
      date: '2024/04/01 10:00',
      user: '管理者A',
      field: null,
      from: null,
      to: '新規作成',
    },
  ];
}

/**
 * Mirrors the prototype's set discounts (`set-discount.tsx`). Set discounts are FIT365-only (G-02 L124 #353),
 * so every target option is a FIT365 option-master name that is not a locker contract type; the
 * prototype's パーソナルロッカー（L） is a `locker_option` here, so SD003 targets ドリンクバー（月額） instead.
 */
export const SEED_OPTION_DISCOUNT_ROWS: OptionDiscountRow[] = [
  {
    id: 'SD001',
    name: 'デイタイム＋水素水セット',
    target_options: ['水素水'],
    discount_type: 'fixed_amount',
    discount_value: 330,
    conditions: 'simultaneous',
    status: 'active',
    description:
      'デイタイム会員プランと水素水オプションを同時にお申し込みいただくと、月額料金から¥330を割引いたします。既存会員がオプションを追加する場合も適用対象となります。',
    applied_count: 180,
    created_at: '2025/06/20 16:45',
    updated_at: '2026/03/01 10:30',
    updated_by: 'テストユーザー',
  },
  {
    id: 'SD002',
    name: 'デイタイム＋プロテインセット',
    target_options: ['プロテインサーバー'],
    discount_type: 'fixed_amount',
    discount_value: 220,
    conditions: 'simultaneous',
    status: 'active',
    description: null,
    applied_count: 95,
    created_at: '2025/06/20 16:45',
    updated_at: '2026/03/01 10:30',
    updated_by: '管理者A',
  },
  {
    id: 'SD003',
    name: 'ウィークエンド＋ドリンクバーセット',
    target_options: ['ドリンクバー（月額）'],
    discount_type: 'percentage',
    discount_value: 10,
    conditions: 'family_2_plus',
    status: 'active',
    description: null,
    applied_count: 42,
    created_at: '2025/06/20 16:45',
    updated_at: '2026/03/01 10:30',
    updated_by: '管理者A',
  },
  {
    id: 'SD004',
    name: 'ステーシア＋プロテインセット',
    target_options: ['プロテインサーバー'],
    discount_type: 'fixed_amount',
    discount_value: 110,
    conditions: 'simultaneous',
    status: 'active',
    description: null,
    applied_count: 65,
    created_at: '2025/06/20 16:45',
    updated_at: '2026/03/01 10:30',
    updated_by: '管理者A',
  },
  {
    id: 'SD005',
    name: '法人全部入りセット',
    target_options: ['水素水', 'プロテインサーバー', 'ドリンクバー（月額）'],
    discount_type: 'fixed_amount',
    discount_value: 550,
    conditions: 'simultaneous',
    status: 'inactive',
    description: null,
    applied_count: 0,
    created_at: '2025/06/20 16:45',
    updated_at: '2026/03/01 10:30',
    updated_by: '管理者A',
  },
];
