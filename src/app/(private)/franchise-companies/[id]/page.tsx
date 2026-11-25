'use client';

import { Suspense, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { adminFcCompanyControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import {
  MANAGEMENT_TYPE_BADGE_CLASSES,
  MANAGEMENT_TYPE_LABELS,
  getActiveBadgeClass,
  getActiveLabel,
} from '../_constants/constants';
import {
  isFcCompanyNotFoundError,
  isFcCompanyPermissionError,
} from '../_utils/fc-company-api.util';
import { BasicInfoTab } from './_components/basic-info-tab';
import { FcPermissionDenied } from './_components/fc-permission-denied';
import { FranchiseCompanyDeleteDialog } from './_components/franchise-company-delete-dialog';
import { FranchiseCompanyStatusDialog } from './_components/franchise-company-status-dialog';
import { HistoryTab } from './_components/history-tab';
import { LinkedStoresTab } from './_components/linked-stores-tab';

function FranchiseCompanyDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/franchise-companies'));
  const withReturnTo = useWithReturnTo();

  const companyId = params.id as string;
  const [activeTab, setActiveTab] = useState('basic');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminFcCompanyControllerDetailOptions({ path: { id: companyId } }),
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !detail) {
    const isNotFound = isError && isFcCompanyNotFoundError(error);
    const isForbidden = isError && isFcCompanyPermissionError(error);
    return (
      <>
        <PageHeader
          breadcrumb={<BackLink label="FC企業管理に戻る" href={backToListHref} />}
          title="FC企業詳細"
        />
        {isForbidden ? (
          <FcPermissionDenied />
        ) : (
          <DataStateBoundary
            isLoading={false}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || !detail}
            onRetry={() => void refetch()}
            errorTitle="FC企業の取得に失敗しました"
            emptyTitle="FC企業が見つかりません"
          />
        )}
      </>
    );
  }

  // FR-030 / D6: the guard is the BE's own count of non-closed linked stores (E-FC-001)
  const canDelete = detail.managedStoreCount === 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackLink label="FC企業管理に戻る" href={backToListHref} />}
        // The header truncates long names — the native tooltip lets the full value be read
        title={<span title={detail.displayName}>{detail.displayName}</span>}
        badge={
          <>
            <Badge
              variant="outline"
              className={cn('gap-1 text-xs font-medium', getActiveBadgeClass(detail.isActive))}
            >
              <span className="inline-block size-1.5 rounded-full bg-current" />
              {getActiveLabel(detail.isActive)}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px]', MANAGEMENT_TYPE_BADGE_CLASSES[detail.managementType])}
            >
              {MANAGEMENT_TYPE_LABELS[detail.managementType]}
            </Badge>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* 無効化/有効化はステータスカード内に集約（prototype 8/13〜）。削除は管轄店舗ありなら disabled + 理由 */}
            <RoleGatedButton
              requiredPermission={Permission.FCCompaniesDelete}
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive gap-1"
              disabled={!canDelete}
              tooltip={canDelete ? undefined : '管轄店舗が存在するため削除できません'}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              削除
            </RoleGatedButton>
            <RoleGatedButton
              requiredPermission={Permission.FCCompaniesEdit}
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() =>
                router.push(
                  withReturnTo(
                    navigate('/franchise-companies/[id]/edit', companyId),
                    backToListHref,
                  ),
                )
              }
            >
              <Pencil className="size-4" />
              編集
            </RoleGatedButton>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="stores">管轄店舗</TabsTrigger>
            {/*
              TODO(round3) R301 — Y-03 FR-007 / FR-008 (Phase 2): 集計タブ。
              Prototype shows it only in the Phase 2 view; no aggregation API exists yet.
              <TabsTrigger value="summary">集計</TabsTrigger>
            */}
            <TabsTrigger value="history">変更履歴</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <BasicInfoTab franchiseCompany={detail} onStatusAction={() => setStatusOpen(true)} />
        </TabsContent>

        <TabsContent value="stores" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <LinkedStoresTab company={detail} />
        </TabsContent>

        {/*
          TODO(round3) R301 — Y-03 FR-007 / FR-008 (Phase 2)
          <TabsContent value="summary" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">KPI集計・店舗サマリー</CardTitle>
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">次フェーズ実装予定</Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4">
                  <Empty
                    variant="empty"
                    icon={BarChart3}
                    title="FC企業別KPI集計・店舗サマリーは次フェーズで実装予定です"
                    description="管轄店舗の売上・会員・入退館ログを集計して表示します"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">売上集計</CardTitle>
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">次フェーズ実装予定</Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4">
                  <Empty
                    variant="empty"
                    icon={BarChart3}
                    title="FC企業別売上集計は次フェーズで実装予定です"
                    description="この企業に紐づく店舗の売上を集計表示します"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        */}

        <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <HistoryTab companyId={companyId} />
        </TabsContent>
      </Tabs>

      <FranchiseCompanyDeleteDialog
        companyId={companyId}
        companyName={detail.displayName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />

      <FranchiseCompanyStatusDialog
        companyId={companyId}
        companyName={detail.displayName}
        isActive={detail.isActive}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </div>
  );
}

export default function FranchiseCompanyDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FranchiseCompanyDetailPageContent />
    </Suspense>
  );
}
