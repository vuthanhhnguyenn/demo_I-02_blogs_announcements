'use client';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { getTodayJstISODate } from '@/utils/date.util';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useEntryExitFilters } from '../_hooks/use-entry-exit-filters.hook';
import { ActivityTable } from './activity-table';
import { EntryExitHeaderControls } from './entry-exit-header-controls';
import { HourlyEntryChart } from './hourly-entry-chart';

export function EntryExitSection() {
  const { date, storeOverride, setDate, setStoreOverride } = useEntryExitFilters();
  const { currentStoreId, isLoading: isStoreScopeLoading } = useCurrentStore();

  // Header scope wins when it's a specific store; when the header is "全店舗", the
  // page-local narrowing filter (if any) takes over. See entry-exit-header-controls.tsx.
  const scopeStoreId = currentStoreId === ALL_STORES ? storeOverride : currentStoreId;
  // "全店舗" omits storeId: the visit-monitor feed and chart then span the caller's scope.
  const effectiveStoreId = scopeStoreId === ALL_STORES ? undefined : scopeStoreId;

  // Wait for the restricted-role store scope to resolve before fetching — otherwise
  // these queries fire once with the default "all" scope and again once the real
  // store id is known (see CurrentStoreProvider).
  const queriesEnabled = !isStoreScopeLoading;

  // Compared with the JST business date, not the browser's local day (BUG-B01-01).
  const isPastDate = date < getTodayJstISODate();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="入退館"
        badge={
          isPastDate ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge
                      variant="outline"
                      className="bg-warning/15 text-warning border-warning/20 cursor-help"
                    />
                  }
                >
                  履歴データ
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {format(parseISO(date), 'yyyy年M月d日(E)', { locale: ja })}
                  の確定データです。リアルタイム更新は停止しています。
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : undefined
        }
        dateControl={
          <EntryExitHeaderControls
            date={date}
            storeOverride={storeOverride}
            onDateChange={setDate}
            onStoreOverrideChange={setStoreOverride}
          />
        }
      />

      <div className="flex flex-col gap-4 p-6">
        <HourlyEntryChart date={date} storeId={effectiveStoreId} enabled={queriesEnabled} />

        {/* Side by side on desktop; stacked below lg so each 4-column table keeps a usable width. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ActivityTable
            title="入館"
            direction="entry"
            date={date}
            storeId={effectiveStoreId}
            enabled={queriesEnabled}
          />
          <ActivityTable
            title="退館"
            direction="exit"
            date={date}
            storeId={effectiveStoreId}
            enabled={queriesEnabled}
          />
        </div>
      </div>
    </div>
  );
}
