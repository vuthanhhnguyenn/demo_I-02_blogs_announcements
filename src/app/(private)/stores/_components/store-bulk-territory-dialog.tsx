'use client';

import { useMemo, useState } from 'react';

import { AlertTriangle, ArrowRight } from 'lucide-react';

import { TerritoryCombobox, useTerritoryAreas } from '@/components/common/data-select-input';
import { RequiredMark } from '@/components/common/field-marker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

import type { StoreSummaryDto } from '@/lib/api-real/types.gen';

import { API_UNSUPPORTED_NOTE } from '../_constants/constants';

/** AlertDialogContent does not scroll, so the distribution and the preview cap at five rows */
const PREVIEW_LIMIT = 5;

interface StoreBulkTerritoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The selected stores, accumulated across pages */
  selectedStores: StoreSummaryDto[];
  isPending?: boolean;
  /**
   * TODO(round3) B1 — optional while the bulk endpoint is missing: the page has no handler to
   * pass, and the confirm button below is disabled anyway. R301 makes it required again.
   */
  onExecute?: (territoryId: string) => void;
}

/**
 * The bulk territory change (Y-02 FR-001 / Y-15 FR-M005, spec FR-030–FR-035). The destination,
 * the before/after distribution, the cross-area consequences and the affected stores are all
 * reviewable in this one dialog before it is executed.
 *
 * TODO(round3) B1 — the real API ships neither the Y-15 hierarchy nor
 * `PATCH /admin/stores/bulk-territory`, and `StoreSummaryDto` carries no territory at all. The
 * dialog is kept whole rather than removed: the destination picker is inert (the combobox forces
 * its own `disabled`), the 変更前 distribution and the per-store "before" line render 「API未対応」,
 * and the confirm button is disabled with the same note. Round 3 restores the real groupings and
 * re-enables the button. The destination picker then comes back as the エリア → テリトリー cascade
 * (`AreaSelectInput` / `TerritorySelectInput`, prototype `47423ec`), not `TerritoryCombobox`.
 */
export function StoreBulkTerritoryDialog({
  open,
  onOpenChange,
  selectedStores,
  isPending = false,
  onExecute,
}: Readonly<StoreBulkTerritoryDialogProps>) {
  const [toTerritoryId, setToTerritoryId] = useState('');
  const { areas } = useTerritoryAreas();

  const destination = useMemo(() => {
    if (!toTerritoryId) return null;
    const area = areas.find((item) =>
      item.territories.some((territory) => territory.id === toTerritoryId),
    );
    const territory = area?.territories.find((item) => item.id === toTerritoryId);
    return area && territory ? { area, territory } : null;
  }, [areas, toTerritoryId]);

  /**
   * FR-032: where the selection currently sits, grouped by area and territory, most-populated first.
   *
   * TODO(round3) B1 — no row carries a territory, so the section keeps its shape with a single
   * 「API未対応」 bucket instead of a silently empty list.
   */
  const beforeDistribution = useMemo(
    () => [{ label: API_UNSUPPORTED_NOTE, count: selectedStores.length }],
    [selectedStores.length],
  );

  /**
   * FR-034: stores whose area changes too (their current area differs from the destination's).
   *
   * TODO(round3) B1 — undecidable without a territory on the row, so the warning below never
   * fires in Round 1. The block itself is kept so R301 only has to restore this computation.
   */
  const crossAreaStores: StoreSummaryDto[] = [];
  const crossAreaFromLabels: string[] = [];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setToTerritoryId('');
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>テリトリーの一括変更</AlertDialogTitle>
          <AlertDialogDescription>
            選択した {selectedStores.length} 件の店舗の所属テリトリーを一括で変更します。
            変更は即時反映され、エリア別の集計・レポートにも反映されます。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">
              変更先のテリトリー
              <RequiredMark />
            </Label>
            <TerritoryCombobox value={toTerritoryId} onValueChange={setToTerritoryId} />
            {/* FR-031: the destination's full path — everything above the territory is derived */}
            {destination && (
              <p className="text-muted-foreground text-xs">
                {[
                  destination.area.headquarters_name,
                  destination.area.block_name,
                  destination.area.name,
                  destination.territory.name,
                ].join(' › ')}
              </p>
            )}
          </div>

          <div className="bg-muted/50 space-y-2 rounded-md p-3">
            <div className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground w-16 shrink-0">変更前:</span>
              <div className="flex flex-col gap-1">
                {beforeDistribution.slice(0, PREVIEW_LIMIT).map((bucket) => (
                  <div key={bucket.label} className="flex items-center gap-2">
                    <span className="font-medium">{bucket.label}</span>
                    <span className="text-muted-foreground tabular-nums">{bucket.count}件</span>
                  </div>
                ))}
                {beforeDistribution.length > PREVIEW_LIMIT && (
                  <span className="text-muted-foreground">
                    他 {beforeDistribution.length - PREVIEW_LIMIT} テリトリー
                  </span>
                )}
              </div>
            </div>
            {/* FR-033 */}
            <div className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground w-16 shrink-0">変更後:</span>
              {destination ? (
                <div className="flex items-center gap-2">
                  <span className="text-primary font-medium">
                    {destination.area.name}／{destination.territory.name}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {selectedStores.length}件
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">変更先のテリトリーを選択してください</span>
              )}
            </div>
          </div>

          {destination && crossAreaStores.length > 0 && (
            <div className="border-warning/30 bg-warning/10 flex items-start gap-2 rounded-md border p-3">
              <AlertTriangle className="text-warning size-4 shrink-0" />
              <p className="text-foreground text-xs">
                {selectedStores.length}件のうち {crossAreaStores.length}件
                は所属エリアも変わります（
                {crossAreaFromLabels.join('・')} → {destination.area.name}）。
                予約管理の「エリア別」ビューと分析・レポートの集計対象が変わります。
              </p>
            </div>
          )}

          {/* FR-035: preview of the affected stores */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              対象店舗プレビュー（全 {selectedStores.length} 件）
            </Label>
            <div className="bg-background space-y-1 rounded-md border p-3">
              {selectedStores.slice(0, PREVIEW_LIMIT).map((store) => (
                <div key={store.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-20 shrink-0 font-mono">
                      {store.clubCode || '—'}
                    </span>
                    <span className="truncate font-medium">{store.name}</span>
                  </div>
                  <div className="flex items-center gap-1 pl-20 text-[10px]">
                    {/* TODO(round3) B1 — the row's current territory is not on the wire */}
                    <span className="text-muted-foreground truncate">{API_UNSUPPORTED_NOTE}</span>
                    <ArrowRight className="text-muted-foreground size-3 shrink-0" />
                    <span className="text-primary truncate">
                      {destination ? destination.territory.name : '―'}
                    </span>
                  </div>
                </div>
              ))}
              {selectedStores.length > PREVIEW_LIMIT && (
                <p className="text-muted-foreground border-t pt-1 text-xs">
                  他 {selectedStores.length - PREVIEW_LIMIT} 件
                </p>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          {/* TODO(round3) B1 — no `PATCH /admin/stores/bulk-territory` to call yet */}
          <span className="text-muted-foreground mr-auto self-center text-xs">
            {API_UNSUPPORTED_NOTE}
          </span>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction disabled onClick={() => onExecute?.(toTerritoryId)}>
            実行
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
