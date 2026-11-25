'use client';

import { useState } from 'react';

/**
 * Keeps a list query's last successful result on screen while the next request fails (FR-020).
 *
 * `placeholderData: keepPreviousData` only covers the pending state: once the new key errors,
 * `data` turns `undefined` and the table would show its filtered-empty state, which reads as a real
 * 0-row result. Paired with `useQueryErrorToast`, the user sees the error and keeps the old rows.
 */
export function useLastSuccessfulData<T>(data: T | undefined, isError: boolean): T | undefined {
  const [lastData, setLastData] = useState(data);
  if (data !== undefined && !isError && data !== lastData) setLastData(data);
  return isError ? lastData : data;
}
