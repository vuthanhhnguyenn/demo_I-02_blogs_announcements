'use client';

import { useCallback, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { adminLockerContractsControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerDetailDto } from '@/lib/api-real/types.gen';

import { ReleaseConfirmDialog } from '../../_components/release-confirm-dialog';
import {
  LOCKER_SHAPE_GRID,
  LOCKER_SLOT_STATUS_CELL_CLASSES,
  LOCKER_SLOT_STATUS_LABELS,
  normalizeLockerSlotCode,
} from '../../_constants/locker-enum-labels.constants';
import { useLockerFeeOptions } from '../../_hooks/use-locker-fee-options.hook';
import { useLockerServerCsvExport } from '../../_hooks/use-locker-server-csv-export.hook';
import type { LockerSlotReleaseTarget } from '../../_utils/locker-slot-release.util';
import { useLockerSlotMutations } from '../_hooks/use-locker-slot-mutations.hook';
import { buildLockerSlotRows } from '../_utils/locker-slot-rows.util';
import { SlotAssignDialog } from './slot-assign-dialog';
import { SlotContractsTable } from './slot-contracts-table';
import { SlotDetailSheet } from './slot-detail-sheet';

interface SlotManagementTabProps {
  locker: LockerDetailDto;
}

export function SlotManagementTab({ locker }: SlotManagementTabProps) {
  const {
    releaseTargets: releaseSlots,
    setFeeOption,
    isReleasing,
    isUpdatingSlot,
  } = useLockerSlotMutations();
  const { mutate: exportCsv, isPending: isExportingCsv } = useLockerServerCsvExport();

  // A cabinet holds ≤ 27 slots, so one page at the API max (100) covers every live contract row.
  const { data: contractsData } = useQuery(
    adminLockerContractsControllerListOptions({
      query: { storeId: locker.storeId, lockerId: locker.id, page: 1, limit: 100 },
    }),
  );
  const { options: feeOptions, byId: feeOptionsById } = useLockerFeeOptions({
    storeId: locker.storeId,
  });

  const [pendingOnly, setPendingOnly] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [assignSlotId, setAssignSlotId] = useState<string | null>(null);
  const [checkedSlots, setCheckedSlots] = useState<Map<string, LockerSlotReleaseTarget>>(new Map());
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseTargets, setReleaseTargets] = useState<LockerSlotReleaseTarget[]>([]);

  const rows = useMemo(
    () => buildLockerSlotRows(locker, contractsData?.items ?? []),
    [locker, contractsData?.items],
  );
  const { rows: rowCount, cols: columnCount } = LOCKER_SHAPE_GRID[locker.shapeType];
  const rowIndexes = useMemo(
    () => Array.from({ length: rowCount }, (_, index) => index),
    [rowCount],
  );

  const pendingRows = useMemo(
    () => rows.filter((row) => row.slot.status === 'pending_release'),
    [rows],
  );

  const displayedRows = useMemo(() => {
    const visible = pendingOnly
      ? pendingRows
      : rows.filter((row) => row.slot.status !== 'available');
    // The grid order is positional; the list below reads as a roster, so order it by slot code.
    return [...visible].sort((a, b) =>
      a.slot.slotCode.localeCompare(b.slot.slotCode, 'ja', { numeric: true }),
    );
  }, [rows, pendingOnly, pendingRows]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.slot.id === selectedSlotId) ?? null,
    [rows, selectedSlotId],
  );
  const assignRow = useMemo(
    () => rows.find((row) => row.slot.id === assignSlotId) ?? null,
    [rows, assignSlotId],
  );

  const toggleCheck = useCallback((target: LockerSlotReleaseTarget) => {
    setCheckedSlots((prev) => {
      const next = new Map(prev);
      if (next.has(target.slotId)) next.delete(target.slotId);
      else next.set(target.slotId, target);
      return next;
    });
  }, []);

  const handleBulkRelease = useCallback(() => {
    setReleaseTargets(Array.from(checkedSlots.values()));
    setReleaseDialogOpen(true);
  }, [checkedSlots]);

  const handleSingleRelease = useCallback((target: LockerSlotReleaseTarget) => {
    setReleaseTargets([target]);
    setReleaseDialogOpen(true);
  }, []);

  const handleConfirmRelease = useCallback(() => {
    releaseSlots(releaseTargets, {
      onSuccess: () => {
        setReleaseDialogOpen(false);
        setCheckedSlots(new Map());
        setSelectedSlotId(null);
      },
      onPartialSuccess: (openedSlotIds) => {
        setReleaseDialogOpen(false);
        setCheckedSlots((prev) => {
          const next = new Map(prev);
          openedSlotIds.forEach((id) => next.delete(id));
          return next;
        });
      },
    });
  }, [releaseSlots, releaseTargets]);

  const handlePendingOnlyChange = useCallback((value: boolean) => {
    setPendingOnly(value);
    setCheckedSlots(new Map());
  }, []);

  const handleFeeOptionSave = useCallback(
    (slotId: string, slotLabel: string, feeOptionId: string | null) =>
      setFeeOption(slotId, slotLabel, feeOptionId),
    [setFeeOption],
  );

  const colLabels = useMemo(
    () => Array.from({ length: columnCount }, (_, index) => `${index + 1}列`),
    [columnCount],
  );
  const summary = locker.slotSummary;

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="pb-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">スロット配置図</CardTitle>
              <p className="text-muted-foreground text-xs">クリックでスロット詳細を表示</p>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            <div className="overflow-x-auto">
              <div className="mx-auto w-fit">
                <div className="mx-[136px] mb-2 flex gap-2">
                  {colLabels.map((col) => (
                    <div
                      key={col}
                      className="text-muted-foreground flex size-12 shrink-0 items-center justify-center text-xs font-medium"
                    >
                      {col}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  {rowIndexes.map((rowIndex) => {
                    const rowSlots = rows
                      .filter((row) => row.slot.rowIndex === rowIndex)
                      .sort((a, b) => a.slot.columnIndex - b.slot.columnIndex);
                    // A position label only: any slot can carry its own fee (API-101 v0.15)
                    const isBottomRow = rowSlots.some((row) => row.slot.isBottomRow);

                    return (
                      <div key={rowIndex} className="flex items-center gap-2">
                        <div className="flex w-32 shrink-0 items-center justify-end gap-2 pr-2">
                          <Badge
                            variant="outline"
                            className={`bg-info/15 text-info border-info/20 px-1 py-0 text-[10px] font-medium ${isBottomRow ? '' : 'invisible'}`}
                          >
                            最下段
                          </Badge>
                          {/* `rowIndex` 0 = top; 段 is counted from the bottom, as before */}
                          <div className="w-6 text-center text-xs font-medium">
                            {rowCount - rowIndex}段
                          </div>
                        </div>
                        {rowSlots.map(({ slot, label }) => {
                          const hidden = pendingOnly && slot.status !== 'pending_release';

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              title={`${label} — ${LOCKER_SLOT_STATUS_LABELS[slot.status]}`}
                              onClick={() => setSelectedSlotId(slot.id)}
                              className={`relative flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border text-[10px] font-medium transition-colors ${LOCKER_SLOT_STATUS_CELL_CLASSES[slot.status]} ${slot.isBottomRow ? 'border-t-info/60 border-t-2' : ''} ${selectedSlotId === slot.id ? 'ring-primary ring-2' : ''} ${hidden ? 'opacity-25' : ''}`}
                            >
                              {normalizeLockerSlotCode(slot.slotCode)}
                              {slot.feeOptionId !== null ? (
                                <span className="bg-foreground text-background absolute right-0.5 bottom-0.5 flex size-3 items-center justify-center rounded-[3px] text-[8px] leading-none font-bold">
                                  ¥
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                        <div className="w-32 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>

          <div className="bg-muted/50 text-muted-foreground rounded-b-xl border-t px-4 py-3 text-[10px]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-3">
                <span className="text-foreground font-medium">状態:</span>
                <div className="flex items-center gap-1">
                  <div className="border-border bg-background size-3 rounded border" /> 利用可
                </div>
                <div className="flex items-center gap-1">
                  <div className="border-info/20 bg-info/15 size-3 rounded border" /> 使用中
                </div>
                <div className="flex items-center gap-1">
                  <div className="border-warning/20 bg-warning/15 size-3 rounded border" /> 開放待ち
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-foreground font-medium">属性:</span>
                <div className="flex items-center gap-1">
                  <div className="border-border border-t-info/60 bg-background size-3 rounded border border-t-2" />
                  <span>最下段（上部 info色ライン）</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-foreground text-background flex size-3 items-center justify-center rounded-[3px] text-[8px] leading-none font-bold">
                    ¥
                  </span>
                  <span>個別会費設定済み</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="bg-card flex items-center gap-6 rounded-lg border px-4 py-3">
          <div className="text-muted-foreground text-xs">
            総スロット: <span className="text-foreground font-semibold">{summary.total}</span>
          </div>
          <div className="bg-border h-4 w-px" />
          <div className="text-muted-foreground text-xs">
            利用可: <span className="text-success font-semibold">{summary.available}</span>
          </div>
          <div className="bg-border h-4 w-px" />
          <div className="text-muted-foreground text-xs">
            使用中: <span className="text-info font-semibold">{summary.inUse}</span>
          </div>
          <div className="bg-border h-4 w-px" />
          <div className="text-muted-foreground text-xs">
            開放待ち: <span className="text-warning font-semibold">{summary.pendingRelease}</span>
          </div>
        </div>

        <SlotContractsTable
          feeOptions={feeOptions}
          feeOptionsById={feeOptionsById}
          pendingCount={pendingRows.length}
          displayedRows={displayedRows}
          rowCount={rowCount}
          pendingOnly={pendingOnly}
          onExportCsv={() =>
            exportCsv({
              kind: 'contracts',
              query: {
                storeId: locker.storeId,
                lockerId: locker.id,
                slotStatus: pendingOnly ? 'pending_release' : undefined,
              },
            })
          }
          isExportingCsv={isExportingCsv}
          onPendingOnlyChange={handlePendingOnlyChange}
          checkedSlots={checkedSlots}
          onToggleCheck={toggleCheck}
          onBulkRelease={handleBulkRelease}
          onSingleRelease={handleSingleRelease}
          onSelectSlot={setSelectedSlotId}
          onFeeOptionSave={handleFeeOptionSave}
          isUpdatingSlot={isUpdatingSlot}
        />
      </div>

      <SlotDetailSheet
        open={selectedSlotId !== null}
        onClose={() => setSelectedSlotId(null)}
        row={selectedRow}
        locker={locker}
        feeOptions={feeOptions}
        feeOptionsById={feeOptionsById}
        onRelease={(target) => {
          setSelectedSlotId(null);
          handleSingleRelease(target);
        }}
        onAssign={(slotId) => {
          setSelectedSlotId(null);
          setAssignSlotId(slotId);
        }}
      />

      <SlotAssignDialog
        open={assignRow !== null}
        onOpenChange={(open) => {
          if (!open) setAssignSlotId(null);
        }}
        row={assignRow}
        locker={locker}
        feeOptionsById={feeOptionsById}
      />

      <ReleaseConfirmDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        targetSlots={releaseTargets.map((target) => target.label)}
        onConfirm={handleConfirmRelease}
        isPending={isReleasing}
      />
    </>
  );
}
