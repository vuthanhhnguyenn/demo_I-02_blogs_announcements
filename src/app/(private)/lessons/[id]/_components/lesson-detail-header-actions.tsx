'use client';

import { useRouter } from 'next/navigation';

import { Copy, Pencil, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';

import type { LessonDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

interface LessonDetailHeaderActionsProps {
  detail: Pick<LessonDetailDto, 'id'>;
  onDelete: () => void;
}

export function LessonDetailHeaderActions({ detail, onDelete }: LessonDetailHeaderActionsProps) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/lessons'));
  const withReturnTo = useWithReturnTo();

  const handleDuplicate = () => {
    router.push(withReturnTo(navigate('/lessons/[id]/duplicate', detail.id), backToListHref));
  };

  const handleEdit = () => {
    router.push(withReturnTo(navigate('/lessons/[id]/edit', detail.id), backToListHref));
  };

  return (
    <div className="flex items-center gap-2">
      <RoleGatedButton
        requiredPermission={Permission.LessonContentsDelete}
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive gap-1"
        denyTooltip="削除権限がありません"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
        削除
      </RoleGatedButton>
      <RoleGatedButton
        requiredPermission={Permission.LessonContentsCreate}
        variant="outline"
        size="sm"
        className="gap-1"
        denyTooltip="複製権限がありません"
        onClick={handleDuplicate}
      >
        <Copy className="size-4" />
        複製
      </RoleGatedButton>
      <RoleGatedButton
        requiredPermission={Permission.LessonContentsEdit}
        variant="outline"
        size="sm"
        className="gap-1"
        denyTooltip="編集権限がありません"
        onClick={handleEdit}
      >
        <Pencil className="size-4" />
        編集
      </RoleGatedButton>
    </div>
  );
}
