'use client';

import { type ReactNode, useMemo } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

/** One Y-15 area with its territories; block and head office are carried as names only */
export type TerritoryArea = {
  id: string;
  name: string;
  headquarters_name: string;
  block_name: string;
  territories: { id: string; name: string; active: boolean }[];
};

/**
 * TODO(round3) B1 — the Y-15 area→territory tree has no endpoint: no `/admin/areas`, no
 * `/admin/territories` (checked against the live backend's OpenAPI on 2026-09-23). A
 * module-level constant rather than a fresh `[]` per call, so consumers' memos stay stable.
 */
const NO_TERRITORY_AREAS: TerritoryArea[] = [];

/**
 * TODO(round3) B1 — while the hierarchy is missing, both selects below are forced disabled and
 * annotated 「API未対応」. R301 drops this flag together with the stub above, and the store list
 * restores its territory select's own reason copy (`TERRITORY_REQUIRES_AREA_TOOLTIP`).
 */
export const HIERARCHY_UNSUPPORTED = true;

export const API_UNSUPPORTED_NOTE = 'API未対応';

/** Base UI Select needs a concrete value for its "all" option; callers only ever see `null` */
const ALL = 'all';

/**
 * The Y-15 areas with their territories — the one place every area / territory picker reads the
 * hierarchy from. R301 replaces the stub with the real query here and nowhere else.
 */
export function useTerritoryAreas(): { areas: TerritoryArea[]; isLoading: boolean } {
  return { areas: NO_TERRITORY_AREAS, isLoading: false };
}

function ApiUnsupportedTooltip({ children }: Readonly<{ children: ReactNode }>) {
  if (!HIERARCHY_UNSUPPORTED) return children;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{API_UNSUPPORTED_NOTE}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface HierarchySelectProps {
  /** Selected id; `null` is the "all" state */
  value: string | null;
  onChange: (id: string | null) => void;
  /** Label of the "all" row, also shown on the trigger while nothing is selected */
  allLabel?: string;
  disabled?: boolean;
  triggerClassName?: string;
}

/** Y-15 area picker — the upper tier of the area → territory cascade (FR-014). */
export function AreaSelectInput({
  value,
  onChange,
  allLabel = '全エリア',
  disabled = false,
  triggerClassName,
}: Readonly<HierarchySelectProps>) {
  const { areas } = useTerritoryAreas();

  return (
    <ApiUnsupportedTooltip>
      <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
        <SelectTrigger
          size="sm"
          disabled={HIERARCHY_UNSUPPORTED || disabled}
          className={cn('w-fit min-w-[160px] rounded-lg', triggerClassName)}
        >
          <SelectValue>{areas.find((area) => area.id === value)?.name ?? allLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area.id} value={area.id}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ApiUnsupportedTooltip>
  );
}

/**
 * Y-15 territory picker — the lower tier of the cascade (FR-014). Offers only the territories of
 * `areaId`, and every territory while no area is chosen.
 */
export function TerritorySelectInput({
  areaId,
  value,
  onChange,
  allLabel = '全テリトリー',
  disabled = false,
  triggerClassName,
}: Readonly<HierarchySelectProps & { areaId: string | null }>) {
  const { areas } = useTerritoryAreas();

  const territories = useMemo(
    () => areas.filter((area) => !areaId || area.id === areaId).flatMap((area) => area.territories),
    [areas, areaId],
  );

  return (
    <ApiUnsupportedTooltip>
      <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
        <SelectTrigger
          size="sm"
          disabled={HIERARCHY_UNSUPPORTED || disabled}
          className={cn('w-fit max-w-[240px] min-w-[180px] rounded-lg', triggerClassName)}
        >
          <SelectValue>
            {territories.find((territory) => territory.id === value)?.name ?? allLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {territories.map((territory) => (
            <SelectItem key={territory.id} value={territory.id}>
              {territory.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ApiUnsupportedTooltip>
  );
}
