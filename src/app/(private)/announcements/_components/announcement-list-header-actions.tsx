'use client';
// Client component: RoleGatedButton reads the auth context and navigation uses the router.
import { useRouter } from 'next/navigation';

import { FolderOpen, Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';

import { ArticleCategoryType } from '@/lib/api/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

/** カテゴリマスタを編集 + 新規登録 (prototype L490-L514). */
// TODO(CODE-RULE-V): navigational buttons should be <Link>, but RoleGatedButton has no link mode and
// a Link would bypass its denied (disabled) state — follow-up issue required (same as blog list).
export function AnnouncementListHeaderActions() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  return (
    <div className="flex items-center gap-2">
      {/* FR-009: カテゴリマスタ管理は本部のみ */}
      <RoleGatedButton
        allowedRoles={[UserRole.Headquarter, UserRole.System]}
        denyTooltip="カテゴリマスタ管理は本部のみ操作できます"
        type="button"
        variant="outline"
        className="gap-1"
        onClick={() =>
          router.push(
            withReturnTo(navigate('/article-categories', { type: ArticleCategoryType.NOTICE })),
          )
        }
      >
        <FolderOpen className="size-4" />
        カテゴリマスタを編集
      </RoleGatedButton>
      <RoleGatedButton
        requiredPermission={Permission.AnnouncementsCreate}
        denyTooltip="お知らせ作成の権限がありません"
        type="button"
        className="gap-1"
        onClick={() => router.push(withReturnTo(navigate('/announcements/create')))}
      >
        <Plus className="size-4" />
        新規登録
      </RoleGatedButton>
    </div>
  );
}
