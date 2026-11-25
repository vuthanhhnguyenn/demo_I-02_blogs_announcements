'use client';

import { useState } from 'react';

import { Calendar, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  type BusinessException,
  CALENDAR_EDIT_DENY_TOOLTIP,
  sortByDate,
  toDisplayDate,
} from './business-hours-shared';
import { BusinessSettingsEditButton } from './business-settings-edit-button';
import {
  ExceptionDayDeleteDialog,
  ExceptionDayDialog,
  type ExceptionDialogState,
} from './exception-day-dialog';

type Props = {
  storeId: string;
  /** Both kinds of the one `/business-exceptions` list — the one-per-date rule spans them */
  exceptions: BusinessException[];
};

/**
 * 特別営業日 (FR-027, D14) — the `short_hours` rows of `/business-exceptions` (research R4): a
 * day open with special hours. Each row is its own create / update / delete request, made from
 * the shared dialog rather than inline (research R13).
 */
export function ExceptionHoursSettings({ storeId, exceptions }: Props) {
  const [dialog, setDialog] = useState<ExceptionDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessException | null>(null);

  const entries = sortByDate(exceptions.filter((row) => row.exceptionType === 'short_hours'));

  return (
    <div className="border-t px-4 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium">特別営業日</p>
        <BusinessSettingsEditButton
          storeId={storeId}
          denyTooltip={CALENDAR_EDIT_DENY_TOOLTIP}
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-[10px]"
          onClick={() => setDialog({ kind: 'short_hours', target: null })}
        >
          <Plus className="size-3" />
          日付追加
        </BusinessSettingsEditButton>
      </div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-xs">
          特別営業日の設定はありません
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const displayDate = toDisplayDate(entry.date);
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="text-muted-foreground size-3 shrink-0" />
                  <span className="text-xs">{displayDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {entry.openTime ?? '—'} 〜 {entry.closeTime ?? '—'}
                  </span>
                  <BusinessSettingsEditButton
                    storeId={storeId}
                    denyTooltip={CALENDAR_EDIT_DENY_TOOLTIP}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="size-6 p-0"
                    aria-label={`${displayDate} の特別営業日を編集`}
                    onClick={() => setDialog({ kind: 'short_hours', target: entry })}
                  >
                    <Pencil className="size-3" />
                  </BusinessSettingsEditButton>
                  <BusinessSettingsEditButton
                    storeId={storeId}
                    denyTooltip={CALENDAR_EDIT_DENY_TOOLTIP}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive size-6 p-0"
                    aria-label={`${displayDate} の特別営業日を削除`}
                    onClick={() => setDeleteTarget(entry)}
                  >
                    <Trash2 className="size-3" />
                  </BusinessSettingsEditButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ExceptionDayDialog
        storeId={storeId}
        state={dialog}
        exceptions={exceptions}
        onClose={() => setDialog(null)}
      />
      <ExceptionDayDeleteDialog
        storeId={storeId}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
