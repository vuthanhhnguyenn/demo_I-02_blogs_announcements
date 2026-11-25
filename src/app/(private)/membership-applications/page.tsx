'use client';

import { Suspense } from 'react';

import { useRouter } from 'next/navigation';

import { useCurrentStore } from '@/contexts/current-store.context';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Loading } from '@/components/common/data-state-boundary/loading';
import { RoleGatedButton } from '@/components/common/role-gated-button';

import { adminApplicationControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { MembershipApplicationsFilters } from './_components/membership-applications-filters';
import { MembershipApplicationsKpiCards } from './_components/membership-applications-kpi-cards';
import { MembershipApplicationsTable } from './_components/membership-applications-table';
import { MembershipApplicationsFiltersProvider } from './_contexts/membership-applications-filters-context';
import { useMembershipApplicationsFilters } from './_hooks/use-membership-applications-filters';

function MembershipApplicationsPageContent() {
  const filtersHook = useMembershipApplicationsFilters();
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  // Avoid firing the query with the default "all stores" scope before the caller's
  // real, role-resolved store scope is known — matching entry-exit-section.tsx's
  // (feature 013) enabled/isStoreScopeLoading pattern (research.md R6). Without this,
  // restricted roles (Staff/Manager/Trainer/Observer) fetch once with `store: undefined`
  // (currentStoreId still defaults to "all") and again once the store list resolves
  // currentStoreId to their actual store.
  const { currentStoreId, isLoading: isStoreScopeLoading } = useCurrentStore();
  // KPI cards (FR-004) own a list call of their own, independent of the table's: the server
  // counts `kpi` over the role-scope baseline only (no filters / page / sort), so this query
  // carries the header store scope and nothing else, and the table sends `includeKpi: false`.
  // Paging / filtering never refetches the KPI; a state change invalidates both.
  const { data, isLoading, isError } = useQuery({
    ...adminApplicationControllerListOptions({
      query: {
        page: 1,
        limit: 1,
        storeId: currentStoreId === 'all' ? undefined : currentStoreId,
        includeKpi: true,
      },
    }),
    enabled: !isStoreScopeLoading,
    placeholderData: keepPreviousData,
  });

  return (
    <MembershipApplicationsFiltersProvider value={filtersHook}>
      <main className="bg-muted/40 min-h-0 flex-1 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">入会申請管理</h1>
          </div>
          {/* Gated by permission, not role: 管理画面から入会登録 is 職位に依る, so roles that
              hold the screen but not the action (e.g. Staff — see ROLE_PERMISSIONS) must see
              the button disabled instead of clicking through to /403. */}
          <RoleGatedButton
            requiredPermission={Permission.MembershipApplicationsCreate}
            denyTooltip="管理画面から入会登録する権限がありません"
            onClick={() => router.push(withReturnTo(navigate('/membership-applications/create')))}
          >
            <Plus className="mr-2 size-4" />
            管理画面から入会登録
          </RoleGatedButton>
        </div>

        <div className="flex flex-col gap-6">
          <MembershipApplicationsKpiCards
            kpi={data?.kpi}
            isLoading={isLoading || isStoreScopeLoading}
            isError={isError}
          />

          <div className="bg-card overflow-hidden rounded-xl border">
            <MembershipApplicationsFilters />
            <MembershipApplicationsTable />
          </div>
        </div>
      </main>
    </MembershipApplicationsFiltersProvider>
  );
}

export default function MembershipApplicationsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MembershipApplicationsPageContent />
    </Suspense>
  );
}
