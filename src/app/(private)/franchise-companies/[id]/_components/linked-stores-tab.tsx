'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Plus, Unlink } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminFcCompanyControllerListStoresOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { FcCompanyDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import { isFcCompanyPermissionError } from '../../_utils/fc-company-api.util';
import {
  FRANCHISE_COMPANY_TAB_LIMIT,
  FRANCHISE_COMPANY_LINKED_STORE_LABELS as LABELS,
  STORE_STATUS_BADGE_CLASSES,
  STORE_STATUS_LABELS,
  getPrefectureLabel,
} from '../_constants/detail.constants';
import { FcPermissionDenied } from './fc-permission-denied';
import { LinkStoreDialog } from './link-store-dialog';
import { RealBrandBadge } from './real-brand-badge';
import { UnlinkStoreDialog } from './unlink-store-dialog';

const LINK_DENY_TOOLTIP = '店舗紐づけの設定には本部権限が必要です';
const INACTIVE_LINK_REASON =
  '無効のFC企業には店舗を紐づけできません。有効化してから追加してください';

interface LinkedStoresTabProps {
  company: FcCompanyDetailDto;
}

export function LinkedStoresTab({ company }: Readonly<LinkedStoresTabProps>) {
  const router = useRouter();
  const companyId = company.id;
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<{ id: string; name: string } | null>(null);

  // D6 / D14: closed stores are listed too (muted badge); the API max page is enough here
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminFcCompanyControllerListStoresOptions({
      path: { id: companyId },
      query: { includeClosed: true, limit: FRANCHISE_COMPANY_TAB_LIMIT },
    }),
  });

  const stores = data?.items ?? [];
  const total = data?.pagination.totalItems ?? stores.length;
  const openStore = (storeId: string) => router.push(navigate('/stores/[id]', storeId));

  if (isError && isFcCompanyPermissionError(error)) {
    return <FcPermissionDenied />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-xs">
          店舗の紐づけ・解除は本部が設定できます。変更は変更履歴に記録されます。
        </p>
        {/* D12: 無効中は紐づけ不可（権限なしの場合は RoleGatedButton の権限 deny 表示が優先） */}
        <RoleGatedButton
          requiredPermission={Permission.FCCompaniesEdit}
          denyTooltip={LINK_DENY_TOOLTIP}
          size="sm"
          className="shrink-0 gap-1"
          disabled={!company.isActive}
          tooltip={company.isActive ? undefined : INACTIVE_LINK_REASON}
          onClick={() => setLinkOpen(true)}
        >
          <Plus className="size-4" />
          店舗を紐づけ
        </RoleGatedButton>
      </div>

      <Card className="gap-0 py-0">
        <Table size="md">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px] text-xs font-semibold">{LABELS.code}</TableHead>
              <TableHead className="min-w-[200px] text-xs font-semibold">{LABELS.name}</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold">{LABELS.brand}</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold">{LABELS.prefecture}</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold">{LABELS.status}</TableHead>
              <TableHead className="w-10 text-xs font-semibold" />
              <TableHead className="w-[88px] text-xs font-semibold" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center text-xs">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Empty
                    title="管轄店舗の取得に失敗しました"
                    description="時間をおいて再度お試しください。"
                    onAction={() => void refetch()}
                    actionLabel="再試行"
                  />
                </TableCell>
              </TableRow>
            ) : stores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Empty
                    variant="empty"
                    entityLabel="管轄店舗"
                    description="「店舗を紐づけ」からこのFC企業の管轄店舗を追加できます"
                  />
                </TableCell>
              </TableRow>
            ) : (
              stores.map((store) => (
                <TableRow
                  key={store.storeId}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => openStore(store.storeId)}
                >
                  <TableCell className="text-muted-foreground text-xs">{store.code}</TableCell>
                  <TableCell className="max-w-[320px]">
                    <TextWithTooltip text={store.name} className="text-xs font-medium" />
                  </TableCell>
                  <TableCell>
                    <RealBrandBadge brandEnum={store.brandEnum} />
                  </TableCell>
                  <TableCell className="text-xs">{getPrefectureLabel(store.prefecture)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', STORE_STATUS_BADGE_CLASSES[store.status])}
                    >
                      {STORE_STATUS_LABELS[store.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ExternalLink className="text-muted-foreground size-3" />
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <RoleGatedButton
                      requiredPermission={Permission.FCCompaniesEdit}
                      variant="ghost"
                      size="sm"
                      denyTooltip={LINK_DENY_TOOLTIP}
                      className="text-muted-foreground hover:text-destructive h-7 gap-1 px-2 text-xs"
                      onClick={() => setUnlinkTarget({ id: store.storeId, name: store.name })}
                    >
                      <Unlink className="size-3" />
                      解除
                    </RoleGatedButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center border-t px-4 py-3">
          <p className="text-muted-foreground text-xs">全 {total} 件</p>
        </div>
      </Card>

      <LinkStoreDialog company={company} open={linkOpen} onOpenChange={setLinkOpen} />
      <UnlinkStoreDialog
        companyId={companyId}
        store={unlinkTarget}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
      />
    </div>
  );
}
