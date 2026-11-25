import type { BlacklistDetailDto } from '@/lib/api-real/types.gen';

// ─── Derived Types ────────────────────────────────────────────────────────────

export type BlacklistDetail = BlacklistDetailDto;

/** The registration-path axis (強制退会 / 手動登録). */
export type BlacklistSource = BlacklistDetailDto['source'];

/** The reason axis written by the registration form. */
export type BlacklistReasonCategory = BlacklistDetailDto['reasonCategories'][number];

// ─── Page size ────────────────────────────────────────────────────────────────

/**
 * FR-032 — V0 offers 25 / 50 / 100 / 200 with a default of 50. 200 is not built: both
 * the mock request schema and the real endpoint cap `limit` at 100, so a 200-row request
 * is rejected outright. The default follows the CRM-wide `PAGE_SIZE` (25) rather than
 * V0's 50, matching A-03 (spec Q-08 / research §2).
 */
export const BLACKLIST_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * FR-016 — mirrors the `query` max length (60) of GET /admin/blacklist. Enforced on the input as
 * well so an over-long paste is capped where the operator can see it, instead of coming
 * back as a 400 and an error toast.
 */
export const BLACKLIST_SEARCH_MAX_LENGTH = 60;

/**
 * FR-036 — the registration Sheet's 会員番号 lookup shares the same `search` parameter as
 * the list, so it inherits the same 60-character cap. Without it the field accepted
 * unbounded input and sent it as a query, which is also inconsistent with the list's own
 * search box capping at 60.
 */
export const MEMBER_NUMBER_MAX_LENGTH = BLACKLIST_SEARCH_MAX_LENGTH;

/** Mirrors the `memo` max length (2000) of RegisterBlacklistDto; the PO spec sets no limit. */
export const BLACKLIST_MEMO_MAX_LENGTH = 2000;

// ─── Label Maps ───────────────────────────────────────────────────────────────

/**
 * The **registration-path** axis — what the list's 登録経路 column and filter show. Not to
 * be confused with `BLACKLIST_REASON_CATEGORY_LABEL`, the reason axis shown as 登録理由.
 */
export const BLACKLIST_SOURCE_LABEL: Record<BlacklistSource, string> = {
  forced_withdrawal: '強制退会',
  manual: '手動登録',
};

/**
 * The **reason** axis — written by the registration form, shown as 登録理由 on the list
 * and the detail (FR-043a).
 */
export const BLACKLIST_REASON_CATEGORY_LABEL: Record<BlacklistReasonCategory, string> = {
  nuisance: '迷惑行為',
  unpaid: '未納金',
  fraudulent_use: '不正利用',
  other: 'その他',
  equipment_damage: '機器破損',
};

/** The 未納金 filter's URL values; sent to the API as `hasUnpaid` true / false. */
export const UNPAID_FILTER_VALUES = ['has_unpaid', 'no_unpaid'] as const;

export type UnpaidFilter = (typeof UNPAID_FILTER_VALUES)[number];

export const UNPAID_FILTER_LABEL: Record<UnpaidFilter, string> = {
  has_unpaid: '未納金：あり',
  no_unpaid: '未納金：なし',
};

/**
 * FR-043a — 登録理由 as displayed. The contract carries an array, but every surface writes
 * one value; legacy rows carry `[]`, which degrades to an em dash.
 */
export function formatBlacklistReasons(categories: readonly BlacklistReasonCategory[]): string {
  if (categories.length === 0) return '—';
  return categories.map((category) => BLACKLIST_REASON_CATEGORY_LABEL[category]).join('・');
}

// ─── Filter Option Lists ──────────────────────────────────────────────────────

export const BLACKLIST_SOURCE_OPTIONS = [
  { value: 'all', label: '全登録経路' },
  ...(['forced_withdrawal', 'manual'] as const).map((value) => ({
    value,
    label: BLACKLIST_SOURCE_LABEL[value],
  })),
];

export const UNPAID_FILTER_OPTIONS = [
  { value: 'all', label: '未納金：全件' },
  ...UNPAID_FILTER_VALUES.map((value) => ({
    value,
    label: UNPAID_FILTER_LABEL[value],
  })),
];

/**
 * FR-043 — what the registration Sheet and the 会員詳細 dialog offer, in prototype order.
 * `equipment_damage` joined the list with the 2026-09-17 design update; it used to be reachable
 * only through migrated legacy rows.
 */
export const BLACKLIST_REASON_CATEGORIES = [
  'nuisance',
  'unpaid',
  'fraudulent_use',
  'equipment_damage',
  'other',
] as const satisfies readonly BlacklistReasonCategory[];

export const BLACKLIST_REASON_OPTIONS: { value: BlacklistReasonCategory; label: string }[] =
  BLACKLIST_REASON_CATEGORIES.map((value) => ({
    value,
    label: BLACKLIST_REASON_CATEGORY_LABEL[value],
  }));

// ─── Badge classes ────────────────────────────────────────────────────────────

export function getBlacklistSourceBadgeClass(source: BlacklistSource): string {
  if (source === 'forced_withdrawal') {
    return 'bg-destructive/15 text-destructive border-destructive/20';
  }
  return 'bg-warning/15 text-warning border-warning/20';
}
