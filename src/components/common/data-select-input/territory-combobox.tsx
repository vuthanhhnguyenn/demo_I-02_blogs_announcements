'use client';

import { useState } from 'react';

import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';

import {
  API_UNSUPPORTED_NOTE,
  HIERARCHY_UNSUPPORTED,
  useTerritoryAreas,
} from './area-select-input';

interface TerritoryComboboxProps {
  /** The selected territory id (e.g. "TRT-001"); empty string when nothing is chosen */
  value: string;
  onValueChange: (territoryId: string) => void;
  disabled?: boolean;
  /** Marks the trigger invalid so `useScrollToFirstError` can find it (spec 028 FR-066) */
  'aria-invalid'?: boolean;
  className?: string;
}

/**
 * The Y-15 territory picker (FR-030).
 *
 * Popover + Command rather than Select: a Select's trigger renders the value itself, so holding
 * a territory id there would put an internal id like "TRT-012" on screen. This pairing keeps the
 * value (the id) separate from the label (territory name + area name).
 *
 * TODO(round3) B1 — the real API ships no Y-15 hierarchy: no `/admin/territories`, and `stores`
 * has no `territory_id` column. The control is kept on screen exactly as specified but is forced
 * disabled and annotated 「API未対応」, and its value is stripped from every request body. R301
 * drops the two `TODO(round3) B1` lines below and nothing else.
 */
export function TerritoryCombobox({
  value,
  onValueChange,
  disabled,
  'aria-invalid': ariaInvalid,
  className,
}: Readonly<TerritoryComboboxProps>) {
  const [open, setOpen] = useState(false);
  const { areas } = useTerritoryAreas();

  // TODO(round3) B1 — never operable until the hierarchy endpoints exist
  const isDisabled = HIERARCHY_UNSUPPORTED;

  const selectedArea = areas.find((area) =>
    area.territories.some((territory) => territory.id === value),
  );
  const selectedTerritory = selectedArea?.territories.find((territory) => territory.id === value);
  const triggerLabel = selectedTerritory
    ? `${selectedTerritory.name}（${selectedArea?.name}）`
    : null;

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-invalid={ariaInvalid || undefined}
              disabled={isDisabled || disabled}
              className={cn('w-full justify-between font-normal', className)}
            />
          }
        >
          {triggerLabel ? (
            <span className="truncate">{triggerLabel}</span>
          ) : (
            <span className="text-muted-foreground">テリトリーを選択</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="テリトリー名・エリア名で検索..." />
            <CommandList>
              <CommandEmpty>該当なし</CommandEmpty>
              {areas.map((area) => {
                // Inactive territories are not offered, but a selected one stays visible
                const territories = area.territories.filter(
                  (territory) => territory.active || territory.id === value,
                );
                if (territories.length === 0) return null;

                return (
                  <CommandGroup key={area.id} heading={area.name}>
                    {territories.map((territory) => (
                      <CommandItem
                        key={territory.id}
                        // Searchable by both territory name and area name
                        value={`${territory.name} ${area.name}`}
                        onSelect={() => {
                          onValueChange(territory.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 size-4',
                            territory.id === value ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="flex-1">{territory.name}</span>
                        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                          {area.name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {/* TODO(round3) B1 — goes away with the forced `disabled` above */}
      {HIERARCHY_UNSUPPORTED && (
        <p className="text-muted-foreground text-xs">{API_UNSUPPORTED_NOTE}</p>
      )}
    </div>
  );
}

interface TerritoryBreadcrumbProps {
  /** Territory id. Renders nothing for an empty or unresolvable id. */
  territoryId: string;
  className?: string;
}

/**
 * The hierarchy path above a territory: head office > block > area > territory.
 *
 * Y-02 FR-002 L132 — a store stores only its territory, so the upper levels are shown as a
 * derived path rather than as fields of their own (spec 028 FR-033).
 */
export function TerritoryBreadcrumb({
  territoryId,
  className,
}: Readonly<TerritoryBreadcrumbProps>) {
  const { areas } = useTerritoryAreas();
  const area = areas.find((candidate) =>
    candidate.territories.some((territory) => territory.id === territoryId),
  );
  const territory = area?.territories.find((candidate) => candidate.id === territoryId);
  if (!area || !territory) return null;

  const nodes = [area.headquarters_name, area.block_name, area.name, territory.name];

  return (
    <p className={cn('text-muted-foreground text-xs', className)}>
      {nodes.map((node, index) => (
        <span key={node}>
          {index > 0 && <span>{' › '}</span>}
          <span className={index === nodes.length - 1 ? 'text-foreground' : undefined}>{node}</span>
        </span>
      ))}
    </p>
  );
}
