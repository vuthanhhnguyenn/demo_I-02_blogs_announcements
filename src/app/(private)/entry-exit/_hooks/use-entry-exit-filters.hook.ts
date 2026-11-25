import { useEffect } from 'react';

import { ALL_STORES } from '@/contexts/current-store.context';
import { getTodayJstISODate, isISODateString } from '@/utils/date.util';
import { parseAsString, useQueryStates } from 'nuqs';

/**
 * FR-B01-09/10: URL-synced date scope for the activity tables and hourly chart.
 * The default day is today's JST business date, whatever the browser timezone.
 * `storeOverride` is a page-local narrowing filter on top of the header's global store scope
 * (`useCurrentStore()`) — see `entry-exit-header-controls.tsx` for when it applies.
 */
export function useEntryExitFilters() {
  const today = getTodayJstISODate();
  const [filters, setFilters] = useQueryStates(
    {
      date: parseAsString.withDefault(today),
      store_id: parseAsString.withDefault(ALL_STORES),
    },
    { history: 'push', shallow: false },
  );

  // A hand-edited `?date=` that is not a real date (`abc`) or lies in the future (the API
  // rejects it with 422 E-VIS-005) falls back to today, and the URL is rewritten to match.
  const isDateUsable = isISODateString(filters.date) && filters.date <= today;
  const date = isDateUsable ? filters.date : today;
  useEffect(() => {
    if (!isDateUsable) setFilters({ date: null }, { history: 'replace' });
  }, [isDateUsable, setFilters]);

  return {
    date,
    storeOverride: filters.store_id,
    setDate: (date: string) => setFilters({ date }),
    setStoreOverride: (storeId: string) =>
      setFilters({ store_id: storeId === ALL_STORES ? null : storeId }),
  };
}
