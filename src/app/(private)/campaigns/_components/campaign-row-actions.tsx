'use client';

import { useRouter } from 'next/navigation';

import { Copy, MoreHorizontal, Pencil } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

type CampaignRowActionsProps = {
  campaignId: string;
  className?: string;
};

export function CampaignRowActions({ campaignId, className }: Readonly<CampaignRowActionsProps>) {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={className ?? 'hover:bg-muted flex size-8 items-center justify-center rounded-md'}
        aria-label="campaign row actions"
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <RoleGatedMenuItem
          requiredPermission={Permission.CampaignsEdit}
          onClick={(event) => {
            event.stopPropagation();
            router.push(withReturnTo(navigate('/campaigns/[id]/edit', campaignId)));
          }}
        >
          <Pencil className="size-4" />
          編集
        </RoleGatedMenuItem>
        {/* 削除・アーカイブは G-03 に FR が無いため置かない（運用は受付停止＋新規追加） */}
        {/* G-03 FR-S003: 全設定をコピーした状態で新規登録画面を開く */}
        <RoleGatedMenuItem
          requiredPermission={Permission.CampaignsCreate}
          onClick={(event) => {
            event.stopPropagation();
            router.push(withReturnTo(`${navigate('/campaigns/create')}?copyFrom=${campaignId}`));
          }}
        >
          <Copy className="size-4" />
          複製
        </RoleGatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
