import { PREFECTURES } from '@/constants/app.constants';

import type { FcManagedStoreDto } from '@/lib/api-real/types.gen';

export const FRANCHISE_COMPANY_BASIC_INFO_LABELS = {
  code: 'FC企業ID',
  legalName: '法人名（正式名称）',
  displayName: '法人名（表示名）',
  corporateNumber: '法人番号',
  authProvider: '認証方式',
  representativeName: '代表者名',
  headOfficeAddress: '本社所在地',
  phone: '電話番号',
  contactPersonName: '担当者名',
  contactPersonEmail: '担当者メールアドレス',
  contactPersonPhone: '担当者電話番号',
  fcContractStartDate: 'FC契約開始日',
  fcContractRenewalDate: 'FC契約更新日',
  royaltyRate: 'ロイヤリティ率',
  note: '備考',
} as const;

export const FRANCHISE_COMPANY_HISTORY_LABELS = {
  changedAt: '日時',
  operator: '操作者',
  change: '変更内容',
} as const;

export const FRANCHISE_COMPANY_LINKED_STORE_LABELS = {
  code: '店舗ID',
  name: '店舗名',
  brand: 'ブランド',
  prefecture: '都道府県',
  status: 'ステータス',
} as const;

/** Managed-stores tab / link-dialog page size — API max (D14); the history tab is paged instead */
export const FRANCHISE_COMPANY_TAB_LIMIT = 100;

type StoreStatus = FcManagedStoreDto['status'];

/** Y-02 store lifecycle — 4 independent badges */
export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  preparing: '準備中',
  operating: '営業中',
  temporarily_closed: '休業中',
  closed: '閉店',
};

/** 閉店 is muted, never a fixed success colour (9/17 prototype) */
export const STORE_STATUS_BADGE_CLASSES: Record<StoreStatus, string> = {
  preparing: 'bg-info/15 text-info border-info/20',
  operating: 'bg-success/15 text-success border-success/20',
  temporarily_closed: 'bg-warning/15 text-warning border-warning/20',
  closed: 'bg-muted text-muted-foreground border-border',
};

/**
 * The real API's `brandEnum` (same map as `store-selector.tsx`) — kept independent of the
 * mock `Brand` enum that `BrandBadge` is keyed by.
 */
export const REAL_BRAND_BADGE_CONTENT: Record<string, { label: string; colorToken: string }> = {
  Joyfit: { label: 'JOYFIT', colorToken: 'primary' },
  Fit365: { label: 'FIT365', colorToken: 'destructive' },
  JoyfitPlus: { label: 'JOYFIT+', colorToken: 'warning' },
  JoyfitYoga: { label: 'JOYFIT YOGA', colorToken: 'success' },
  Joyfit24: { label: 'JOYFIT24', colorToken: 'info' },
};

export function getRealBrandBadgeContent(brandEnum: string) {
  return REAL_BRAND_BADGE_CONTENT[brandEnum] ?? { label: brandEnum || '—', colorToken: '' };
}

/** `prefecture` is the JIS X 0401 code as stored (`"13"` = 東京都); unknown values pass through */
export function getPrefectureLabel(code: string | null | undefined): string {
  if (!code) return '—';
  const index = Number(code);
  if (Number.isInteger(index) && index >= 1 && index <= PREFECTURES.length) {
    return PREFECTURES[index - 1];
  }
  return code;
}
