'use client';

import { type Dispatch, type SetStateAction } from 'react';

import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  CONTROLLER_STATUS_LABELS,
  CONTROLLER_STATUS_VALUES,
  type ControllerStatus,
} from '../_constants/constants';

/** API-104 caps the keyword (`q`) at 100 characters. */
const CONTROLLER_SEARCH_MAX_LENGTH = 100;

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface ControllerFiltersProps {
  searchInput: string;
  setSearchInput: (value: string) => void;
  status: ControllerStatus | null;
  onStatusChange: (status: ControllerStatus | null) => void;
  activeFilterCount: number;
  isFilterOpen: boolean;
  setIsFilterOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * Toolbar of the 接点制御装置一覧 panel: keyword search plus a collapsible ステータス filter.
 * The prototype's controller panel has no filter-result banner and no in-panel 店舗 filter —
 * the header store selector is the only store scope (see `useControllerFilters`).
 */
export function ControllerFilters({
  searchInput,
  setSearchInput,
  status,
  onStatusChange,
  activeFilterCount,
  isFilterOpen,
  setIsFilterOpen,
}: ControllerFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-[400px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="装置名、IPアドレスで検索"
            // BUG-E02-D-04 — API-104 rejects a `q` over 100 chars with 400 E-VAL-001.
            maxLength={CONTROLLER_SEARCH_MAX_LENGTH}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-8 pl-9 text-xs"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setIsFilterOpen((previous) => !previous)}
          >
            <SlidersHorizontal className="size-4" />
            {isFilterOpen ? '閉じる' : '詳細フィルター'}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
            {isFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status ?? 'all'}
            onValueChange={(value) =>
              onStatusChange(value === 'all' ? null : (value as ControllerStatus))
            }
          >
            <SelectTrigger className={`h-8 w-44 text-xs ${filterActiveClass(status !== null)}`}>
              <SelectValue placeholder="全ステータス">
                {status ? CONTROLLER_STATUS_LABELS[status] : '全ステータス'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              {CONTROLLER_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {CONTROLLER_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground ml-auto h-8 text-xs"
            onClick={() => onStatusChange(null)}
          >
            すべてクリア
          </Button>
        </div>
      )}
    </div>
  );
}
