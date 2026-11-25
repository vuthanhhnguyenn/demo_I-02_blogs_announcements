'use client';

import { type QueryClient, useQueries } from '@tanstack/react-query';

import { adminWriteoffAccountingControllerListAccountingExportsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AccountingExportListItemDto } from '@/lib/api-real/types.gen';

import { EXPORT_PENDING_REFETCH_MS, isExportRunning } from '../_utils/accounting-export.util';

// API-119 §9 `exportIds` takes 1–20 ids per request
const EXPORT_IDS_PER_REQUEST = 20;

function chunkExportIds(exportIds: string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < exportIds.length; index += EXPORT_IDS_PER_REQUEST) {
    chunks.push(exportIds.slice(index, index + EXPORT_IDS_PER_REQUEST));
  }
  return chunks;
}

/** One §9 read of any number of requests — split into calls of at most 20 ids */
export async function fetchExportRows(
  queryClient: QueryClient,
  exportIds: string[],
): Promise<AccountingExportListItemDto[]> {
  const lists = await Promise.all(
    chunkExportIds(exportIds).map((chunk) =>
      queryClient.fetchQuery({
        ...adminWriteoffAccountingControllerListAccountingExportsOptions({
          query: { exportIds: chunk },
        }),
        staleTime: 0,
      }),
    ),
  );
  return lists.flatMap((list) => list.items);
}

/**
 * Status rows for the kept requests, 20 ids per §9 call. `undefined` until every call has
 * answered; a call with a running row is re-read until it settles.
 */
export function useExportRows(
  exportIds: string[],
  enabled: boolean,
): AccountingExportListItemDto[] | undefined {
  return useQueries({
    queries: chunkExportIds(exportIds).map((chunk) => ({
      ...adminWriteoffAccountingControllerListAccountingExportsOptions({
        query: { exportIds: chunk },
      }),
      enabled,
      staleTime: 0,
      refetchInterval: (query: { state: { data?: { items: AccountingExportListItemDto[] } } }) =>
        query.state.data?.items.some(isExportRunning) ? EXPORT_PENDING_REFETCH_MS : false,
    })),
    combine: (results) =>
      results.length > 0 && results.every((result) => result.data !== undefined)
        ? results.flatMap((result) => result.data?.items ?? [])
        : undefined,
  });
}
