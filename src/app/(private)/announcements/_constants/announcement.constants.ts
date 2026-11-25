import type {
  NoticeConfirmCopy,
  NoticeConfirmKind,
} from '@/app/(private)/blogs/_components/notice-confirm-dialog';
import type { NoticeRowMenuPermissions } from '@/app/(private)/blogs/_components/notice-row-menu';
import {
  NOTICE_BRAND_LABELS,
  NOTICE_CATEGORY_NONE_VALUE,
  NOTICE_FILTER_ALL_VALUE,
  NOTICE_STATUS_LABELS,
} from '@/app/(private)/blogs/_constants/notice.constants';
import type { NoticeActionToasts } from '@/app/(private)/blogs/_hooks/use-notice-row-actions.hook';
import type {
  NoticeBrandCode,
  NoticeBrandScope,
  NoticeChannel,
  NoticeDisplayStatus,
  NoticeRow,
  NoticeSortKey,
  NoticeWpSyncStatus,
} from '@/app/(private)/blogs/_types/notice.type';
import { getTargetBrandCodes } from '@/app/(private)/blogs/_utils/notice-row.util';
import { AlertTriangle, Clock, type LucideIcon } from 'lucide-react';

import { Permission } from '@/types/permission.type';

// Screen constants of お知らせ一覧 (specs/announcement-list); shared notice values come from the
// blog route (research R1). Prototype: fitness-crm-ui announcement-list.tsx@47d60ac.

export const ANNOUNCEMENT_PAGE_TITLE = 'お知らせ管理';
export const ANNOUNCEMENT_ENTITY_LABEL = 'お知らせ';
export const ANNOUNCEMENT_SEARCH_PLACEHOLDER = 'キーワードで検索...';
export const ANNOUNCEMENT_LIST_ERROR_TITLE = 'お知らせ一覧の取得に失敗しました';

// --- Sort (prototype L667-L686; 掲載終了日 = gap AL-02) ---
export const ANNOUNCEMENT_SORT_KEYS = [
  'articleNo',
  'publishStartAt',
  'publishEndAt',
  'title',
  'brandScope',
  'status',
] as const satisfies readonly NoticeSortKey[];

// --- 配信スコープ badge (prototype L189-L198, L734: the badge shows the bare scope) ---
export const ANNOUNCEMENT_SCOPE_LABELS: Record<NoticeBrandScope, string> = {
  company: '全社',
  brand: 'ブランド',
  store: '店舗',
};

export const ANNOUNCEMENT_SCOPE_BADGE_VARIANTS: Record<
  NoticeBrandScope,
  'default' | 'secondary' | 'outline'
> = {
  company: 'default',
  brand: 'secondary',
  store: 'outline',
};

// --- 対象 text (FR-005, data-model "対象 text") ---
const ANNOUNCEMENT_TARGET_ALL_LABEL = '全ブランド・全店舗';
const ANNOUNCEMENT_TARGET_JOINER = ' · ';

/** 全ブランド・全店舗 / brand labels / store names, joined with " · " (prototype L736). */
export function getAnnouncementTargetLabel(row: NoticeRow): string {
  if (row.brandScope === 'company') return ANNOUNCEMENT_TARGET_ALL_LABEL;
  if (row.brandScope === 'store') {
    return row.targetStores.map((store) => store.name).join(ANNOUNCEMENT_TARGET_JOINER);
  }
  return getTargetBrandCodes(row)
    .map((code) => NOTICE_BRAND_LABELS[code])
    .join(ANNOUNCEMENT_TARGET_JOINER);
}

// --- WP連携 (live prototype 2026-11-20 + Clarification Q1: 成功 / 失敗 / 未同期) ---
export const ANNOUNCEMENT_WP_SYNC_LABELS: Record<NoticeWpSyncStatus, string> = {
  success: '成功',
  failed: '失敗',
  pending: '未同期',
};

export const ANNOUNCEMENT_WP_SYNC_ICONS: Record<NoticeWpSyncStatus, LucideIcon | null> = {
  success: null,
  failed: AlertTriangle,
  pending: Clock,
};

export const ANNOUNCEMENT_WP_SYNC_BADGE_CLASSES: Record<NoticeWpSyncStatus, string> = {
  success: 'text-muted-foreground',
  failed: 'bg-destructive/15 text-destructive border-destructive/20',
  pending: 'bg-muted text-muted-foreground border-border',
};

export const announcementWpSyncFailedTooltip = (lastTriedAt: string) =>
  `同期に失敗（最終試行 ${lastTriedAt}）。詳細画面で確認してください`;

// --- Row menu permissions ---
export const ANNOUNCEMENT_ROW_MENU_PERMISSIONS: NoticeRowMenuPermissions = {
  edit: Permission.AnnouncementsEdit,
  publish: Permission.AnnouncementsPublish,
  delete: Permission.AnnouncementsDelete,
  restore: Permission.AnnouncementsRestore,
};

// --- Filters, V0 order (prototype L556-L648). `all` = the select's default (no condition). ---
type FilterOption<T extends string> = { value: T | typeof NOTICE_FILTER_ALL_VALUE; label: string };

