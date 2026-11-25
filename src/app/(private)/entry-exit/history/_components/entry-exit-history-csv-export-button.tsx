'use client';

import { useRef } from 'react';

import { Download } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Spinner } from '@/components/ui/spinner';

import type { AccessLogExportRequestDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { useEntryExitHistoryCsvExport } from '../_hooks/use-entry-exit-history-csv-export.hook';

interface EntryExitHistoryCsvExportButtonProps {
  exportBody: AccessLogExportRequestDto;
}

/** FR-013/FR-014: exports the currently filtered history using the applied search/filter conditions. */
export function EntryExitHistoryCsvExportButton({
  exportBody,
}: EntryExitHistoryCsvExportButtonProps) {
  const { mutate: exportCsv, isPending } = useEntryExitHistoryCsvExport();
  // `isPending` only disables the button after a re-render, so a double click would queue two jobs.
  const submittingRef = useRef(false);

  return (
    <RoleGatedButton
      variant="outline"
      size="sm"
      requiredPermission={Permission.EntryExitHistoryExport}
      denyTooltip="入退館ログCSV出力の権限がありません"
      onClick={() => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        exportCsv(exportBody, {
          onSettled: () => {
            submittingRef.current = false;
          },
        });
      }}
      disabled={isPending}
    >
      {isPending ? <Spinner className="mr-2" /> : <Download className="mr-2 size-4" />}
      {isPending ? '出力中...' : 'CSV出力'}
    </RoleGatedButton>
  );
}
