import type { NoticeDisplayStatus } from '../_types/notice.type';

/*
 * Detail-screen constants shared by ブログ詳細 / お知らせ詳細 (specs/announcement-detail research R1).
 * Screen copy (dialogs, toasts, WordPress連携 labels / notes) stays per screen.
 */

/** Detail-screen tones (prototype blog-detail.tsx L80-L106: 非公開 is muted here, unlike the list). */
export const NOTICE_DETAIL_STATUS_BADGE_CLASSES: Record<
  NoticeDisplayStatus,
  { badge: string; dot: string }
> = {
  published: { badge: 'bg-success/15 text-success border-success/20', dot: 'bg-success' },
  scheduled: { badge: 'bg-info/15 text-info border-info/20', dot: 'bg-info' },
  draft: { badge: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  unpublished: {
    badge: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
  deleted: {
    badge: 'bg-destructive/15 text-destructive border-destructive/20',
    dot: 'bg-destructive',
  },
};

/** Detail screen copy (specs/blog-detail FR-007 / FR-008 / FR-010 / FR-013). */
export const NOTICE_DETAIL_STATUS_META_SUFFIX = {
  published: '公開',
  scheduled: 'に自動公開されます',
  unpublished: '非公開に変更',
  draft: '最終保存',
  deleted: '削除',
} as const;

export const NOTICE_DETAIL_DENY_TOOLTIPS = {
  notAuthor: '自分が作成した記事のみ編集・公開切替できます',
  noEditPermission: '編集・公開切替の権限がありません',
  noDeletePermission: '削除権限がありません',
} as const;

export const NOTICE_DETAIL_EMPTY_BODY = '本文はありません';
