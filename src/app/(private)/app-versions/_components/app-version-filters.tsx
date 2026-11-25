'use client';

import { BRAND_ENUM_LABELS } from '@/components/common/brand-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  APP_VERSION_BRANDS,
  APP_VERSION_STATUSES,
  APP_VERSION_STATUS_LABELS,
  type AppVersionBrand,
  type AppVersionStatus,
} from '../_constants/app-version.constants';
import type { useAppVersionsFilters } from '../_hooks/use-app-versions-filters';

const BRAND_FILTER_ITEMS: Record<string, string> = {
  all: '全ブランド',
  ...Object.fromEntries(APP_VERSION_BRANDS.map((brand) => [brand, BRAND_ENUM_LABELS[brand]])),
};

const STATUS_FILTER_ITEMS: Record<string, string> = {
  all: '全状態',
  ...Object.fromEntries(
    APP_VERSION_STATUSES.map((status) => [status, APP_VERSION_STATUS_LABELS[status]]),
  ),
};

interface AppVersionFiltersProps {
  filtersHook: ReturnType<typeof useAppVersionsFilters>;
}

export function AppVersionFilters({ filtersHook }: AppVersionFiltersProps) {
  const { filters, setFilters } = filtersHook;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <Select
        items={BRAND_FILTER_ITEMS}
        value={filters.brandEnum ?? 'all'}
        onValueChange={(value) =>
          setFilters({
            brandEnum: value === 'all' ? null : (value as AppVersionBrand),
            page: 1,
          })
        }
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(BRAND_FILTER_ITEMS).map(([key, label]) => (
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
            status: value === 'all' ? null : (value as AppVersionStatus),
            page: 1,
          })
        }
      >
        <SelectTrigger className="h-8 w-32 text-xs">
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
    </div>
  );
}
