'use client';

import { useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { adminRelayControllerControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { CONTROLLER_STATUS_BADGE_MAP, CONTROLLER_STATUS_LABELS } from '../_constants/constants';
import { ControllerBasicInfoTab } from './_components/controller-basic-info-tab';
import { ControllerDeleteDialog } from './_components/controller-delete-dialog';
import { ControllerDetailSkeleton } from './_components/controller-detail-skeleton';
import { ControllerDevicesTab } from './_components/controller-devices-tab';
import { ControllerHistoryTab } from './_components/controller-history-tab';

type ControllerDetail = RelayControllerDetailDto;

export default function ControllerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/controllers'));
  const withReturnTo = useWithReturnTo();

  const controllerId = params.id as string;
  const activeTab = searchParams.get('tab') ?? 'basic';
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminRelayControllerControllerDetailOptions({
      path: { relayControllerId: controllerId },
    }),
    enabled: Boolean(controllerId),
  });

  const controller: ControllerDetail | undefined = data;
  const statusBadge = controller ? CONTROLLER_STATUS_BADGE_MAP[controller.status] : null;
  const connectedDeviceCount = controller?.connectedDeviceCount ?? 0;
  const hasConnectedDevices = connectedDeviceCount > 0;

  const handleTabChange = (tab: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tab);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        // BUG-E02-E-01 — prototype copy (PO 2026-10-12); the target stays the controller list.
        breadcrumb={
          <BackToListLink label="店舗機器管理に戻る" listPath={navigate('/controllers')} />
        }
        title="接点制御装置詳細"
        subtitle={
          controller ? `${controller.storeName ?? '—'} — ${controller.ipAddress ?? '—'}` : undefined
        }
        badge={
          controller && statusBadge ? (
            <Badge variant="outline" className={statusBadge.badgeClassName}>
              <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
              {CONTROLLER_STATUS_LABELS[controller.status]}
            </Badge>
          ) : undefined
        }
        actions={
          controller ? (
            <div className="flex items-center gap-2">
              <RoleGatedButton
                requiredPermission={Permission.ControllerDelete}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive gap-1 data-disabled:cursor-not-allowed data-disabled:opacity-50"
                denyTooltip="削除権限がありません"
                tooltip={
                  hasConnectedDevices
                    ? `接続機器が${connectedDeviceCount}台あるため削除できません。先に紐付き機器一覧の機器を削除または別装置へ移してください`
                    : undefined
                }
                disabled={hasConnectedDevices}
                // BUG-E02-E-06 — a natively disabled button leaves the Tab order, so the reason
                // tooltip above was mouse-only; keep it focusable (aria-disabled, click blocked).
                focusableWhenDisabled
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                削除
              </RoleGatedButton>
              <RoleGatedButton
                requiredPermission={Permission.ControllerEdit}
                variant="outline"
                size="sm"
                className="gap-1"
                denyTooltip="編集権限がありません"
                onClick={() =>
                  router.push(
                    withReturnTo(navigate('/controllers/[id]/edit', controller.id), backToListHref),
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
          isEmpty={!controller}
          onRetry={() => refetch()}
          skeleton={<ControllerDetailSkeleton />}
          errorTitle="接点制御装置の取得に失敗しました。"
        >
          {controller ? (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
              <TabsList variant="line">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="devices">紐付き機器一覧</TabsTrigger>
                <TabsTrigger value="history">変更履歴</TabsTrigger>
              </TabsList>
              <TabsContent value="basic">
                <ControllerBasicInfoTab controller={controller} />
              </TabsContent>
              <TabsContent value="devices">
                <ControllerDevicesTab controller={controller} />
              </TabsContent>
              <TabsContent value="history">
                <ControllerHistoryTab controller={controller} />
              </TabsContent>
            </Tabs>
          ) : null}
        </DataStateBoundary>
      </div>

      {controller ? (
        <ControllerDeleteDialog
          controllerId={controller.id}
          controllerLabel={controller.ipAddress || controller.name}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      ) : null}
    </div>
  );
}
