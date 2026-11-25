'use client';

import {
  TERMS_BRANDS,
  TERMS_BRAND_LABELS,
  TERMS_STATUS_LABELS,
  type TermsBrand,
  type TermsStatus,
} from '@/app/(private)/terms/_constants/constants';
import type { useTermsFilters } from '@/app/(private)/terms/_hooks/use-terms-filters';
import { Search, SlidersHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BRAND_FILTER_ITEMS: Record<string, string> = {
  all: '全ブランド',
  ...Object.fromEntries(TERMS_BRANDS.map((brand) => [brand, TERMS_BRAND_LABELS[brand]])),
};
const STATUS_FILTER_ITEMS = { all: '全ステータス', ...TERMS_STATUS_LABELS };

function filterActiveClass(active: boolean) {
  return active ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface TermsFiltersProps {
  filtersHook: ReturnType<typeof useTermsFilters>;
}

export function TermsFilters({ filtersHook }: Readonly<TermsFiltersProps>) {
  const { filters, setFilters, searchInput, setSearchInput, brandScope, activeFilterCount } =
    filtersHook;
  // A scoped role's select is fixed to the account's brand group and offers only that brand (US1-8).
  const brandItems: Record<string, string> = brandScope.isLocked
    ? brandScope.brand
      ? { [brandScope.brand]: TERMS_BRAND_LABELS[brandScope.brand] }
      : { all: BRAND_FILTER_ITEMS.all }
    : BRAND_FILTER_ITEMS;
  const brandValue = brandScope.isLocked
    ? (brandScope.brand ?? 'all')
    : (filters.brandEnum ?? 'all');

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <div className="relative max-w-100 min-w-60 flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="規約ID・規約名で検索..."
          className="pl-9 text-xs"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {activeFilterCount > 0 && (
          <span
            className="text-muted-foreground flex items-center gap-1"
            aria-label={`適用中のフィルター ${activeFilterCount}件`}
          >
            <SlidersHorizontal className="size-4" />
            <Badge variant="secondary" className="h-5 px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          </span>
        )}
        <Select
          items={brandItems}
          value={brandValue}
          disabled={brandScope.isLocked}
          onValueChange={(value) =>
            setFilters({
              brandEnum: value === 'all' ? null : (value as TermsBrand),
              page: 1,
            })
          }
        >
          <SelectTrigger
            className={`h-8 w-35 text-xs ${filterActiveClass(filtersHook.brandEnum !== null)}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(brandItems).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={STATUS_FILTER_ITEMS}
          value={filters.status ?? 'all'}
          onValueChange={(value) =>
            setFilters({
              status: value === 'all' ? null : (value as TermsStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger
            className={`h-8 w-35 text-xs ${filterActiveClass(filters.status !== null)}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_FILTER_ITEMS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex cursor-pointer items-center gap-2 text-xs select-none">
          <Checkbox
            checked={filters.includeDeleted}
            onCheckedChange={(checked) => setFilters({ includeDeleted: !!checked, page: 1 })}
            className="size-4"
          />
          削除済みも含めて表示
        </label>
      </div>
    </div>
  );
}
