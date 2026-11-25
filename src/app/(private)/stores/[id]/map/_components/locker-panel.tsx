'use client';

import { useEffect, useRef } from 'react';

import { ExternalLink, MapPin, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import type { MapCabinet } from './use-store-map-draft';

const PLACE_DISABLED_REASON =
  'フロア図の画像が未登録のため配置できません。先に画像を登録してください';

/**
 * Opens that cabinet's locker detail (E-01) in a new browser tab. This screen stays where it is,
 * so the draft survives and no discard dialog is needed (FR-034). V0 opens a generic detail with
 * no id (L236-L240); the spec asks for the selected cabinet's own.
 */
function openLockerDetailInNewTab(lockerId: string) {
  window.open(navigate('/lockers/[id]', lockerId), '_blank', 'noopener');
}

/** The row's symbol chip — the marker's shape at 24px (prototype L101-L112) */
function LockerSymbolChip({ symbol, selected }: Readonly<{ symbol: string; selected: boolean }>) {
  return (
    <span
      className={cn(
        'border-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold tabular-nums',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-background text-foreground',
      )}
    >
      {symbol}
    </span>
  );
}

interface LockerRowProps {
  cabinet: MapCabinet;
  placed: boolean;
  selected: boolean;
  hovered: boolean;
  canEdit: boolean;
  unsaved: boolean;
  /** Without a draft image 配置 is impossible and a placed cabinet cannot be drawn */
  hasImage: boolean;
  /** The reason this cabinet's last save failed, until the next save or discard */
  saveError?: string;
  rowRef: (element: HTMLDivElement | null) => void;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  onPlace: () => void;
  onUnplace: () => void;
}

/** One cabinet row, shared by both sections (prototype L114-L229) */
function LockerRow({
  cabinet,
  placed,
  selected,
  hovered,
  canEdit,
  unsaved,
  hasImage,
  saveError,
  rowRef,
  onSelect,
  onHoverChange,
  onPlace,
  onUnplace,
}: Readonly<LockerRowProps>) {
  const hiddenOnMap = placed && !hasImage;
  // A second line under the shape makes the row grow instead of clipping (L145, L153)
  const tall = hiddenOnMap || Boolean(saveError);

  return (
    <div
      ref={rowRef}
      data-locker-id={cabinet.id}
      aria-selected={selected}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2',
        tall ? 'py-1' : 'h-10',
        selected ? 'bg-accent' : hovered && 'bg-muted/50',
      )}
      onClick={onSelect}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <LockerSymbolChip symbol={cabinet.symbol} selected={selected} />
      <div className="min-w-0 flex-1">
        <div className="flex h-5 min-w-0 items-center gap-1">
          <span className="truncate text-sm">{cabinet.name}</span>
          {unsaved && (
            <span className="text-warning inline-flex shrink-0 items-center gap-1 text-xs">
              <span className="bg-warning size-2 rounded-full" aria-hidden="true" />
              未保存
            </span>
          )}
          {selected && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                <Button
                  variant="link"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    openLockerDetailInNewTab(cabinet.id);
                  }}
                >
                  詳細
                  <ExternalLink />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">ロッカー詳細を別タブで開きます</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="text-muted-foreground text-xs">{cabinet.shapeLabel}</div>
        {hiddenOnMap && (
          <div className="text-muted-foreground text-xs">画像がないため地図に表示できません</div>
        )}
        {saveError && <div className="text-destructive text-xs">{saveError}</div>}
      </div>
      {/* Read-only users get no row actions (FR-035) */}
      {canEdit &&
        (placed ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="配置を外す"
                onClick={(event) => {
                  event.stopPropagation();
                  onUnplace();
                }}
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">配置を外す</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            {/* The span carries the tooltip: a disabled button fires no pointer events */}
            <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasImage}
                onClick={(event) => {
                  event.stopPropagation();
                  onPlace();
                }}
              >
                <MapPin />
                配置
              </Button>
            </TooltipTrigger>
            {!hasImage && <TooltipContent side="top">{PLACE_DISABLED_REASON}</TooltipContent>}
          </Tooltip>
        ))}
    </div>
  );
}

interface LockerPanelProps {
  /** Every active cabinet of the store, sorted by symbol */
  cabinets: MapCabinet[];
  /** Ids with a draft position */
  placedIds: ReadonlySet<string>;
  dirtyIds: ReadonlySet<string>;
  saveErrors: Readonly<Record<string, string>>;
  selectedId: string | null;
  hoveredId: string | null;
  canEdit: boolean;
  hasImage: boolean;
  onSelect: (id: string) => void;
  onHoverChange: (id: string | null) => void;
  onPlace: (id: string) => void;
  onUnplace: (id: string) => void;
}

/**
 * The ロッカー筐体 panel: 未配置 then 配置済み (prototype L743-L790). Sticky beside the map and
 * capped to the viewport, so its list scrolls inside the card while the page body scrolls.
 */
export function LockerPanel({
  cabinets,
  placedIds,
  dirtyIds,
  saveErrors,
  selectedId,
  hoveredId,
  canEdit,
  hasImage,
  onSelect,
  onHoverChange,
  onPlace,
  onUnplace,
}: Readonly<LockerPanelProps>) {
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  // A cabinet picked on the map scrolls its row into view (L526-L530)
  useEffect(() => {
    if (!selectedId) return;
    rowRefs.current.get(selectedId)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const unplaced = cabinets.filter((cabinet) => !placedIds.has(cabinet.id));
  const placed = cabinets.filter((cabinet) => placedIds.has(cabinet.id));

  const renderRow = (cabinet: MapCabinet) => (
    <LockerRow
      key={cabinet.id}
      cabinet={cabinet}
      placed={placedIds.has(cabinet.id)}
      selected={selectedId === cabinet.id}
      hovered={hoveredId === cabinet.id}
      canEdit={canEdit}
      unsaved={dirtyIds.has(cabinet.id)}
      hasImage={hasImage}
      saveError={saveErrors[cabinet.id]}
      rowRef={(element) => {
        if (element) rowRefs.current.set(cabinet.id, element);
        else rowRefs.current.delete(cabinet.id);
      }}
      onSelect={() => onSelect(cabinet.id)}
      onHoverChange={(hovered) => onHoverChange(hovered ? cabinet.id : null)}
      onPlace={() => onPlace(cabinet.id)}
      onUnplace={() => onUnplace(cabinet.id)}
    />
  );

  return (
    <div className="sticky top-0 w-80 shrink-0">
      <Card className="max-h-[calc(100svh-220px)]">
        <CardHeader>
          <CardTitle className="text-base font-semibold">ロッカー筐体</CardTitle>
          <CardAction>
            <Badge variant="secondary" className="text-xs font-medium">
              {cabinets.length}棟
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-col">
          <ScrollArea className="flex min-h-0 flex-col">
            <div className="flex flex-col gap-4">
              <section className="flex flex-col gap-1">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                  未配置
                  {unplaced.length > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-warning/15 text-warning border-warning/20 text-xs font-medium"
                    >
                      {unplaced.length}
                    </Badge>
                  ) : (
                    <span>{unplaced.length}</span>
                  )}
                </div>
                {unplaced.length > 0 ? (
                  unplaced.map(renderRow)
                ) : (
                  <p className="text-muted-foreground text-xs">すべて配置済みです</p>
                )}
              </section>

              {/* No empty text here: at zero the heading and its 0 say it all (L777-L783) */}
              <section className="flex flex-col gap-1">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                  配置済み
                  <span>{placed.length}</span>
                </div>
                {placed.map(renderRow)}
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
