'use client';

import { useRouter } from 'next/navigation';

import { Pencil, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';

import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

interface AppVersionDetailHeaderActionsProps {
  id: string;
  onDeleteClick: () => void;
}

export function AppVersionDetailHeaderActions({
  id,
  onDeleteClick,
}: AppVersionDetailHeaderActionsProps) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/app-versions'));
  const withReturnTo = useWithReturnTo();

  return (
    <>
      <RoleGatedButton
        requiredPermission={Permission.AppVersionsDelete}
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive gap-1"
        denyTooltip="本部権限が必要です"
        onClick={onDeleteClick}
      >
        <Trash2 className="size-4" />
        削除
      </RoleGatedButton>
      <RoleGatedButton
        requiredPermission={Permission.AppVersionsEdit}
        variant="outline"
        size="sm"
        className="gap-1"
        denyTooltip="本部権限が必要です"
        onClick={() =>
          router.push(withReturnTo(navigate('/app-versions/[id]/edit', id), backToListHref))
        }
      >
        <Pencil className="size-4" />
        編集
      </RoleGatedButton>
    </>
  );
}
