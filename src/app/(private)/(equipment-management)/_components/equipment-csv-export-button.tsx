'use client';

import { Suspense } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { downloadCsv, getCsvFilenameFromContentDisposition } from '@/utils/csv.util';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';

import { AdminConnectedDeviceManagementApi103, AdminRelayControllerApi104 } from '@/lib/api-real';
import type {
  AdminConnectedDeviceControllerExportCsvData,
  AdminRelayControllerControllerExportCsvData,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { useSubmitGuard } from '../_hooks/use-submit-guard.hook';
import { CONTROLLER_STATUS_VALUES } from '../controllers/_constants/constants';
import { CONTROLLER_SORT_VALUES } from '../controllers/_hooks/use-controller-filters';
import { EQUIPMENT_SORT_VALUES } from '../equipment/_hooks/use-equipment-filters';

type SortOrder = 'asc' | 'desc';

type CsvDownload = { blob: Blob; filename: string };

type EquipmentExportQuery = NonNullable<AdminConnectedDeviceControllerExportCsvData['query']>;
type ControllerExportQuery = NonNullable<AdminRelayControllerControllerExportCsvData['query']>;

function asSortOrder(value: string | null, fallback: SortOrder): SortOrder {
  return value === 'asc' || value === 'desc' ? value : fallback;
}

function asEquipmentSortKey(value: string | null): EquipmentExportQuery['sort'] {
  return EQUIPMENT_SORT_VALUES.find((key) => key === value) ?? 'createdAt';
}

function asControllerSortKey(value: string | null): ControllerExportQuery['sort'] {
  return CONTROLLER_SORT_VALUES.find((key) => key === value) ?? 'createdAt';
}

function asControllerStatus(value: string | null): ControllerExportQuery['status'] {
  return CONTROLLER_STATUS_VALUES.find((status) => status === value);
}

/**
 * Both exports stream the file itself (`text/csv`, BOM + CRLF), so the body is taken as a blob and
 * the filename from Content-Disposition.
 *
 * The file must hold exactly the rows on screen (FR-011), so the scope each list actually applies
 * is rebuilt here rather than read off the in-panel params alone — see `use-equipment-filters.ts`
 * / `use-controller-filters.ts`. A `storeId` left out exports every store in the caller's scope.
 */
async function exportEquipment(
  searchParams: URLSearchParams,
  storeId: string | undefined,
): Promise<CsvDownload> {
  const query: EquipmentExportQuery = {
    storeId,
    q: searchParams.get('equipment_search') || undefined,
    deviceType:
      (searchParams.get('equipment_type') as EquipmentExportQuery['deviceType']) || undefined,
    // The 異常 deep link (SR-004) pins the status through `equipment_filter`, leaving
    // `equipment_status` empty, so both params have to be consulted.
    status:
      ((searchParams.get('equipment_filter') ||
        searchParams.get('equipment_status')) as EquipmentExportQuery['status']) || undefined,
    sort: asEquipmentSortKey(searchParams.get('equipment_sort_by')),
    order: asSortOrder(searchParams.get('equipment_sort_order'), 'desc'),
  };

  const { data, response } =
    await AdminConnectedDeviceManagementApi103.adminConnectedDeviceControllerExportCsv({
      query,
      parseAs: 'blob',
      throwOnError: true,
    });

  return {
    blob: data,
    filename: getCsvFilenameFromContentDisposition(
      response.headers.get('content-disposition'),
      'connected_devices.csv',
    ),
  };
}

/** `GET /admin/relay-controllers/export` — the 9 FR-007 columns, same filters as the list (Q8). */
async function exportControllers(
  searchParams: URLSearchParams,
  storeId: string | undefined,
): Promise<CsvDownload> {
  const query: ControllerExportQuery = {
    storeId,
    q: searchParams.get('controller_search')?.trim() || undefined,
    status: asControllerStatus(searchParams.get('controller_status')),
    sort: asControllerSortKey(searchParams.get('controller_sort_by')),
    order: asSortOrder(searchParams.get('controller_sort_order'), 'desc'),
  };

  const { data, response } =
    await AdminRelayControllerApi104.adminRelayControllerControllerExportCsv({
      query,
      parseAs: 'blob',
      throwOnError: true,
    });

  return {
    blob: data,
    filename: getCsvFilenameFromContentDisposition(
      response.headers.get('content-disposition'),
      'relay_controllers.csv',
    ),
  };
}

/**
 * One plain 出力 button, as in the prototype: it exports whichever list the user is looking at,
 * so the tab decides both the endpoint and the permission being checked.
 */
function EquipmentCsvExportButtonContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentStoreId } = useCurrentStore();
  const isControllerTab = pathname === navigate('/controllers');

  // The header store scope wins over the in-panel 店舗 filter, which only exists on the device tab
  // under 全店舗 — without it a single-store user would export every store's ledger.
  const isAllStoresScope = currentStoreId === ALL_STORES;
  const exportStoreId = isAllStoresScope
    ? isControllerTab
      ? undefined
      : (searchParams.get('equipment_store_id') ?? undefined)
    : currentStoreId;

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (): Promise<CsvDownload> => {
      const params = new URLSearchParams(searchParams.toString());
      return isControllerTab
        ? exportControllers(params, exportStoreId)
        : exportEquipment(params, exportStoreId);
    },
    onSuccess: ({ blob, filename }) => {
      downloadCsv(blob, filename);
      toast.success('CSVを出力しました');
    },
    // Failures reach the shared MutationCache toast (D12).
  });

  // BUG-E02-A-12 — `isPending` disables the button only on the next render, so a burst of clicks
  // started two exports. Unlike a form submit, an export is repeatable on purpose, so the guard is
  // reopened once the request settles (success included).
  const { submitOnce, resetSubmitGuard } = useSubmitGuard(isPending, isError);
  const handleExport = () => submitOnce(() => mutate(undefined, { onSettled: resetSubmitGuard }));

  return (
    <RoleGatedButton
      variant="outline"
      className="gap-1"
      requiredPermission={
        isControllerTab ? Permission.ControllerExport : Permission.EquipmentExport
      }
      denyTooltip="CSV出力の権限がありません"
      onClick={handleExport}
      disabled={isPending}
    >
      <Download className="size-4" />
      CSV出力
    </RoleGatedButton>
  );
}

export function EquipmentCsvExportButton() {
  return (
    <Suspense
      fallback={
        <Button variant="outline" className="gap-1" disabled>
          <Download className="size-4" />
          CSV出力
        </Button>
      }
    >
      <EquipmentCsvExportButtonContent />
    </Suspense>
  );
}
