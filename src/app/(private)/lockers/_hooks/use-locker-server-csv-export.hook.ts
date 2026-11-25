'use client';

import { useCallback, useRef } from 'react';

import { downloadCsv, getCsvFilenameFromContentDisposition } from '@/utils/csv.util';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  AdminLockerContractsApi101,
  AdminLockerSlotOperationsApi101,
} from '@/lib/api-real/sdk.gen';
import type {
  AdminLockerContractsControllerExportCsvData,
  AdminLockerSlotOpsControllerExportPendingReleaseData,
} from '@/lib/api-real/types.gen';

type CsvDownload = { blob: Blob; filename: string };

export type LockerContractsCsvQuery = NonNullable<
  AdminLockerContractsControllerExportCsvData['query']
>;
export type LockerPendingCsvQuery = NonNullable<
  AdminLockerSlotOpsControllerExportPendingReleaseData['query']
>;

export type LockerServerCsvRequest =
  | { kind: 'contracts'; query: LockerContractsCsvQuery }
  | { kind: 'pending-release'; query: LockerPendingCsvQuery };

async function fetchCsv(request: LockerServerCsvRequest): Promise<CsvDownload> {
  const { data, response } =
    request.kind === 'contracts'
      ? await AdminLockerContractsApi101.adminLockerContractsControllerExportCsv({
          query: request.query,
          parseAs: 'blob',
          throwOnError: true,
        })
      : await AdminLockerSlotOperationsApi101.adminLockerSlotOpsControllerExportPendingRelease({
          query: request.query,
          parseAs: 'blob',
          throwOnError: true,
        });

  const fallback =
    request.kind === 'contracts' ? 'locker_contracts.csv' : 'locker_pending_release.csv';
  return {
    blob: data as unknown as Blob,
    filename: getCsvFilenameFromContentDisposition(
      response.headers.get('content-disposition'),
      fallback,
    ),
  };
}

/**
 * Server CSV for the locker screens (API-101 `…/export`, `text/csv`, UTF-8 BOM + CRLF).
 * Errors (400 over 10,000 rows, 429 E-RATE-001) are toasted by the shared MutationCache.
 * `mutate` ignores a click while an export is in flight: two clicks in one tick would both pass
 * the button's `disabled={isPending}`, which only applies after the next render.
 */
export function useLockerServerCsvExport() {
  const inFlightRef = useRef(false);
  const mutation = useMutation({
    mutationFn: fetchCsv,
    onSuccess: ({ blob, filename }) => {
      downloadCsv(blob, filename);
      toast.success('CSVを出力しました');
    },
    onSettled: () => {
      inFlightRef.current = false;
    },
  });
  const { mutate } = mutation;

  const exportCsv = useCallback(
    (request: LockerServerCsvRequest) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      mutate(request);
    },
    [mutate],
  );

  return { ...mutation, mutate: exportCsv };
}
