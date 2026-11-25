import { BRAND_ENUM_LABELS } from '@/components/common/brand-badge';

import type {
  NoticeBrandCode,
  NoticeBrandScope,
  NoticeChannel,
  NoticeDisplayStatus,
  NoticeSortKey,
  NoticeSortOrder,
} from '../_types/notice.type';

/*
 * Screen-independent constants of the I-02 article lists (ブログ / お知らせ),
 * specs/announcement-list research R1. Screen copy, option lists and WP labels stay per screen.
 */

// --- Enum values (the notice enums are inline unions in types.gen, so no generated const object
// exists; these are the single source for URL parsers and Zod schemas). ---
export const NOTICE_BRAND_CODES = [
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
  'Fit365',
] as const satisfies readonly NoticeBrandCode[];
export const NOTICE_BRAND_SCOPES = [
  'company',
  'brand',
  'store',
] as const satisfies readonly NoticeBrandScope[];
export const NOTICE_CHANNELS = ['web', 'app'] as const satisfies readonly NoticeChannel[];
export const NOTICE_DISPLAY_STATUSES = [
  'draft',
  'scheduled',
  'published',
  'unpublished',
  'deleted',
] as const satisfies readonly NoticeDisplayStatus[];

// --- Paging (prototype PAGE_SIZE_OPTIONS, default 50) ---
export const NOTICE_PAGE_SIZES = [25, 50, 100] as const;
export const NOTICE_DEFAULT_PAGE_SIZE = 50;

// --- Sort (blog-list research R8: default articleNo desc) ---
export const NOTICE_DEFAULT_SORT: NoticeSortKey = 'articleNo';
export const NOTICE_DEFAULT_ORDER: NoticeSortOrder = 'desc';

// --- 配信スコープ labels (filters / detail 配信対象; the お知らせ list badge uses its own short copy) ---
export const NOTICE_SCOPE_LABELS: Record<NoticeBrandScope, string> = {
  company: '全社',
  brand: 'ブランド指定',
  store: '店舗指定',
};

// --- Brand (half-width "JOYFIT+"; shared labels of components/common/brand-badge) ---
export const NOTICE_BRAND_LABELS: Record<NoticeBrandCode, string> = BRAND_ENUM_LABELS;

// --- Display status (prototype getStatusBadge) ---
export const NOTICE_STATUS_LABELS: Record<NoticeDisplayStatus, string> = {
  published: '公開中',
  scheduled: '公開予定',
  draft: '下書き',
  unpublished: '非公開',
  deleted: '削除済み',
};

export const NOTICE_STATUS_BADGE_CLASSES: Record<NoticeDisplayStatus, string> = {
  published: 'bg-success/15 text-success border-success/20',
  scheduled: 'bg-info/15 text-info border-info/20',
  draft: 'bg-muted text-muted-foreground border-border',
  unpublished: 'bg-warning/15 text-warning border-warning/20',
  deleted: 'bg-destructive/15 text-destructive border-destructive/20',
};

// --- 掲載先 cell badges ---
export const NOTICE_CHANNEL_LABELS: Record<NoticeChannel, string> = {
  web: 'WEB',
  app: 'アプリ',
};

/** Prefix of the WP連携 success tooltip ("最終同期 {datetime}"). */
export const NOTICE_WP_SYNC_TOOLTIP_PREFIX = '最終同期';

// --- Filters. `all` = the select's default (no condition). ---
export const NOTICE_FILTER_ALL_VALUE = 'all';
/** 未分類 sentinel accepted by the list's `categoryId` (gap B-09). */
export const NOTICE_CATEGORY_NONE_VALUE = 'none';

/** Head of the 店舗 select; the accessible stores follow. */
export const NOTICE_STORE_FILTER_ALL_OPTION = { value: NOTICE_FILTER_ALL_VALUE, label: '全店舗' };

export const NOTICE_PUBLISH_FROM_PLACEHOLDER = '公開日（開始）';
export const NOTICE_PUBLISH_TO_PLACEHOLDER = '公開日（終了）';

/**
 * Max height of the table scroll area (same approach as banners' `getTableMaxHeightClass`):
 * DataStateBoundary wraps its children in a plain div, so the table cannot size itself from the
 * flex column — it scrolls inside this viewport-relative height instead. The filter-result banner
 * sits inside the card here (prototype), so the "active filters" offsets include its height.
 */
export const getNoticeTableMaxHeightClass = (isFilterOpen: boolean, hasActiveFilters: boolean) => {
  if (isFilterOpen) {
    return hasActiveFilters ? 'max-h-[calc(100vh-372px)]' : 'max-h-[calc(100vh-314px)]';
  }

  return hasActiveFilters ? 'max-h-[calc(100vh-328px)]' : 'max-h-[calc(100vh-270px)]';
};
