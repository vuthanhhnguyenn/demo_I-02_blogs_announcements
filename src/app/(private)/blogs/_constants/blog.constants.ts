import { AlertCircle, Check, Clock, type LucideIcon } from 'lucide-react';

import { UserRole } from '@/types/permission.type';

import type { NoticeConfirmCopy, NoticeConfirmKind } from '../_components/notice-confirm-dialog';
import type {
  NoticeDetailConfirmCopy,
  NoticeDetailConfirmKind,
} from '../_components/notice-detail-confirm-dialog';
import type { NoticeDetailWpSyncConfig } from '../_components/notice-detail-wp-sync-card';
import type { NoticeDetailActionToasts } from '../_hooks/use-notice-detail-actions.hook';
import type { NoticeActionToasts } from '../_hooks/use-notice-row-actions.hook';
import type {
  BlogBrandCode,
  BlogBrandScope,
  BlogChannel,
  BlogDisplayStatus,
  BlogFormBrandId,
  BlogPublishMethod,
  BlogPublishMethodOption,
  BlogSortKey,
  BlogSortOrder,
  BlogWpSyncStatus,
} from '../_types/blog.type';
import {
  NOTICE_DETAIL_DENY_TOOLTIPS,
  NOTICE_DETAIL_EMPTY_BODY,
  NOTICE_DETAIL_STATUS_BADGE_CLASSES,
  NOTICE_DETAIL_STATUS_META_SUFFIX,
} from './notice-detail.constants';
import {
  NOTICE_BRAND_CODES,
  NOTICE_BRAND_LABELS,
  NOTICE_BRAND_SCOPES,
  NOTICE_CATEGORY_NONE_VALUE,
  NOTICE_CHANNELS,
  NOTICE_CHANNEL_LABELS,
  NOTICE_DEFAULT_ORDER,
  NOTICE_DEFAULT_PAGE_SIZE,
  NOTICE_DEFAULT_SORT,
  NOTICE_DISPLAY_STATUSES,
  NOTICE_FILTER_ALL_VALUE,
  NOTICE_PAGE_SIZES,
  NOTICE_PUBLISH_FROM_PLACEHOLDER,
  NOTICE_PUBLISH_TO_PLACEHOLDER,
  NOTICE_SCOPE_LABELS,
  NOTICE_STATUS_BADGE_CLASSES,
  NOTICE_STATUS_LABELS,
  NOTICE_STORE_FILTER_ALL_OPTION,
  NOTICE_WP_SYNC_TOOLTIP_PREFIX,
  getNoticeTableMaxHeightClass,
} from './notice.constants';

// Screen-independent values live in notice.constants.ts (shared with /announcements, research R1);
// the BLOG_* names stay as aliases so blog importers are unchanged.
export const BLOG_BRAND_CODES = NOTICE_BRAND_CODES;
export const BLOG_BRAND_SCOPES = NOTICE_BRAND_SCOPES;
export const BLOG_CHANNELS = NOTICE_CHANNELS;
export const BLOG_DISPLAY_STATUSES = NOTICE_DISPLAY_STATUSES;

// --- Paging (prototype L209 PAGE_SIZE_OPTIONS, L250 default 50) ---
export const BLOG_PAGE_SIZES = NOTICE_PAGE_SIZES;
export const BLOG_DEFAULT_PAGE_SIZE = NOTICE_DEFAULT_PAGE_SIZE;

// --- Sort (research R8: default articleNo desc) ---
export const BLOG_SORT_KEYS = [
  'articleNo',
  'title',
  'brandScope',
  'target',
  'publishStartAt',
  'status',
] as const satisfies readonly BlogSortKey[];
export const BLOG_DEFAULT_SORT: BlogSortKey = NOTICE_DEFAULT_SORT;
export const BLOG_DEFAULT_ORDER: BlogSortOrder = NOTICE_DEFAULT_ORDER;

