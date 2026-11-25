'use client';

import { useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BreadcrumbNav } from '@/components/common/breadcrumb-nav';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { isRecordNotFoundError } from '@/lib/api-error.util';
import { adminLockerControllerGetLockerOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { LOCKER_SHAPE_TYPE_LABELS } from '../_constants/locker-enum-labels.constants';
import { LockerDeleteDialog } from './_components/locker-delete-dialog';
import { LockerDetailSkeleton } from './_components/locker-detail-skeleton';
import { LockerHistoryTab } from './_components/locker-history-tab';
import { LockerInfoTab } from './_components/locker-info-tab';
import { SlotManagementTab } from './_components/slot-management-tab';

export default function LockerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/lockers'));
  const withReturnTo = useWithReturnTo();
  const { hasPermission } = useAuthUser();
  const canManageSlots = hasPermission(Permission.LockersEdit);

  const lockerId = params.id as string;
  const requestedTab = searchParams.get('tab') ?? 'info';
  const activeTab = requestedTab === 'slots' && !canManageSlots ? 'info' : requestedTab;
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: locker,
    error,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...adminLockerControllerGetLockerOptions({ path: { lockerId } }),
    enabled: Boolean(lockerId),
  });

  if (isLoading) return <LockerDetailSkeleton />;

  // A malformed / unknown id answers 400 / 404 — show the empty state, not a retry loop
  const isNotFound = isError && isRecordNotFoundError(error, 'lockerId');
  if (!locker || (isError && !isNotFound)) {
    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError && !isNotFound}
        isEmpty={!locker}
        onRetry={() => refetch()}
        // Out-of-scope cabinets answer the same 404 (E-LOC-001), so this covers both cases
        emptyState={{
          title: 'ロッカーが見つかりません',
          description: '削除されたか、閲覧できない店舗のロッカーです。',
          actionLabel: 'ロッカー一覧に戻る',
          onAction: () => router.push(backToListHref),
        }}
      />
    );
  }

  const handleTabChange = (tab: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tab);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  // E-LOC-004: a cabinet with in-use / pending-release slots cannot be deleted
  const hasActiveSlots = locker.slotSummary.inUse + locker.slotSummary.pendingRelease > 0;
  // On the cabinet itself (API-100 §5.1, BE !822): observers get 403 on `/admin/stores`
  const storeName = locker.storeName ?? '';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={
          <BreadcrumbNav
            items={[{ url: backToListHref, label: 'ロッカー管理' }, { label: 'ロッカー詳細' }]}
          />
        }
        title={`${locker.location.locationName} — ${LOCKER_SHAPE_TYPE_LABELS[locker.shapeType]}`}
        subtitle={`${storeName ? `${storeName} — ` : ''}ロッカーID: ${locker.location.locationCode}`}
        actions={
          <div className="flex items-center gap-2">
            <RoleGatedButton
              requiredPermission={Permission.LockersDelete}
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive gap-1"
              disabled={hasActiveSlots}
              denyTooltip="ロッカー削除の権限がありません"
              tooltip={
                hasActiveSlots
                  ? '使用中・開放待ちのスロットが存在するため削除できません'
                  : undefined
              }
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              削除
            </RoleGatedButton>
            <RoleGatedButton
              requiredPermission={Permission.LockersEdit}
              variant="outline"
              size="sm"
              className="gap-1"
              denyTooltip="編集権限がありません"
              onClick={() =>
                router.push(withReturnTo(navigate('/lockers/[id]/edit', lockerId), backToListHref))
              }
            >
              <Pencil className="size-4" />
              編集
            </RoleGatedButton>
          </div>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="info">ロッカー情報</TabsTrigger>
            {canManageSlots ? <TabsTrigger value="slots">スロット管理</TabsTrigger> : null}
            <TabsTrigger value="history">変更履歴</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="info" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <LockerInfoTab locker={locker} storeName={storeName} />
        </TabsContent>

        {canManageSlots ? (
          <TabsContent value="slots" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <SlotManagementTab locker={locker} />
          </TabsContent>
        ) : null}

        <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <LockerHistoryTab lockerId={lockerId} locationCode={locker.location.locationCode} />
        </TabsContent>
      </Tabs>

      <LockerDeleteDialog
        lockerId={lockerId}
        lockerName={locker.location.locationCode}
        hasActiveSlots={hasActiveSlots}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
