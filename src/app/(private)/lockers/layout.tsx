'use client';

import type { ReactNode } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { Map, Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { RouteKey } from '@/lib/routes/routes.type';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { LockerListCsvExportButton } from './_components/locker-list-csv-export-button';
import { useLockerTabCounts } from './_hooks/use-locker-tab-counts.hook';

type LockerTab = 'lockers' | 'contracts' | 'pending';

const LOCKER_TAB_ROUTES: Record<LockerTab, RouteKey> = {
  lockers: '/lockers',
  contracts: '/lockers/contracts',
  pending: '/lockers/pending',
};

/**
 * The create button is shown only on the locker (parent) list tab. Slot assignment (E-01 FR-005)
 * starts from an available slot on the cabinet detail, not from the contract list.
 */
const LOCKER_CREATE_CONFIG: Partial<
  Record<LockerTab, { route: RouteKey; permission: Permission; denyTooltip: string; label: string }>
> = {
  lockers: {
    route: '/lockers/create',
    permission: Permission.LockersCreate,
    denyTooltip: 'ロッカー登録の権限がありません',
    label: 'ロッカーを登録',
  },
};

const CSV_EXPORT_CONFIG: Partial<
  Record<LockerTab, { permission: Permission; denyTooltip: string }>
> = {
  // No ロッカー一覧 CSV: API-100 §13 TBD-E01-LOCKER-CABINET-CSV closed as not adopted (Otaki, 2026-10-20)
  contracts: {
    permission: Permission.LockersContractsExport,
    denyTooltip: 'CSV出力の権限がありません',
  },
  pending: {
    permission: Permission.LockersPendingExport,
    denyTooltip: 'CSV出力の権限がありません',
  },
};

const TAB_VIEW_PERMISSIONS: Partial<Record<LockerTab, Permission>> = {
  lockers: Permission.LockersView,
  contracts: Permission.LockersContractsView,
  pending: Permission.LockersPendingView,
};

function getActiveTab(pathname: string): LockerTab | null {
  if (pathname === navigate('/lockers/contracts')) return 'contracts';
  if (pathname === navigate('/lockers/pending')) return 'pending';
  if (pathname === navigate('/lockers')) return 'lockers';
  return null;
}

export default function LockersLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { hasPermission } = useAuthUser();
  const activeTab = getActiveTab(pathname);

  const counts = useLockerTabCounts(activeTab !== null);

  if (!activeTab) {
    return children;
  }

  const handleTabChange = (tab: string) => {
    const routeKey = LOCKER_TAB_ROUTES[tab as LockerTab];
    if (routeKey) {
      router.push(navigate(routeKey));
    }
  };

  const createConfig = LOCKER_CREATE_CONFIG[activeTab];
  const csvExportConfig = CSV_EXPORT_CONFIG[activeTab];
  const visibleTabs = (Object.keys(LOCKER_TAB_ROUTES) as LockerTab[]).filter((tab) => {
    const required = TAB_VIEW_PERMISSIONS[tab];
    return !required || hasPermission(required);
  });

  return (
    <>
      <PageHeader
        title="ロッカー管理"
        actions={
          <div className="flex items-center gap-2 whitespace-nowrap">
            {csvExportConfig ? (
              <LockerListCsvExportButton
                activeTab={activeTab}
                permission={csvExportConfig.permission}
                denyTooltip={csvExportConfig.denyTooltip}
              />
            ) : null}
            {/* FR-016 ロッカーマップ表示 → 店舗マップ設定 (Y-02-05 FR-071). `/stores/map` resolves the
                header's store itself; edit rights are decided there. Not offered to roles that
                cannot open it (Trainer / Observer, Y-02 FR-061). */}
            {hasPermission(Permission.StoresView) ? (
              <Button
                variant="outline"
                className="gap-1 whitespace-nowrap"
                onClick={() => router.push(navigate('/stores/map'))}
              >
                <Map className="size-4" />
                店舗マップ設定
              </Button>
            ) : null}
            {createConfig ? (
              <RoleGatedButton
                className="gap-1 whitespace-nowrap"
                requiredPermission={createConfig.permission}
                denyTooltip={createConfig.denyTooltip}
                onClick={() => router.push(withReturnTo(navigate(createConfig.route)))}
              >
                <Plus className="size-4" />
                {createConfig.label}
              </RoleGatedButton>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            {visibleTabs.includes('lockers') ? (
              <TabsTrigger value="lockers" className="text-sm">
                ロッカー一覧
                <Badge
                  variant="outline"
                  className="bg-muted-foreground/15 text-muted-foreground ml-1 min-w-5 border-transparent px-1 font-medium tabular-nums"
                >
                  {counts.lockers ?? '—'}
                </Badge>
              </TabsTrigger>
            ) : null}
            {visibleTabs.includes('contracts') ? (
              <TabsTrigger value="contracts" className="text-sm">
                契約一覧
                <Badge
                  variant="outline"
                  className="bg-muted-foreground/15 text-muted-foreground ml-1 min-w-5 border-transparent px-1 font-medium tabular-nums"
                >
                  {counts.contracts ?? 0}
                </Badge>
              </TabsTrigger>
            ) : null}
            {visibleTabs.includes('pending') ? (
              <TabsTrigger value="pending" className="text-sm">
                開放待ち一覧
                <Badge
                  variant="outline"
                  className="bg-muted-foreground/15 text-muted-foreground ml-1 min-w-5 border-transparent px-1 font-medium tabular-nums"
                >
                  {counts.pending ?? 0}
                </Badge>
              </TabsTrigger>
            ) : null}
          </TabsList>
        </Tabs>

        {children}
      </div>
    </>
  );
}