// --- 配信スコープ (prototype L168-L177 getScopeBadge) ---
export const BLOG_SCOPE_LABELS: Record<BlogBrandScope, string> = NOTICE_SCOPE_LABELS;

export const BLOG_SCOPE_BADGE_VARIANTS: Record<
  BlogBrandScope,
  'default' | 'secondary' | 'outline'
> = {
  company: 'default',
  brand: 'secondary',
  store: 'outline',
};

/** 対象 cell text for 全社 rows (prototype L682). */
export const BLOG_TARGET_ALL_LABEL = '全ブランド・全店舗';

// --- Brand (half-width "JOYFIT+" per prototype L506; shared labels of components/common/brand-badge) ---
export const BLOG_BRAND_LABELS: Record<BlogBrandCode, string> = NOTICE_BRAND_LABELS;

// --- Display status (prototype L138-L151 getStatusBadge) ---
export const BLOG_STATUS_LABELS: Record<BlogDisplayStatus, string> = NOTICE_STATUS_LABELS;

export const BLOG_STATUS_BADGE_CLASSES: Record<BlogDisplayStatus, string> =
  NOTICE_STATUS_BADGE_CLASSES;

// --- 掲載先 cell badges (prototype L694-L707) ---
export const BLOG_CHANNEL_LABELS: Record<BlogChannel, string> = NOTICE_CHANNEL_LABELS;

// --- WP連携 (prototype L184-L188, L712-L733; 同期失敗 / 未同期 added by Clarification Q1) ---
export const BLOG_WP_SYNC_LABELS: Record<BlogWpSyncStatus, string> = {
  success: '同期済み',
  failed: '同期失敗',
  pending: '未同期',
};

export const BLOG_WP_SYNC_BADGE_CLASSES: Record<BlogWpSyncStatus, string> = {
  success: 'text-muted-foreground',
  failed: 'bg-destructive/15 text-destructive border-destructive/20',
  pending: 'bg-muted text-muted-foreground border-border',
};

export const BLOG_WP_SYNC_ICONS: Record<BlogWpSyncStatus, LucideIcon> = {
  success: Check,
  failed: AlertCircle,
  pending: Clock,
};

export const BLOG_WP_SYNC_TOOLTIP_PREFIX = NOTICE_WP_SYNC_TOOLTIP_PREFIX;

// --- Row actions (list confirm dialogs + toasts; shared NoticeConfirmDialog / useNoticeRowActions) ---
export const BLOG_CONFIRM_COPY: Record<NoticeConfirmKind, NoticeConfirmCopy> = {
  unpublish: {
    title: '記事を非公開にしますか？',
    description: () =>
      'この記事は公開中の状態から非公開に変更されます。WEBサイトやアプリから表示されなくなります。',
    confirmLabel: '非公開にする',
    destructive: false,
  },
  publish: {
    title: '記事を公開しますか？',
    description: () => 'この記事は即時公開され、WEBサイトやアプリに表示されるようになります。',
    confirmLabel: '公開する',
    destructive: false,
  },
  delete: {
    title: '記事を削除しますか？',
    description: () => '削除した記事はゴミ箱に移動されます。一定期間内であれば復元できます。',
    confirmLabel: '削除する',
    destructive: true,
  },
};

export const BLOG_ACTION_TOASTS: NoticeActionToasts = {
  published: '記事を公開しました',
  unpublished: '記事を非公開にしました',
  deleted: {
    title: '記事を削除しました',
    description: 'ゴミ箱に移動しました。一定期間内であれば復元できます',
  },
  restored: { title: '記事を復元しました', description: '非公開の状態で復元されています' },
};

// --- Filter options, V0 order (prototype L484-L562). `all` = the select's default (no condition). ---
export const BLOG_FILTER_ALL_VALUE = NOTICE_FILTER_ALL_VALUE;
/** 未分類 sentinel accepted by the list's `categoryId` (gap B-09). */
export const BLOG_CATEGORY_NONE_VALUE = NOTICE_CATEGORY_NONE_VALUE;

