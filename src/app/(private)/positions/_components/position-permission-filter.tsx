'use client';

// Client component: popover open state + command palette interaction
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Check, Filter } from 'lucide-react';

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
import { Skeleton } from '@/components/ui/skeleton';

import { adminStaffPermissionControllerPermissionCatalogOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { PermissionCatalogResponseDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

type PositionPermissionFilterProps = {
  /** Catalog `permissionKey` — the FE holds no key list, the catalog is the source */
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

/**
 * Reverse permission filter — 権限で絞り込む (FR-003 / PAR009-PAR014).
 * Options come from the server catalog (58 keys, server labels and order): the
 * list endpoint validates `permission` against the same catalog (E-VAL-001).
 */
export function PositionPermissionFilter({ selectedKey, onSelect }: PositionPermissionFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: catalog, isLoading } = useQuery({
    ...adminStaffPermissionControllerPermissionCatalogOptions(),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant={selectedKey ? 'default' : 'outline'}
            size="sm"
            className="h-8 shrink-0 gap-1 text-xs"
          />
        }
      >
        <Filter className="size-3" />
        権限で絞り込む
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="権限を検索..." className="text-xs" />
          <CommandList className="max-h-[320px]">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={`permission-option-skeleton-${index}`} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <>
                <CommandEmpty>該当する権限がありません</CommandEmpty>
                {(catalog?.categories ?? []).map((category) => (
                  <CommandGroup key={category.categoryKey} heading={category.categoryLabel}>
                    {category.permissions.map((permission) => (
                      <CommandItem
                        key={permission.permissionKey}
                        value={`${category.categoryLabel} ${permission.label}`}
                        onSelect={() => {
                          onSelect(permission.permissionKey);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'size-3 shrink-0',
                            selectedKey === permission.permissionKey ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="text-xs">{permission.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Resolves the display label for a permission key from the server catalog
 * (filter banner summary); falls back to the raw key while the catalog loads.
 */
export function findPermissionLabel(
  key: string,
  catalog: PermissionCatalogResponseDto | undefined,
): string {
  for (const category of catalog?.categories ?? []) {
    const found = category.permissions.find((permission) => permission.permissionKey === key);
    if (found) return found.label;
  }
  return key;
}