/** お知らせ categories for the カテゴリ select; the master caps `limit` at 200. */
export const ANNOUNCEMENT_CATEGORY_LIST_QUERY = {
  type: 'notice',
  sort: 'order',
  order: 'asc',
  limit: 200,
} as const;

/** Fixed head of the カテゴリ select; お知らせ categories follow. */
export const ANNOUNCEMENT_CATEGORY_FILTER_HEAD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: NOTICE_FILTER_ALL_VALUE, label: '全カテゴリ' },
  { value: NOTICE_CATEGORY_NONE_VALUE, label: '未分類' },
];

export const ANNOUNCEMENT_SCOPE_FILTER_OPTIONS: FilterOption<NoticeBrandScope>[] = [
  { value: NOTICE_FILTER_ALL_VALUE, label: '全スコープ' },
  { value: 'company', label: '全社' },
  { value: 'brand', label: 'ブランド指定' },
  { value: 'store', label: '店舗指定' },
];

export const ANNOUNCEMENT_BRAND_FILTER_OPTIONS: FilterOption<NoticeBrandCode>[] = [
  { value: NOTICE_FILTER_ALL_VALUE, label: '全ブランド' },
  { value: 'Joyfit', label: NOTICE_BRAND_LABELS.Joyfit },
  { value: 'JoyfitYoga', label: NOTICE_BRAND_LABELS.JoyfitYoga },
  { value: 'Joyfit24', label: NOTICE_BRAND_LABELS.Joyfit24 },
  { value: 'JoyfitPlus', label: NOTICE_BRAND_LABELS.JoyfitPlus },
  { value: 'Fit365', label: NOTICE_BRAND_LABELS.Fit365 },
];

export const ANNOUNCEMENT_CHANNEL_FILTER_OPTIONS: FilterOption<NoticeChannel>[] = [
  { value: NOTICE_FILTER_ALL_VALUE, label: '全掲載先' },
  { value: 'web', label: 'WEBサイト' },
  { value: 'app', label: 'モバイルアプリ' },
];

export const ANNOUNCEMENT_STATUS_FILTER_OPTIONS: FilterOption<NoticeDisplayStatus>[] = [
  { value: NOTICE_FILTER_ALL_VALUE, label: '全ステータス' },
  { value: 'published', label: NOTICE_STATUS_LABELS.published },
  { value: 'scheduled', label: NOTICE_STATUS_LABELS.scheduled },
  { value: 'draft', label: NOTICE_STATUS_LABELS.draft },
  { value: 'unpublished', label: NOTICE_STATUS_LABELS.unpublished },
  { value: 'deleted', label: '削除済み（ゴミ箱）' },
];

export const ANNOUNCEMENT_PUBLISH_END_FROM_PLACEHOLDER = '掲載終了日（開始）';
export const ANNOUNCEMENT_PUBLISH_END_TO_PLACEHOLDER = '掲載終了日（終了）';

// --- Row actions (prototype L978-L1063, L833) ---
export const ANNOUNCEMENT_CONFIRM_COPY: Record<NoticeConfirmKind, NoticeConfirmCopy> = {
  unpublish: {
    title: 'お知らせを非公開にしますか？',
    description: (title) =>
      `「${title}」を非公開に変更します。WEBサイトやアプリから表示されなくなります。`,
    confirmLabel: '非公開にする',
    destructive: false,
  },
  publish: {
    title: 'お知らせを公開しますか？',
    description: (title) =>
      `「${title}」を即時公開します。WEBサイトやアプリに表示されるようになります。`,
    confirmLabel: '公開する',
    destructive: false,
  },
  delete: {
    title: 'お知らせを削除しますか？',
    description: (title) => `「${title}」をゴミ箱に移動します。一定期間内であれば復元できます。`,
    confirmLabel: '削除する',
    destructive: true,
  },
};

export const ANNOUNCEMENT_ACTION_TOASTS: NoticeActionToasts = {
  published: 'お知らせを公開しました',
  unpublished: 'お知らせを非公開にしました',
  deleted: {
    title: 'お知らせを削除しました',
    description: 'ゴミ箱に移動しました。一定期間内であれば復元できます',
  },
  restored: { title: 'お知らせを復元しました', description: '非公開の状態で復元されています' },
};

// --- Table height ---
/**
 * Max height of the table scroll area. Same approach as the blog list's helper, but the お知らせ
 * filter panel has two date ranges and wraps onto a second row (+40px: one 32px control row + 8px
 * gap), so the "panel open" offsets are larger.
 */
export const getAnnouncementTableMaxHeightClass = (
  isFilterOpen: boolean,
  hasActiveFilters: boolean,
) => {
  if (isFilterOpen) {
    return hasActiveFilters ? 'max-h-[calc(100vh-412px)]' : 'max-h-[calc(100vh-354px)]';
  }

  return hasActiveFilters ? 'max-h-[calc(100vh-328px)]' : 'max-h-[calc(100vh-270px)]';
};

// --- Preview (prototype L901-L976) ---
export const ANNOUNCEMENT_PREVIEW_URL_BASE = 'https://www.joyfit.jp/news/';