type FilterOption<T extends string> = { value: T | typeof BLOG_FILTER_ALL_VALUE; label: string };

/** Blog categories for the カテゴリ select (and the filter summary); the master caps `limit` at 200. */
export const BLOG_CATEGORY_LIST_QUERY = {
  type: 'blog',
  sort: 'order',
  order: 'asc',
  limit: 200,
} as const;

/** Fixed head of the カテゴリ select; blog categories follow. */
export const BLOG_CATEGORY_FILTER_HEAD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: BLOG_FILTER_ALL_VALUE, label: '全カテゴリ' },
  { value: BLOG_CATEGORY_NONE_VALUE, label: '未分類' },
];

export const BLOG_BRAND_FILTER_OPTIONS: FilterOption<BlogBrandCode>[] = [
  { value: BLOG_FILTER_ALL_VALUE, label: '全ブランド' },
  { value: 'Joyfit', label: BLOG_BRAND_LABELS.Joyfit },
  { value: 'JoyfitPlus', label: BLOG_BRAND_LABELS.JoyfitPlus },
  { value: 'JoyfitYoga', label: BLOG_BRAND_LABELS.JoyfitYoga },
  { value: 'Joyfit24', label: BLOG_BRAND_LABELS.Joyfit24 },
  { value: 'Fit365', label: BLOG_BRAND_LABELS.Fit365 },
];

export const BLOG_SCOPE_FILTER_OPTIONS: FilterOption<BlogBrandScope>[] = [
  { value: BLOG_FILTER_ALL_VALUE, label: '全配信範囲' },
  { value: 'company', label: BLOG_SCOPE_LABELS.company },
  { value: 'brand', label: BLOG_SCOPE_LABELS.brand },
  { value: 'store', label: BLOG_SCOPE_LABELS.store },
];

/** Head of the 店舗 select; the accessible stores follow. */
export const BLOG_STORE_FILTER_ALL_OPTION = NOTICE_STORE_FILTER_ALL_OPTION;

export const BLOG_CHANNEL_FILTER_OPTIONS: FilterOption<BlogChannel>[] = [
  { value: BLOG_FILTER_ALL_VALUE, label: '全掲載先' },
  { value: 'web', label: 'WEBサイト' },
  { value: 'app', label: 'モバイルアプリ' },
];

export const BLOG_STATUS_FILTER_OPTIONS: FilterOption<BlogDisplayStatus>[] = [
  { value: BLOG_FILTER_ALL_VALUE, label: '全ステータス' },
  { value: 'published', label: BLOG_STATUS_LABELS.published },
  { value: 'scheduled', label: BLOG_STATUS_LABELS.scheduled },
  { value: 'draft', label: BLOG_STATUS_LABELS.draft },
  { value: 'unpublished', label: BLOG_STATUS_LABELS.unpublished },
  { value: 'deleted', label: '削除済み（ゴミ箱）' },
];

export const BLOG_PUBLISH_FROM_PLACEHOLDER = NOTICE_PUBLISH_FROM_PLACEHOLDER;
export const BLOG_PUBLISH_TO_PLACEHOLDER = NOTICE_PUBLISH_TO_PLACEHOLDER;

export const getBlogTableMaxHeightClass = getNoticeTableMaxHeightClass;

/** Rich-text formats of the article body (read-only render; mirrors LESSON_DESCRIPTION_QUILL_FORMATS). */
export const BLOG_BODY_QUILL_FORMATS = ['header', 'bold', 'italic', 'list', 'link', 'image'];

