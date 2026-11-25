'use client';

import type { ReactNode } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { PageHeader } from '@/components/common/page-header';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  adminConnectedDeviceControllerListOptions,
  adminRelayControllerControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { RouteKey } from '@/lib/routes/routes.type';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { EquipmentCsvExportButton } from './_components/equipment-csv-export-button';

type EquipmentTab = 'equipment' | 'controllers';

const EQUIPMENT_TAB_ROUTES: Record<EquipmentTab, RouteKey> = {
  equipment: '/equipment',
  controllers: '/controllers',
};

const TAB_VIEW_PERMISSIONS: Record<EquipmentTab, Permission> = {
  equipment: Permission.EquipmentView,
  controllers: Permission.ControllerView,
};

function getActiveTab(pathname: string): EquipmentTab | null {
  if (pathname === navigate('/controllers')) return 'controllers';
  if (pathname === navigate('/equipment')) return 'equipment';
  return null;
}

export default function EquipmentManagementLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { hasPermission } = useAuthUser();
  const { currentStoreId } = useCurrentStore();
  const activeTab = getActiveTab(pathname);

  // Counts follow the header store scope, and are deliberately independent of the in-panel
  // search/filters (SR-006). There is no summary endpoint on the real API: each count is the
  // `totalItems` of a one-row list request (D10).
  const scopedStoreId = currentStoreId === ALL_STORES ? undefined : currentStoreId;

  const { data: equipmentPage } = useQuery({
    ...adminConnectedDeviceControllerListOptions({
      query: { storeId: scopedStoreId, limit: 1 },
    }),
    enabled: activeTab !== null,
  });

  const { data: controllerPage } = useQuery({
    ...adminRelayControllerControllerListOptions({
      query: { storeId: scopedStoreId, limit: 1 },
    }),
    enabled: activeTab !== null,
  });

  if (!activeTab) {
    return children;
  }

  // BUG-E02-A-14 / A-15 — while a count is loading (or its request failed) there is no number to
  // show; falling back to 0 flashed a false 「0件」 before the data arrived.
  const equipmentCount: number | string = equipmentPage?.pagination.totalItems ?? '—';
  const controllerCount: number | string = controllerPage?.pagination.totalItems ?? '—';

  const visibleTabs = (Object.keys(EQUIPMENT_TAB_ROUTES) as EquipmentTab[]).filter((tab) =>
    hasPermission(TAB_VIEW_PERMISSIONS[tab]),
  );

  const handleTabChange = (tab: string) => {
    const routeKey = EQUIPMENT_TAB_ROUTES[tab as EquipmentTab];
    if (routeKey) {
      router.push(navigate(routeKey));
    }
  };

  return (
    <>
      <PageHeader
        title="店舗機器管理"
        badge={
          <Badge variant="outline" className="text-xs">
            {typeof equipmentCount === 'number' ? `${equipmentCount}件` : equipmentCount}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <EquipmentCsvExportButton />
            {/* BUG-E02-A-16 / D-08 — the menu is always rendered (prototype RoleGatedMenuItem): a
                role without a create right sees the items dimmed with 「権限なし」 instead of no
                button at all. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button className="gap-1">
                    <Plus className="size-4" />
                    新規登録
                    <ChevronDown className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <RoleGatedMenuItem
                  requiredPermission={Permission.EquipmentCreate}
                  denyBadge="権限なし"
                  onClick={() => router.push(withReturnTo(navigate('/equipment/create')))}
                >
                  接続機器を登録
                </RoleGatedMenuItem>
                <RoleGatedMenuItem
                  requiredPermission={Permission.ControllerCreate}
                  denyBadge="権限なし"
                  onClick={() => router.push(withReturnTo(navigate('/controllers/create')))}
                >
                  接点制御装置を登録
                </RoleGatedMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="bg-background flex flex-1 flex-col gap-4 px-6 py-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
          <TabsList variant="line">
            {visibleTabs.includes('equipment') ? (
              <TabsTrigger value="equipment" className="text-sm">
                接続機器一覧
                <Badge
                  variant="outline"
                  className="bg-muted-foreground/15 text-muted-foreground ml-1 min-w-5 border-transparent px-1 font-medium tabular-nums"
                >
                  {equipmentCount}
                </Badge>
              </TabsTrigger>
            ) : null}
            {visibleTabs.includes('controllers') ? (
              <TabsTrigger value="controllers" className="text-sm">
                接点制御装置一覧
                <Badge
                  variant="outline"
                  className="bg-muted-foreground/15 text-muted-foreground ml-1 min-w-5 border-transparent px-1 font-medium tabular-nums"
                >
                  {controllerCount}
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
