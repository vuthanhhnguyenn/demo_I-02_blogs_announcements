'use client';

// TODO(round3) B1 — re-add `AreaSelectInput` / `TerritorySelectInput` with the cascade below
import { useAuthUser } from '@/contexts/auth-user.context';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { FcCompanySelectInput } from '@/components/common/data-select-input';
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

import { cn } from '@/lib/utils';

import { UserRole } from '@/types/permission.type';

import {
  DIRECT_MANAGEMENT_COMPANY_ID,
  STORE_BRAND_FILTER_OPTIONS,
  STORE_BRAND_LABELS,
  STORE_LIST_STATUS_FILTER_OPTIONS,
  type StoreBrandEnum,
  type StoreStatus,
} from '../_constants/constants';
import { prefectureLabel } from '../_constants/store-prefecture.constant';
import { useStoresFiltersContext } from '../_contexts/stores-filters-context';
import { STORE_SEARCH_MAX_LENGTH } from '../_hooks/use-stores-filters';

interface StoresFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
}

/** FR-015: a filter that is off its default highlights its own control */
const ACTIVE_FILTER_CLASS = 'border-primary bg-primary/10 text-foreground';

/** nuqs keeps "no filter" as `null`; Base UI Select needs a concrete value for its "all" option */
const ALL = 'all';

/**
 * FR-013: 直営 is a filter value of its own, not an FC company — `fcCompanyId=direct` is the
 * literal the list endpoint understands. Pinned first so it is reachable without scrolling.
 */
const DIRECT_MANAGEMENT_OPTIONS = [{ id: DIRECT_MANAGEMENT_COMPANY_ID, label: '直営' }];

/**
 * FR-013: the options are the FC companies still in service whose type is FC.
 * BE gap: no facet endpoint (research R11) — the "only companies operating ≥1 store in the
 * permitted set" rule is not applied, so a pick can still return zero rows.
 */
const ACTIVE_FRANCHISE_FC_COMPANIES = { isActive: true, managementType: 'franchise' } as const;

/** `GET /admin/fc-companies` answers 403 to every other role (research R11) */
const FC_COMPANY_READER_ROLES = [UserRole.System, UserRole.Headquarter] as const;

export function StoresFilters({ isFilterOpen, onFilterOpenChange }: StoresFiltersProps) {
  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    activeFilterCount,
    prefectureOptions,
    allLabels,
  } = useStoresFiltersContext();
  const { hasRole } = useAuthUser();
  // Hidden rather than disabled: mounting it for Manager/Staff would only earn a 403 toast
  const canFilterByCompany = hasRole(FC_COMPANY_READER_ROLES);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-[400px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          {/* TODO(round3) B1 — FR-010 also matches the territory name; the placeholder goes back to
              店舗名・店舗コード・テリトリー名で検索... once the list carries a territory */}
          <Input
            placeholder="店舗名・店舗コードで検索..."
            value={searchInput}
            maxLength={STORE_SEARCH_MAX_LENGTH}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-8 rounded-lg pl-9 text-xs"
          />
        </div>
        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="ml-auto h-8 gap-1.5"
          onClick={() => onFilterOpenChange(!isFilterOpen)}
        >
          <SlidersHorizontal className="size-4" />
          {isFilterOpen ? '閉じる' : '詳細フィルター'}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
          {isFilterOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {isFilterOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.brand ?? ALL}
            onValueChange={(value) =>
              updateFilter({ brand: value === ALL ? null : (value as StoreBrandEnum) })
            }
          >
            <SelectTrigger
              size="sm"
              className={cn('w-fit min-w-[160px] rounded-lg', filters.brand && ACTIVE_FILTER_CLASS)}
            >
              <SelectValue>
                {filters.brand ? STORE_BRAND_LABELS[filters.brand] : allLabels.brand}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{allLabels.brand}</SelectItem>
              {STORE_BRAND_FILTER_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {STORE_BRAND_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* FR-012: the value on the wire is the JIS code, the operator only ever sees the name (D4) */}
          <Select
            value={filters.prefecture ?? ALL}
            onValueChange={(value) => updateFilter({ prefecture: value === ALL ? null : value })}
          >
            <SelectTrigger
              size="sm"
              className={cn('w-[150px] rounded-lg', filters.prefecture && ACTIVE_FILTER_CLASS)}
            >
              <SelectValue>
                {filters.prefecture ? prefectureLabel(filters.prefecture) : allLabels.prefecture}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{allLabels.prefecture}</SelectItem>
              {prefectureOptions.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* FR-013: Y-02 FR-001 operating company — an FC company id, or the `direct` literal.
              全運営企業 (the clear row) and 直営 stay pinned above the catalog. */}
          {canFilterByCompany && (
            <FcCompanySelectInput
              value={filters.company}
              onChange={(company) => updateFilter({ company: company?.id ?? null })}
              placeholder={allLabels.company}
              clearLabel={allLabels.company}
              pinnedOptions={DIRECT_MANAGEMENT_OPTIONS}
              queryFilters={ACTIVE_FRANCHISE_FC_COMPANIES}
              triggerClassName={cn(
                'w-fit max-w-[240px] min-w-[160px] rounded-lg',
                filters.company && ACTIVE_FILTER_CLASS,
              )}
              // The popup is content-sized rather than pinned to the 160px trigger, and the
              // option labels wrap so a long company name stays readable
              contentClassName="w-[24rem] max-w-[calc(100vw-2rem)] [&_.truncate]:[overflow-wrap:anywhere] [&_.truncate]:whitespace-normal"
            />
          )}

          {/*
            TODO(round3) B1 — FR-014 エリア → テリトリー cascade, Phase 2 (Y-15 組織階層管理 is
            Phase 2 on the client's CRM Category board). Commented out rather than deleted:
            Round 3 re-enables both selects, restores `selectArea` / `area_id` / `territory_id` in
            `use-stores-filters.ts`, and sends `areaId` / `territoryId` once `GET /admin/stores`
            accepts them.

          <AreaSelectInput
            value={filters.area_id}
            onChange={selectArea}
            allLabel={allLabels.area}
            triggerClassName={cn(filters.area_id && ACTIVE_FILTER_CLASS)}
          />
          <TerritorySelectInput
            areaId={filters.area_id}
            value={filters.territory_id}
            onChange={(territoryId) => updateFilter({ territory_id: territoryId })}
            allLabel={allLabels.territory}
            triggerClassName={cn(filters.territory_id && ACTIVE_FILTER_CLASS)}
          />
          */}

          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              updateFilter({ status: value === ALL ? null : (value as StoreStatus) })
            }
          >
            <SelectTrigger
              size="sm"
              className={cn('w-[150px] rounded-lg', filters.status && ACTIVE_FILTER_CLASS)}
            >
              <SelectValue>
                {STORE_LIST_STATUS_FILTER_OPTIONS.find((option) => option.value === filters.status)
                  ?.label ?? allLabels.status}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{allLabels.status}</SelectItem>
              {STORE_LIST_STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
