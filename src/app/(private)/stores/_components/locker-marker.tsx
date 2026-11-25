'use client';

import type { KeyboardEvent, PointerEvent } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { LockerListItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

/**
 * Store-map shape copy (prototype `data/store-map.ts` L44-L49). Every cabinet is 3 columns wide;
 * the API's enum names the row count. Deliberately not the E-01 locker screens'
 * `LOCKER_SHAPE_LABELS`, whose 「3段×9列」 wording differs from the map's 「3列×9段」.
 */
export const LOCKER_MAP_SHAPE_LABELS: Record<LockerListItemDto['shapeType'], string> = {
  three_by_nine: '3列×9段',
  three_by_seven: '3列×7段',
  three_by_five: '3列×5段',
  three_by_two: '3列×2段',
};

/** Tooltip and accessible name: 「A　ロッカー棟A・3列×9段」 — a full-width space after the symbol */
export function lockerMarkerLabel(symbol: string, name: string, shapeLabel: string): string {
  return `${symbol}　${name}・${shapeLabel}`;
}

interface LockerMarkerProps {
  lockerId: string;
  /** Location symbol (A〜) drawn inside the marker */
  symbol: string;
  name: string;
  shapeLabel: string;
  /** Position relative to the floor image, 0.0–1.0 from its top-left corner */
  x: number;
  y: number;
  selected?: boolean;
  hovered?: boolean;
  dragging?: boolean;
  /** The position differs from the last saved one — a warning dot at the top-right */
  unsaved?: boolean;
  /**
   * Read-only callers (the detail tab, a Manager on the setup screen) pass no move handlers;
   * this only switches the cursor and touch behaviour so the marker does not look grabbable.
   */
  readOnly: boolean;
  onClick?: () => void;
  onHoverChange?: (hovered: boolean) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
  /** Also wired to pointer cancel, so a cancelled gesture ends the drag like a release */
  onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * One cabinet on the floor map: 32px high whatever the map's rendered scale, centred on its
 * relative position. Ported from the prototype's `components/store-floor-map.tsx` L40-L80.
 *
 * `left` / `top` are the only inline style — a percentage of the overlay cannot be expressed as
 * a static Tailwind class.
 */
export function LockerMarker({
  lockerId,
  symbol,
  name,
  shapeLabel,
  x,
  y,
  selected = false,
  hovered = false,
  dragging = false,
  unsaved = false,
  readOnly,
  onClick,
  onHoverChange,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
}: Readonly<LockerMarkerProps>) {
  const label = lockerMarkerLabel(symbol, name, shapeLabel);

  return (
    <Tooltip>
      {/* The trigger renders as a <button>, so the marker is focusable and keyboard-operable */}
      <TooltipTrigger
        aria-label={label}
        aria-pressed={onClick ? selected : undefined}
        data-locker-id={lockerId}
        className={cn(
          'border-foreground bg-background text-foreground absolute inline-flex h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 px-1 text-sm font-semibold tabular-nums shadow-sm outline-none select-none hover:shadow-md',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
          hovered && 'shadow-md',
          selected &&
            'border-primary bg-primary text-primary-foreground ring-ring ring-offset-background z-10 ring-2 ring-offset-2',
          readOnly ? 'cursor-default' : 'cursor-grab touch-none',
          dragging && 'cursor-grabbing shadow-lg',
        )}
        style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onPointerEnter={onHoverChange ? () => onHoverChange(true) : undefined}
        onPointerLeave={onHoverChange ? () => onHoverChange(false) : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {symbol}
        {unsaved && (
          <span
            aria-hidden
            className="bg-warning ring-background pointer-events-none absolute -top-1 -right-1 size-2.5 rounded-full ring-2"
          />
        )}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