// Detail constants live in notice-detail.constants.ts (shared with /announcements/[id]); the
// BLOG_DETAIL_* names stay as aliases so blog importers are unchanged.
export const BLOG_DETAIL_STATUS_BADGE_CLASSES = NOTICE_DETAIL_STATUS_BADGE_CLASSES;
export const BLOG_DETAIL_STATUS_META_SUFFIX = NOTICE_DETAIL_STATUS_META_SUFFIX;
export const BLOG_DETAIL_DENY_TOOLTIPS = NOTICE_DETAIL_DENY_TOOLTIPS;
export const BLOG_DETAIL_EMPTY_BODY = NOTICE_DETAIL_EMPTY_BODY;

export const BLOG_DETAIL_WP_NOTES = {
  excluded: 'WEBサイト掲載がOFFのため',
  notLinked: '公開時にWordPressへ連携されます',
  unpublishedSynced: '非公開状態を同期済み',
  deleted: '削除に伴いWordPress側は非公開化されています',
} as const;

/** Detail confirm dialogs (specs/blog-detail FR-011–FR-014). */
export const BLOG_DETAIL_CONFIRM_COPY: Record<NoticeDetailConfirmKind, NoticeDetailConfirmCopy> = {
  unpublish: {
    title: '記事を非公開にしますか？',
    description:
      'この記事は公開中の状態から非公開に変更されます。WEBサイトやアプリから表示されなくなります。',
    confirmLabel: '非公開にする',
    destructive: true,
  },
  cancelSchedule: {
    title: '予約公開を取り消しますか？',
    description: '設定した公開日時での自動公開を取り消し、非公開の状態に戻します。',
    confirmLabel: '予約を取り消す',
    destructive: true,
  },
  delete: {
    title: 'このブログ記事を削除しますか？',
    description:
      '削除した記事は一定期間内であれば復元できます。WEBサイトとアプリから即時に表示されなくなります。',
    confirmLabel: '削除する',
    destructive: true,
  },
  restore: {
    title: '記事を復元しますか？',
    description: 'この記事を非公開状態として復元します。復元後は編集・公開が可能になります。',
    confirmLabel: '復元する',
    destructive: false,
  },
};

export const BLOG_DETAIL_ACTION_TOASTS: NoticeDetailActionToasts = {
  unpublished: '記事を非公開にしました',
  scheduleCancelled: '予約公開を取り消しました',
  deleted: {
    title: '記事を削除しました',
    description: 'ゴミ箱に移動しました。一定期間内であれば復元できます',
  },
  restored: { title: '記事を復元しました', description: '非公開の状態で復元されています' },
};

/** WordPress連携 card copy of ブログ詳細 (specs/blog-detail FR-008). */
export const BLOG_DETAIL_WP_SYNC_CONFIG: NoticeDetailWpSyncConfig = {
  labels: BLOG_WP_SYNC_LABELS,
  icons: BLOG_WP_SYNC_ICONS,
  badgeClasses: BLOG_WP_SYNC_BADGE_CLASSES,
  excludedLabel: '連携対象外',
  notLinkedLabel: '未連携',
  failedTimeLabel: '最終同期',
  notes: BLOG_DETAIL_WP_NOTES,
};

// --- Form (specs/blog-form; prototype blog-form.tsx) ---

/** 対象ブランド checkbox ids (data-model `brands`); V0 order (prototype L90-L97). */
export const BLOG_FORM_BRAND_IDS = [
  'joyfitAll',
  'Joyfit',
  'Joyfit24',
  'JoyfitYoga',
  'JoyfitPlus',
  'Fit365',
] as const satisfies readonly BlogFormBrandId[];

export const BLOG_FORM_BRAND_OPTIONS: ReadonlyArray<{ id: BlogFormBrandId; label: string }> = [
  { id: 'joyfitAll', label: 'JOYFIT全体' },
  { id: 'Joyfit', label: 'Joyfit（スタンダード）' },
  { id: 'Joyfit24', label: 'Joyfit24' },
  { id: 'JoyfitYoga', label: 'JoyfitYoga' },
  { id: 'JoyfitPlus', label: 'JoyfitPlus' },
  { id: 'Fit365', label: 'FIT365' },
];

