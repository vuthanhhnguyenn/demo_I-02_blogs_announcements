'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { CardHeader, CardTitle } from '@/components/ui/card';

import {
  adminStoreControllerGetBusinessHoursQueryKey,
  adminStoreControllerReplaceBusinessHoursMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreBusinessHourDto } from '@/lib/api-real/types.gen';

import { WEEKDAY_TO_API } from '../../../../_utils/store-api.util';
import {
  DAY_LABELS,
  DAY_ORDER,
  type WeeklyHours,
  type WeeklyHoursDraft,
  holidayModeOf,
  holidayRowOf,
  toReplaceBusinessHoursItems,
  toWeeklyHoursDraft,
} from './business-hours-shared';
import { BusinessHoursSheet, type HoursSheetMode } from './business-hours-sheet';
import { BusinessSettingsEditButton } from './business-settings-edit-button';

type Props = {
  storeId: string;
  serverHours: WeeklyHours;
};

const SAVED_TOAST: Record<HoursSheetMode, string> = {
  hours: '営業時間設定を保存しました',
  staff: 'スタッフ常駐時間帯を保存しました',
};

function TimeRange({ from, to }: { from: string | null; to: string | null }) {
  return (
    <div className="flex items-center gap-1">
      <Clock className="text-muted-foreground size-3" />
      <span className="text-xs">{from ?? '—'}</span>
      <span className="text-muted-foreground text-xs">〜</span>
      <span className="text-xs">{to ?? '—'}</span>
    </div>
  );
}

/**
 * 営業時間設定 and スタッフ常駐時間帯 (FR-025, FR-026) — read views of the one weekly set, each
 * with a 編集 that opens its Sheet (FR-029 / FR-029a). D14 — this is the only writer of the weekly
 * business hours in Round 1: `PATCH /admin/stores/{id}` cannot carry them (B13).
 */
export function BusinessHoursSettings({ storeId, serverHours }: Props) {
  const queryClient = useQueryClient();
  const run = useInFlightGuard();
  const [sheetMode, setSheetMode] = useState<HoursSheetMode | null>(null);
  const [initialDraft, setInitialDraft] = useState<WeeklyHoursDraft>(() =>
    toWeeklyHoursDraft(serverHours),
  );

  const replaceMutation = useMutation({
    ...adminStoreControllerReplaceBusinessHoursMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminStoreControllerGetBusinessHoursQueryKey({ path: { id: storeId } }),
      });
    },
  });

  const openSheet = (mode: HoursSheetMode) => {
    setInitialDraft(toWeeklyHoursDraft(serverHours));
    setSheetMode(mode);
  };

  const save = (draft: WeeklyHoursDraft) => {
    const mode = sheetMode ?? 'hours';
    // Failures are toasted by the shared MutationCache; the catch only avoids an unhandled rejection
    void run(async () => {
      await replaceMutation.mutateAsync({
        path: { id: storeId },
        body: { items: toReplaceBusinessHoursItems(draft) },
      });
      toast.success(SAVED_TOAST[mode]);
      setSheetMode(null);
    }).catch(() => undefined);
  };

  const holidayMode = holidayModeOf(holidayRowOf(serverHours));
  const rowFor = (day: (typeof DAY_ORDER)[number]): StoreBusinessHourDto | undefined =>
    serverHours.find((row) => row.dayOfWeek === WEEKDAY_TO_API[day]);

  /** The 祝日 row reads its override, not a closed flag (FR-025, FR-026) */
  const holidayCell = () =>
    holidayMode === 'weekday' ? (
      <span className="text-muted-foreground text-xs">曜日どおり</span>
    ) : holidayMode === 'closed' ? (
      <span className="text-destructive text-xs">休業</span>
    ) : null;

  return (
    <>
      <CardHeader className="gap-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">営業時間設定</CardTitle>
          <BusinessSettingsEditButton
            storeId={storeId}
            denyTooltip="営業時間編集の権限がありません"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => openSheet('hours')}
          >
            <Pencil className="size-3" />
            編集
          </BusinessSettingsEditButton>
        </div>
      </CardHeader>

      <div className="flex flex-col gap-3 px-4">
        {DAY_ORDER.map((day) => {
          const row = rowFor(day);
          return (
            <div key={day} className="grid grid-cols-[3rem_1fr] items-center gap-2">
              <span className="text-xs font-medium">{DAY_LABELS[day]}</span>
              {(day === 'holiday' && holidayCell()) ||
                (!row ? (
                  <span className="text-muted-foreground text-xs">—</span>
                ) : row.isClosed ? (
                  <span className="text-destructive text-xs">定休日</span>
                ) : (
                  <TimeRange from={row.openTime} to={row.closeTime} />
                ))}
            </div>
          );
        })}
      </div>

      {/* Y-02 FR-005 staff-on-site hours: the window the B-01 gate stop (FR-M005) reads. Saved
          by the same `PUT …/business-hours` as the weekly set above. */}
      <div className="mt-4 border-t px-4 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium">スタッフ常駐時間帯</p>
          <BusinessSettingsEditButton
            storeId={storeId}
            denyTooltip="スタッフ常駐時間帯の編集権限がありません"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px]"
            onClick={() => openSheet('staff')}
          >
            <Pencil className="size-3" />
            編集
          </BusinessSettingsEditButton>
        </div>
        <p className="text-muted-foreground mb-3 text-[10px]">
          ゲートストップの判定に使用されます。常駐なしの場合は「—」と表示されます。
        </p>
        <div className="flex flex-col gap-2">
          {DAY_ORDER.map((day) => {
            const row = rowFor(day);
            return (
              <div key={`staff-${day}`} className="grid grid-cols-[3rem_1fr] items-center gap-2">
                <span className="text-xs font-medium">{DAY_LABELS[day]}</span>
                {(day === 'holiday' && holidayCell()) ||
                  (row?.isClosed ? (
                    <span className="text-destructive text-xs">定休日</span>
                  ) : row?.staffStartTime && row.staffEndTime ? (
                    <TimeRange from={row.staffStartTime} to={row.staffEndTime} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <BusinessHoursSheet
        mode={sheetMode}
        initialDraft={initialDraft}
        isPending={replaceMutation.isPending}
        onClose={() => setSheetMode(null)}
        onSave={save}
      />
    </>
  );
}
