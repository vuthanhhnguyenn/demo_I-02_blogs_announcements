'use client';

import { useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Pencil, QrCode, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { adminConnectedDeviceControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { formatShortId } from '../../_utils/device-api.util';
import { EQUIPMENT_STATUS_BADGE_MAP, EQUIPMENT_STATUS_LABELS } from '../_constants/constants';
import { EquipmentBasicInfoTab } from './_components/equipment-basic-info-tab';
import { EquipmentDeleteDialog } from './_components/equipment-delete-dialog';
import { EquipmentDetailSkeleton } from './_components/equipment-detail-skeleton';
import { EquipmentHistoryTab } from './_components/equipment-history-tab';
import { EquipmentQrDialog } from './_components/equipment-qr-dialog';

type EquipmentDetail = ConnectedDeviceDetailDto;

export default function EquipmentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/equipment'));
  const withReturnTo = useWithReturnTo();

  const equipmentId = params.id as string;
  const activeTab = searchParams.get('tab') ?? 'basic';
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminConnectedDeviceControllerDetailOptions({ path: { deviceId: equipmentId } }),
    enabled: Boolean(equipmentId),
  });

  const equipment: EquipmentDetail | undefined = data;
  const statusBadge = equipment ? EQUIPMENT_STATUS_BADGE_MAP[equipment.status] : null;

  const handleTabChange = (tab: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tab);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackToListLink label="接続機器" listPath={navigate('/equipment')} />}
        // The header truncates a long name; `title` keeps the full value readable (BUG-E02-B-08).
        title={equipment ? <span title={equipment.name}>{equipment.name}</span> : '接続機器詳細'}
        subtitle={
          equipment
            ? `${equipment.storeName ?? '—'} — 接続機器ID: ${formatShortId(equipment.id)}`
            : `接続機器ID: ${formatShortId(equipmentId)}`
        }
        badge={
          equipment && statusBadge ? (
            <Badge variant="outline" className={statusBadge.badgeClassName}>
              <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
              {EQUIPMENT_STATUS_LABELS[equipment.status]}
            </Badge>
          ) : undefined
        }
        actions={
          equipment ? (
            <div className="flex items-center gap-2">
              {/* Viewing the sticker needs no edit right; issuing it is gated inside the modal. */}
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setQrOpen(true)}>
                <QrCode className="size-4" />
                QRコード
              </Button>
              <RoleGatedButton
                requiredPermission={Permission.EquipmentDelete}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive gap-1"
                denyTooltip="削除権限がありません"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                削除
              </RoleGatedButton>
              <RoleGatedButton
                requiredPermission={Permission.EquipmentEdit}
                variant="outline"
                size="sm"
                className="gap-1"
                denyTooltip="編集権限がありません"
                onClick={() =>
                  router.push(
                    withReturnTo(navigate('/equipment/[id]/edit', equipment.id), backToListHref),
                  )
                }
              >
                <Pencil className="size-4" />
                編集
              </RoleGatedButton>
            </div>
          ) : undefined
        }
      />

      <div className="bg-background min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError}
          isEmpty={!equipment}
          onRetry={() => refetch()}
          skeleton={<EquipmentDetailSkeleton />}
          errorTitle="接続機器の取得に失敗しました。"
        >
          {equipment ? (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
              <TabsList variant="line">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="history">変更履歴</TabsTrigger>
              </TabsList>
              <TabsContent value="basic">
                <EquipmentBasicInfoTab equipment={equipment} />
              </TabsContent>
              <TabsContent value="history">
                <EquipmentHistoryTab equipmentId={equipment.id} />
              </TabsContent>
            </Tabs>
          ) : null}
        </DataStateBoundary>
      </div>

      {equipment ? (
        <EquipmentQrDialog equipment={equipment} open={qrOpen} onOpenChange={setQrOpen} />
      ) : null}

      {equipment ? (
        <EquipmentDeleteDialog
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      ) : null}
    </div>
  );
}
