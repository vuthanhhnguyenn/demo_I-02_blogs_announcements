import { UserRole } from '@/types/permission.type';

import { NOTICE_BRAND_LABELS } from '../_constants/notice.constants';
import type { NoticeBrandCode, NoticeDisplayStatus, NoticeRow } from '../_types/notice.type';

/*
 * Row helpers shared by the I-02 article lists (ブログ / お知らせ), specs/announcement-list research R1.
 */

/** data-model.md "Derived display status": a deleted row is 削除済み whatever its publish state. */
export function getDisplayStatus(row: NoticeRow): NoticeDisplayStatus {
  return row.deletedAt ? 'deleted' : row.publishStatus;
}

/**
 * FR-007 / research R7: WEB channel on, not deleted, and published at least once
 * (公開中 or 非公開). Non-targets show "—" in the WP連携 column.
 */
export function isWpSyncTarget(row: NoticeRow): boolean {
  return (
    row.channelWeb &&
    !row.deletedAt &&
    (row.publishStatus === 'published' || row.publishStatus === 'unpublished')
  );
}

function isNoticeBrandCode(value: string): value is NoticeBrandCode {
  return value in NOTICE_BRAND_LABELS;
}

/**
 * Brands of the 対象 cell (research R2): the family when `subBrandCodes` is null,
 * otherwise the listed sub-brands. Empty for 全社 rows.
 */
export function getTargetBrandCodes(row: NoticeRow): NoticeBrandCode[] {
  if (row.brandScope === 'company' || !row.brandCode) return [];
  if (!row.subBrandCodes) return [row.brandCode];
  return row.subBrandCodes.filter(isNoticeBrandCode);
}

/** Research R5: the row's `createdBy` (staff uuid) is the caller's `staffId`. */
export function isOwnArticle(row: NoticeRow, staffId: string | null | undefined): boolean {
  return !!staffId && row.createdBy === staffId;
}

const NOTICE_EDIT_ROLES = [UserRole.System, UserRole.Headquarter, UserRole.Manager, UserRole.Staff];

/**
 * Roles for 編集 / 公開にする / 非公開にする (FR-016, Clarification Q6): Staff only on their own
 * article. Dropping Staff makes `RoleGatedMenuItem` take its denied path and show the badge
 * (pattern of `lesson-schedules/[id]/reservations/_utils/session-scope.util.ts`).
 */
export function scopedNoticeEditRoles(isOwn: boolean): UserRole[] {
  return isOwn ? NOTICE_EDIT_ROLES : NOTICE_EDIT_ROLES.filter((role) => role !== UserRole.Staff);
}
