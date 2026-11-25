import { API_PAGE_SIZE_OPTIONS } from '@/constants/app.constants';

import type {
  AdminFcCompanyControllerListData,
  FcCompanyDetailDto,
} from '@/lib/api-real/types.gen';

export type FcManagementType = FcCompanyDetailDto['managementType'];
export type FcAuthProvider = NonNullable<FcCompanyDetailDto['authProvider']>;
type FcCompanyListQuery = NonNullable<AdminFcCompanyControllerListData['query']>;
export type FcCompanyListSort = NonNullable<FcCompanyListQuery['sort']>;
export type FcCompanyListOrder = NonNullable<FcCompanyListQuery['order']>;

export const FRANCHISE_COMPANY_DEFAULT_PAGE_SIZE = 50;

/** D5: API `limit` max is 100 — same set as the 9/17 prototype */
export const FRANCHISE_COMPANY_PAGE_SIZE_OPTIONS = API_PAGE_SIZE_OPTIONS;
export const FRANCHISE_COMPANY_MAX_PAGE_SIZE = 100;

/** API `page` minimum — a hand-edited `?page=-1` is clamped up to this */
export const FRANCHISE_COMPANY_MIN_PAGE = 1;

/** API `keyword` maxLength — 101文字以上は 400 になるため入力・URL とも上限で止める */
export const FRANCHISE_COMPANY_SEARCH_MAX_LENGTH = 100;

export const MANAGEMENT_TYPE = {
  DIRECT: 'direct_management',
  FRANCHISE: 'franchise',
  ENTRUSTMENT: 'entrustment',
} as const satisfies Record<string, FcManagementType>;

/**
 * Y-03 A-2 直営・FC・業務委託 — all three classifications are selectable (user direction
 * 2026-09-24). Labels follow the prototype (直営 / FC, form 直営 / フランチャイズ（FC）); the
 * prototype has no third value, so 業務委託 uses the spec's wording.
 */
export const MANAGEMENT_TYPE_SELECTABLE_VALUES = [
  MANAGEMENT_TYPE.DIRECT,
  MANAGEMENT_TYPE.FRANCHISE,
  MANAGEMENT_TYPE.ENTRUSTMENT,
] as const satisfies readonly FcManagementType[];

export type FcSelectableManagementType = (typeof MANAGEMENT_TYPE_SELECTABLE_VALUES)[number];

export const MANAGEMENT_TYPE_LABELS: Record<FcManagementType, string> = {
  direct_management: '直営',
  franchise: 'FC',
  entrustment: '業務委託',
};

export const MANAGEMENT_TYPE_FORM_LABELS: Record<FcSelectableManagementType, string> = {
  direct_management: '直営',
  franchise: 'フランチャイズ（FC）',
  entrustment: '業務委託',
};

export const MANAGEMENT_TYPE_BADGE_CLASSES: Record<FcManagementType, string> = {
  direct_management: 'bg-success/15 text-success border-success/20',
  franchise: '',
  entrustment: '',
};

export const FRANCHISE_COMPANY_ACTIVE_LABEL = '有効';
export const FRANCHISE_COMPANY_INACTIVE_LABEL = '無効';

export function getActiveLabel(isActive: boolean) {
  return isActive ? FRANCHISE_COMPANY_ACTIVE_LABEL : FRANCHISE_COMPANY_INACTIVE_LABEL;
}

export function getActiveBadgeClass(isActive: boolean) {
  return isActive
    ? 'bg-success/15 text-success border-success/20'
    : 'bg-muted text-muted-foreground border-border';
}

/** URL value of the status filter — the API takes a boolean `isActive` */
export const FRANCHISE_COMPANY_STATUS_FILTER_VALUES = ['active', 'inactive'] as const;
export type FcCompanyStatusFilter = (typeof FRANCHISE_COMPANY_STATUS_FILTER_VALUES)[number];

export const FRANCHISE_COMPANY_STATUS_FILTER_LABELS: Record<FcCompanyStatusFilter, string> = {
  active: FRANCHISE_COMPANY_ACTIVE_LABEL,
  inactive: FRANCHISE_COMPANY_INACTIVE_LABEL,
};

export const FRANCHISE_COMPANY_TYPE_OPTIONS = [
  { value: 'all', label: '全区分' },
  ...MANAGEMENT_TYPE_SELECTABLE_VALUES.map((value) => ({
    value,
    label: MANAGEMENT_TYPE_LABELS[value],
  })),
] as const;

export const FRANCHISE_COMPANY_STATUS_OPTIONS = [
  { value: 'all', label: '全ステータス' },
  ...FRANCHISE_COMPANY_STATUS_FILTER_VALUES.map((value) => ({
    value,
    label: FRANCHISE_COMPANY_STATUS_FILTER_LABELS[value],
  })),
] as const;

/** Sortable list columns (FR-004) → API `sort` key */
export const FRANCHISE_COMPANY_SORT_COLUMNS = ['code', 'displayName'] as const;
export type FcCompanySortColumn = (typeof FRANCHISE_COMPANY_SORT_COLUMNS)[number];

/** URL `sortBy` values — the sortable columns plus the initial order, which has no column */
export const FRANCHISE_COMPANY_SORT_BY_VALUES = [
  ...FRANCHISE_COMPANY_SORT_COLUMNS,
  'createdAt',
] as const;
export type FcCompanySortBy = (typeof FRANCHISE_COMPANY_SORT_BY_VALUES)[number];

export const FRANCHISE_COMPANY_SORT_KEY: Record<FcCompanySortBy, FcCompanyListSort> = {
  code: 'code',
  displayName: 'displayName',
  createdAt: 'createdAt',
};

/** Initial list order: newest registration first */
export const FRANCHISE_COMPANY_DEFAULT_SORT = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
} as const satisfies { sortBy: FcCompanySortBy; sortOrder: FcCompanyListOrder };

/** Y-03 FR-002 認証方式 — API `authProvider` (`google` = Google SSO, `cognito` = IDaaS) */
export const FC_AUTH_PROVIDER_VALUES = [
  'google',
  'cognito',
] as const satisfies readonly FcAuthProvider[];

export const FC_AUTH_PROVIDER_LABELS: Record<FcAuthProvider, string> = {
  google: 'Google SSO',
  cognito: 'IDaaS',
};
