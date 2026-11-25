'use client';

import { useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import { Copy, MoreHorizontal, Network, Pencil, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminPlanControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { PlanDeleteDialog } from '../_components/plan-delete-dialog';
import {
  MAIN_CONTRACT_STATUS_BADGE_CLASSES,
  MAIN_CONTRACT_STATUS_LABELS,
  MAIN_CONTRACT_TYPE_BADGE_CLASSES,
  MAIN_CONTRACT_TYPE_LABELS,
} from '../_constants/constants';
import {
  getContractChildCreateState,
  getContractCopyState,
  getContractDeleteState,
  getContractEditState,
} from '../_utils/contract-action-state';
import { BasicInfoTab } from './_components/basic-info-tab';
import { ContractDetailSkeleton } from './_components/contract-detail-skeleton';
import { HistoryTab } from './_components/history-tab';
import { PricingTab } from './_components/pricing-tab';

const DETAIL_TABS = ['basic', 'pricing'] as const;

export default function ContractDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/contracts'));
  const withReturnTo = useWithReturnTo();

  const { hasPermission } = useAuthUser();

  const contractId = params.id as string;
  // 変更履歴 is HQ/Manager-only (API-087 §9 returns E-AUTH-103 for staff), so the tab is hidden
  // rather than left to fail on the request.
  const canViewHistory = hasPermission(Permission.ContractsHistoryView);
  // An unknown `?tab=` (or 変更履歴 for a role without it) falls back to 基本情報 instead of
  // leaving no tab — and no panel — selected.
  const visibleTabs: string[] = canViewHistory ? [...DETAIL_TABS, 'history'] : [...DETAIL_TABS];
  const requestedTab = searchParams.get('tab') ?? 'basic';
  const activeTab = visibleTabs.includes(requestedTab) ? requestedTab : 'basic';
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: plan,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminPlanControllerDetailOptions({ path: { planId: contractId } }),
  });

  if (isLoading) return <ContractDetailSkeleton />;

  if (isError || !plan) {
    // 404 = unknown or deleted plan, 400 = a malformed id (E-VAL-001): both are "not found",
    // not a network failure — only other errors keep the retry state.
    const errorStatus = getApiErrorStatus(error);
    const isNotFound = errorStatus === 404 || errorStatus === 400;
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <PageHeader
          breadcrumb={<BackLink label="主契約管理に戻る" href={backToListHref} />}
          title="主契約詳細"
        />
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          <DataStateBoundary
            isLoading={false}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || !plan}
            onRetry={() => refetch()}
            emptyTitle="主契約が見つかりません"
            emptyDescription="削除されたか、存在しない主契約IDです。"
          />
        </div>
      </div>
    );
  }

  const statusKey = plan.isActive ? 'active' : 'inactive';

  const handleTabChange = (tab: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tab);
    router.replace(`?${sp.toString()}`, { scroll: false });
  };

  const { canEdit, editBlockedMessage } = getContractEditState(plan);
  const { canDelete, deleteBlockedMessage } = getContractDeleteState(plan);
  const { canCopy, copyBlockedMessage } = getContractCopyState(plan);
  const { canCreateChild, childCreateBlockedMessage } = getContractChildCreateState(plan);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackLink label="主契約管理に戻る" href={backToListHref} />}
        title={<TextWithTooltip text={plan.name} className="text-xl font-bold" />}
        badge={
          <>
            <Badge
              variant="outline"
              className={`gap-1 text-xs font-medium ${MAIN_CONTRACT_STATUS_BADGE_CLASSES[statusKey]}`}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {MAIN_CONTRACT_STATUS_LABELS[statusKey]}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${MAIN_CONTRACT_TYPE_BADGE_CLASSES[plan.contractType]}`}
            >
              {MAIN_CONTRACT_TYPE_LABELS[plan.contractType]}
            </Badge>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* 複製 — opens the create flow prefilled from this master, so G-01's permission
                matrix puts it under the create permission. Blocked for 特殊契約 only, like the
                list menu; a derived child copies as a sibling under the same 親主契約 (FR-M005). */}
            <RoleGatedButton
              requiredPermission={Permission.ContractsCreate}
              variant="outline"
              className="gap-1"
              disabled={!canCopy}
              tooltip={copyBlockedMessage}
              onClick={() =>
                router.push(
                  withReturnTo(
                    `${navigate('/contracts/create')}?copyFrom=${contractId}`,
                    backToListHref,
                  ),
                )
              }
            >
              <Copy className="size-4" />
              複製
            </RoleGatedButton>

            {/* G-01 FR-M007 子主契約の作成 — a 複製 whose 親主契約 is this master (`asDerived: true`);
                same permission as 複製, also blocked on a derived child (a child cannot have children). */}
            <RoleGatedButton
              requiredPermission={Permission.ContractsCreate}
              variant="outline"
              className="gap-1"
              disabled={!canCreateChild}
              tooltip={childCreateBlockedMessage}
              onClick={() =>
                router.push(
                  withReturnTo(
                    `${navigate('/contracts/create')}?copyFrom=${contractId}&asChild=1`,
                    backToListHref,
                  ),
                )
              }
            >
              <Network className="size-4" />
              子主契約を作成
            </RoleGatedButton>

            <RoleGatedButton
              requiredPermission={Permission.ContractsEdit}
              className="gap-1"
              disabled={!canEdit}
              onClick={() =>
                router.push(
                  withReturnTo(navigate('/contracts/[id]/edit', contractId), backToListHref),
                )
              }
              tooltip={editBlockedMessage}
            >
              <Pencil className="size-4" />
              編集
            </RoleGatedButton>

            <DropdownMenu>
              <DropdownMenuTrigger className="border-input hover:bg-accent flex size-8 items-center justify-center rounded-md border">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <RoleGatedMenuItem
                  requiredPermission={Permission.ContractsDelete}
                  className="text-destructive"
                  disabled={!canDelete}
                  tooltip={deleteBlockedMessage}
                  tooltipSide="left"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  削除
                </RoleGatedMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <PlanDeleteDialog
              planId={plan.planId}
              planName={plan.name}
              parentPlanId={plan.parentPlanId}
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              context="detail"
              onDeleted={() => router.push(navigate('/contracts'))}
            />
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
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="pricing">料金・条件</TabsTrigger>
            {canViewHistory && <TabsTrigger value="history">変更履歴</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="basic" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <BasicInfoTab plan={plan} />
        </TabsContent>

        <TabsContent value="pricing" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <PricingTab plan={plan} />
        </TabsContent>

        {canViewHistory && (
          <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <HistoryTab planId={plan.planId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
