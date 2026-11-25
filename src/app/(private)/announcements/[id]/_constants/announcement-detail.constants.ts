import type {
  NoticeDetailConfirmCopy,
  NoticeDetailConfirmKind,
} from '@/app/(private)/blogs/_components/notice-detail-confirm-dialog';
import type { NoticeDetailWpSyncConfig } from '@/app/(private)/blogs/_components/notice-detail-wp-sync-card';
import type { NoticeDetailActionToasts } from '@/app/(private)/blogs/_hooks/use-notice-detail-actions.hook';

import {
  ANNOUNCEMENT_ACTION_TOASTS,
  ANNOUNCEMENT_WP_SYNC_BADGE_CLASSES,
  ANNOUNCEMENT_WP_SYNC_ICONS,
  ANNOUNCEMENT_WP_SYNC_LABELS,
} from '../../_constants/announcement.constants';

// Screen constants of お知らせ詳細 (specs/announcement-detail). Prototype:
// fitness-crm-ui announcement-detail.tsx@47d60ac (+ live WordPress連携 copy, 2026-11-20).

export const ANNOUNCEMENT_DETAIL_PAGE_TITLE = 'お知らせ詳細';
export const ANNOUNCEMENT_DETAIL_BACK_LABEL = 'お知らせ管理に戻る';
export const ANNOUNCEMENT_DETAIL_NOT_FOUND = {
  title: 'お知らせが見つかりません',
  description: '指定されたお知らせは存在しないか、削除された可能性があります。',
} as const;
export const ANNOUNCEMENT_DETAIL_ERROR_TITLE = 'お知らせの取得に失敗しました';

/** Header 削除 on a 公開中 announcement (prototype L155, Clarification Q1). */
export const ANNOUNCEMENT_DETAIL_PUBLISHED_DELETE_TOOLTIP =
  '公開中のお知らせは削除できません。先に「非公開にする」を実行してください。';

// --- WordPress連携 (live prototype: 成功 / 失敗 / 未同期 / 連携対象外; FR-008) ---
export const ANNOUNCEMENT_DETAIL_WP_SYNC_CONFIG: NoticeDetailWpSyncConfig = {
  labels: ANNOUNCEMENT_WP_SYNC_LABELS,
  icons: ANNOUNCEMENT_WP_SYNC_ICONS,
  badgeClasses: ANNOUNCEMENT_WP_SYNC_BADGE_CLASSES,
  excludedLabel: '連携対象外',
  notLinkedLabel: '未同期',
  failedTimeLabel: '最終試行',
  notes: {
    excluded: 'WEBサイト掲載がOFFのため',
    notLinked: '公開時にWordPressへ連携されます',
    deleted: '削除に伴いWordPress側は非公開化されています',
    unpublishedSynced: '非公開状態の同期に成功',
    failed: '管理者へアラートを送信済みです',
  },
};

// --- Confirm dialogs (prototype L382-L389, L421-L428, L605-L635; FR-012–FR-015) ---
export const ANNOUNCEMENT_DETAIL_CONFIRM_COPY: Record<
  NoticeDetailConfirmKind,
  NoticeDetailConfirmCopy
> = {
  unpublish: {
    title: 'お知らせを非公開にしますか？',
    description:
      'このお知らせは公開中の状態から非公開に変更されます。WEBサイトやアプリから表示されなくなります。',
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
    title: 'お知らせを削除しますか？',
    description: 'このお知らせを削除します。削除済みになっても復元することができます。',
    confirmLabel: '削除する',
    destructive: true,
  },
  restore: {
    title: 'お知らせを復元しますか？',
    description: 'このお知らせを非公開状態として復元します。復元後は編集・公開が可能になります。',
    confirmLabel: '復元する',
    destructive: false,
  },
};

/** FR-018: same copy as the announcement list. */
export const ANNOUNCEMENT_DETAIL_ACTION_TOASTS: NoticeDetailActionToasts = {
  unpublished: ANNOUNCEMENT_ACTION_TOASTS.unpublished,
  scheduleCancelled: '予約公開を取り消しました',
  deleted: ANNOUNCEMENT_ACTION_TOASTS.deleted,
  restored: ANNOUNCEMENT_ACTION_TOASTS.restored,
};

// --- 通知到達サマリー (prototype L529-L565, FR-009) ---
export const ANNOUNCEMENT_REACH_COPY = {
  title: '通知到達サマリー',
  pendingTitle: '公開後に集計されます',
  scheduledDescription:
    '設定した公開日時に通知が配信された後、対象者数・通知済み・配信率を表示します',
  draftDescription: '公開して通知が配信された後、対象者数・通知済み・配信率を表示します',
  noData: '集計データがありません',
  targetLabel: '対象者数',
  notifiedLabel: '通知済み',
  rateLabel: '配信率',
  personUnit: '名',
  rateUnit: '%',
} as const;