/** 配信範囲 radio cards (prototype L366-L426). */
export const BLOG_FORM_SCOPE_OPTIONS: ReadonlyArray<{
  value: BlogBrandScope;
  label: string;
  description: string;
}> = [
  { value: 'company', label: '全社配信', description: '全ブランド・全店舗のサイト/アプリに掲載' },
  { value: 'brand', label: 'ブランド指定', description: '選択したブランドの全店舗に掲載' },
  { value: 'store', label: '店舗指定', description: '特定の店舗のサイト/アプリに掲載' },
];

/** Roles that may use 全社配信 / ブランド指定 (FR-008, Clarification Q1); Staff gets 店舗指定 only. */
export const BLOG_WIDE_SCOPE_ROLES = [UserRole.System, UserRole.Headquarter, UserRole.Manager];

/** Shown under 全社配信 for roles below Manager (prototype L379). */
export const BLOG_FORM_SCOPE_COMPANY_NOTE = '※ Manager以上のみ選択できます';

/** Edit: a Staff user on an article whose scope is Manager-only — the target is read-only. */
export const BLOG_FORM_TARGET_LOCKED_NOTE = '配信対象はManager以上のみ変更できます';

/** 店舗 panel note when the user has no targetable store (spec Edge Cases; saving is disabled). */
export const BLOG_FORM_NO_STORES_NOTE = '選択できる店舗がありません';

/** 全社配信 warning alert (prototype L449-L452). */
export const BLOG_FORM_COMPANY_WARNING = {
  title: '全社配信',
  description:
    '全ブランド・全店舗のサイト/アプリに記事が掲載されます。内容を十分に確認してから公開してください。',
} as const;

/** 公開方法 (data-model `publishMethod`); `keepUnpublished` only in edit for 非公開 articles (research F6). */
export const BLOG_PUBLISH_METHODS = [
  'now',
  'scheduled',
  'draft',
  'keepUnpublished',
] as const satisfies readonly BlogPublishMethod[];

/** Radio label + description per method (prototype L497-L516; 非公開のまま保存 per research F6). */
export const BLOG_PUBLISH_METHOD_OPTIONS: Record<BlogPublishMethod, BlogPublishMethodOption> = {
  now: { value: 'now', label: '即時公開', description: '保存と同時に公開されます' },
  scheduled: {
    value: 'scheduled',
    label: '予約公開',
    description: '指定した日時に自動公開されます',
  },
  draft: { value: 'draft', label: '下書き保存', description: '公開せずに保存します' },
  keepUnpublished: {
    value: 'keepUnpublished',
    label: '非公開のまま保存',
    description: '公開状態を変えずに保存します',
  },
};

/** Save button label per method (prototype L555-L557; 保存する for 非公開のまま保存 per research F6). */
export const BLOG_SAVE_LABELS: Record<BlogPublishMethod, string> = {
  now: '公開する',
  scheduled: '予約公開する',
  draft: '下書き保存する',
  keepUnpublished: '保存する',
};

/** Success toast per method. */
export const BLOG_SAVE_SUCCESS_TOASTS: Record<BlogPublishMethod, string> = {
  now: 'ブログを公開しました',
  scheduled: 'ブログを予約公開として保存しました',
  draft: 'ブログを下書きとして保存しました',
  keepUnpublished: 'ブログを保存しました',
};

/** Footer summary when a submit failed validation (prototype L548). */
export const BLOG_FORM_ERROR_SUMMARY = '未入力の項目があります';

/** 本文 toolbar heading select (prototype L245-L254); `normal` = no header format. */
export const BLOG_BODY_HEADING_OPTIONS = [
  { value: 'normal', label: '標準' },
  { value: '1', label: '見出し1' },
  { value: '2', label: '見出し2' },
];

export const BLOG_BODY_PLACEHOLDER = '記事の本文を入力してください...';
