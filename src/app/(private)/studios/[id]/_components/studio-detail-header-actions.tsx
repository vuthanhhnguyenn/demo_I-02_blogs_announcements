'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { Edit2, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';

import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

interface StudioDetailHeaderActionsProps {
  studioId: string;
  onDelete: () => void;
}

/**
 * Studio detail header actions component.
 * Shows Edit and Delete buttons gated by permission.
 */
export function StudioDetailHeaderActions({ studioId, onDelete }: StudioDetailHeaderActionsProps) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/studios'));
  const withReturnTo = useWithReturnTo();

  const handleDeleteClick = useCallback(() => {
    onDelete();
  }, [onDelete]);

  const handleEditClick = useCallback(() => {
    router.push(withReturnTo(navigate('/studios/[id]/edit', studioId), backToListHref));
  }, [router, studioId, withReturnTo, backToListHref]);

  return (
    <div className="flex gap-2">
      <RoleGatedButton
        requiredPermission={Permission.StudiosEdit}
        size="sm"
        variant="outline"
        className="gap-1"
        denyTooltip="スタジオの編集権限がありません"
        onClick={handleEditClick}
      >
        <Edit2 className="size-4" />
        編集
      </RoleGatedButton>
      <RoleGatedButton
        requiredPermission={Permission.StudiosDelete}
        size="sm"
        variant="destructive"
        className="gap-1"
        denyTooltip="スタジオの削除権限がありません"
        onClick={handleDeleteClick}
      >
        <Trash2 className="size-4" />
        削除
      </RoleGatedButton>
    </div>
  );
}
