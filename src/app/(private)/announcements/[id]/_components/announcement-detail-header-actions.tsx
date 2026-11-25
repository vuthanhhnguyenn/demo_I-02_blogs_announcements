'use client';
// Client component: click handlers, role-gated buttons (auth context) and router navigation to 編集.
import { useRouter } from 'next/navigation';

import type { NoticeDetailConfirmKind } from '@/app/(private)/blogs/_components/notice-detail-confirm-dialog';
import { NOTICE_DETAIL_DENY_TOOLTIPS } from '@/app/(private)/blogs/_constants/notice-detail.constants';
import type { NoticeDetail } from '@/app/(private)/blogs/_types/notice.type';
import { getDisplayStatus } from '@/app/(private)/blogs/_utils/notice-row.util';
import { Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';

import { navigate } from '@/lib/routes/routes.util';

import { Permission, type UserRole } from '@/types/permission.type';

import { ANNOUNCEMENT_DETAIL_PUBLISHED_DELETE_TOOLTIP } from '../_constants/announcement-detail.constants';

interface AnnouncementDetailHeaderActionsProps {
  detail: NoticeDetail;
  onConfirm: (kind: NoticeDetailConfirmKind) => void;
  onPreview: () => void;
  /** Own-article gate shared with the status card action (FR-011). */
  editGate: { allowedRoles: UserRole[]; denyTooltip: string };
}

/**
 * Header actions (prototype L143-L227, FR-002 / FR-003): 公開中 → 削除 (disabled) · プレビュー · 編集;
 * 公開予定 / 非公開 / 下書き → 削除 · 編集; 削除済み → 復元する only (no 完全削除, blog-detail Q1).
 */
export function AnnouncementDetailHeaderActions({
  detail,
  onConfirm,
  onPreview,
  editGate,
}: Readonly<AnnouncementDetailHeaderActionsProps>) {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  // 編集 forwards the list URL this detail was opened from, not the detail itself.
  const backToListHref = useBackToListHref(navigate('/announcements'));
  const status = getDisplayStatus(detail);
  const isPublished = status === 'published';
  // 公開中 actions are default size, the others small (prototype L159 / L184).
  const size = isPublished ? 'default' : 'sm';

  if (status === 'deleted') {
    return (
      // blog-list Q2: gated to Manager and above (V0 leaves it ungated).
      <RoleGatedButton
        requiredPermission={Permission.AnnouncementsRestore}
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => onConfirm('restore')}
      >
        <RotateCcw className="size-4" />
        復元する
      </RoleGatedButton>
    );
  }

  // TODO(CODE-RULE-V): 編集 should be a <Link>, but RoleGatedButton has no link mode and a Link
  // would bypass its denied (disabled) state — follow-up issue required (same as blog detail).
  const editButton = (
    <RoleGatedButton
      requiredPermission={Permission.AnnouncementsEdit}
      allowedRoles={editGate.allowedRoles}
      denyTooltip={editGate.denyTooltip}
      variant="outline"
      size={size}
      className="gap-1"
      onClick={() =>
        router.push(withReturnTo(navigate('/announcements/[id]/edit', detail.id), backToListHref))
      }
    >
      <Pencil className="size-4" />
      編集
    </RoleGatedButton>
  );

  return (
    <>
      {isPublished ? (
        // Clarification Q1: a 公開中 announcement cannot be deleted from here, for every role.
        <RoleGatedButton
          allowedRoles={[]}
          denyTooltip={ANNOUNCEMENT_DETAIL_PUBLISHED_DELETE_TOOLTIP}
          variant="outline"
          className="text-destructive hover:text-destructive gap-1"
        >
          <Trash2 className="size-4" />
          削除
        </RoleGatedButton>
      ) : (
        <RoleGatedButton
          requiredPermission={Permission.AnnouncementsDelete}
          denyTooltip={NOTICE_DETAIL_DENY_TOOLTIPS.noDeletePermission}
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive gap-1"
          onClick={() => onConfirm('delete')}
        >
          <Trash2 className="size-4" />
          削除
        </RoleGatedButton>
      )}
      {isPublished && (
        <Button variant="outline" className="gap-1" onClick={onPreview}>
          <Eye className="size-4" />
          プレビュー
        </Button>
      )}
      {editButton}
    </>
  );
}
