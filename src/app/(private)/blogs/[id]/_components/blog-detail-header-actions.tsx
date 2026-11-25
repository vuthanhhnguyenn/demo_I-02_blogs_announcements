'use client';
// Client component: click handlers, role-gated buttons (auth context) and router navigation to 編集.
import { useRouter } from 'next/navigation';

import { Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';

import { navigate } from '@/lib/routes/routes.util';

import { Permission, type UserRole } from '@/types/permission.type';

import type { NoticeDetailConfirmKind } from '../../_components/notice-detail-confirm-dialog';
import { BLOG_DETAIL_DENY_TOOLTIPS } from '../../_constants/blog.constants';
import type { BlogDetail } from '../../_types/blog.type';
import { getDisplayStatus } from '../../_utils/blog-row.util';

interface BlogDetailHeaderActionsProps {
  detail: BlogDetail;
  onConfirm: (kind: NoticeDetailConfirmKind) => void;
  onPreview: () => void;
  /** Own-article gate shared with the status card action (FR-010). */
  editGate: { allowedRoles: UserRole[]; denyTooltip: string };
}

/**
 * Header actions (prototype L135-L200, FR-002): 削除 · プレビュー · 編集, or only 復元する for a
 * deleted article. 完全削除 is not offered (Clarification Q1).
 */
export function BlogDetailHeaderActions({
  detail,
  onConfirm,
  onPreview,
  editGate,
}: Readonly<BlogDetailHeaderActionsProps>) {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  // 編集 forwards the list URL this detail was opened from, not the detail itself.
  const backToListHref = useBackToListHref(navigate('/blogs'));
  const status = getDisplayStatus(detail);

  if (status === 'deleted') {
    return (
      // Inherited Q2: gated to Manager and above (V0 leaves it ungated).
      <RoleGatedButton
        requiredPermission={Permission.BlogsRestore}
        variant="outline"
        className="gap-1"
        onClick={() => onConfirm('restore')}
      >
        <RotateCcw className="size-4" />
        復元する
      </RoleGatedButton>
    );
  }

  return (
    <>
      <RoleGatedButton
        requiredPermission={Permission.BlogsDelete}
        denyTooltip={BLOG_DETAIL_DENY_TOOLTIPS.noDeletePermission}
        variant="outline"
        className="text-destructive hover:text-destructive gap-1"
        onClick={() => onConfirm('delete')}
      >
        <Trash2 className="size-4" />
        削除
      </RoleGatedButton>
      {/* 下書き is unpublished: no preview (V0 L182) */}
      {status !== 'draft' && (
        <Button variant="outline" className="gap-1" onClick={onPreview}>
          <Eye className="size-4" />
          プレビュー
        </Button>
      )}
      <RoleGatedButton
        requiredPermission={Permission.BlogsEdit}
        allowedRoles={editGate.allowedRoles}
        denyTooltip={editGate.denyTooltip}
        variant="outline"
        className="gap-1"
        onClick={() =>
          router.push(withReturnTo(navigate('/blogs/[id]/edit', detail.id), backToListHref))
        }
      >
        <Pencil className="size-4" />
        編集
      </RoleGatedButton>
    </>
  );
}
