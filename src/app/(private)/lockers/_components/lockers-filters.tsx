'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  LOCKER_SHAPE_TYPE_LABELS,
  LOCKER_SHAPE_TYPE_OPTIONS,
  type LockerShapeType,
} from '../_constants/locker-enum-labels.constants';

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

type LockersFiltersProps = {
  filters: {
    lockers_shape: LockerShapeType | null;
  };
  searchInput: string;
  setFilters: (value: { lockers_page?: number; lockers_shape?: LockerShapeType | null }) => void;
  setSearchInput: (value: string) => void;
};

/**
 * Search and filters for the locker list tab.
 * The only filter is "shape", so per common GUI rule A8 (2 filters or fewer stay
 * always expanded) there is no collapsible advanced-filters section.
 */
export function LockersFilters({
  filters,
  searchInput,
  setFilters,
  setSearchInput,
}: LockersFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative max-w-100 flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="案内文・補足説明で検索"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 pl-9 text-xs"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Select
          value={filters.lockers_shape ?? 'all'}
          onValueChange={(value) => {
            setFilters({
              lockers_shape: value === 'all' ? null : (value as LockerShapeType),
              lockers_page: 1,
            });
          }}
        >
          <SelectTrigger
            size="sm"
            className={`h-8 w-40 text-xs ${filterActiveClass(filters.lockers_shape !== null)}`}
          >
            <SelectValue>
              {filters.lockers_shape
                ? LOCKER_SHAPE_TYPE_LABELS[filters.lockers_shape]
                : '全ての形状'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ての形状</SelectItem>
            {LOCKER_SHAPE_TYPE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
