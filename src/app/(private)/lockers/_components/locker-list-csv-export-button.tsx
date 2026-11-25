'use client';

import { Suspense } from 'react';

import { Download, Loader2 } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';

import type { Permission } from '@/types/permission.type';

import { useLockerServerCsvExport } from '../_hooks/use-locker-server-csv-export.hook';
import { useLockerContractsFilters } from '../contracts/_hooks/use-locker-contracts-filters';
import { useLockerPendingSlotsFilters } from '../pending/_hooks/use-locker-pending-slots-filters';

/**
 * Only the contract list (API-101 #11) and pending-release list (API-101 #6) export CSV. The ロッカー一覧
 * CSV was closed as not adopted (API-100 §13 TBD-E01-LOCKER-CABINET-CSV, Otaki 2026-10-20).
 */
type LockerListTab = 'contracts' | 'pending';

/** The CSV export button label follows the active tab (prototype: locker management header) */
const CSV_EXPORT_LABELS: Record<LockerListTab, string> = {
  contracts: '契約一覧をCSV出力',
  pending: '開放待ち一覧をCSV出力',
};

type LockerListCsvExportButtonProps = {
  activeTab: 'lockers' | LockerListTab;
  permission: Permission;
  denyTooltip: string;
};

type TabButtonProps = Omit<LockerListCsvExportButtonProps, 'activeTab'>;

function ContractsTabCsvExportButton({ permission, denyTooltip }: TabButtonProps) {
  const { exportQueryParams } = useLockerContractsFilters();
  const { mutate: exportCsv, isPending } = useLockerServerCsvExport();

  return (
    <RoleGatedButton
      variant="outline"
      className="gap-1 whitespace-nowrap"
      requiredPermission={permission}
      denyTooltip={denyTooltip}
      onClick={() => exportCsv({ kind: 'contracts', query: exportQueryParams })}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {CSV_EXPORT_LABELS.contracts}
    </RoleGatedButton>
  );
}

function PendingTabCsvExportButton({ permission, denyTooltip }: TabButtonProps) {
  const { exportQueryParams } = useLockerPendingSlotsFilters();
  const { mutate: exportCsv, isPending } = useLockerServerCsvExport();

  return (
    <RoleGatedButton
      variant="outline"
      className="gap-1 whitespace-nowrap"
      requiredPermission={permission}
      denyTooltip={denyTooltip}
      onClick={() => exportCsv({ kind: 'pending-release', query: exportQueryParams })}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {CSV_EXPORT_LABELS.pending}
    </RoleGatedButton>
  );
}

export function LockerListCsvExportButton({ activeTab, ...props }: LockerListCsvExportButtonProps) {
  if (activeTab === 'lockers') return null;

  return (
    <Suspense
      fallback={
        <Button variant="outline" className="gap-1 whitespace-nowrap" disabled>
          <Download className="size-4" />
          {CSV_EXPORT_LABELS[activeTab]}
        </Button>
      }
    >
      {activeTab === 'contracts' ? (
        <ContractsTabCsvExportButton {...props} />
      ) : (
        <PendingTabCsvExportButton {...props} />
      )}
    </Suspense>
  );
}
