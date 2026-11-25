'use client';

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

import { cn } from '@/lib/utils';

import {
  SURVEY_FILTER_CATEGORIES,
  SURVEY_REAL_STATUS_LABELS,
  SURVEY_RESPONSE_CATEGORY_LABELS,
  type SurveyFilterCategory,
  type SurveyRealStatus,
} from '../_constants/constants';
import {
  SURVEY_BRAND_GROUPS,
  SURVEY_BRAND_GROUP_BY_URL_VALUE,
  SURVEY_BRAND_GROUP_LABELS,
  SURVEY_BRAND_GROUP_URL_VALUE_BY_GROUP,
  type SurveyBrandGroup,
} from '../_constants/survey-brand-group';
import { useSurveysFiltersContext } from '../_contexts/surveys-filters-context';

/** `nameQuery` is capped at 100 characters by the API (a longer value is a 400). */
const SURVEY_SEARCH_MAX_LENGTH = 100;

// Prototype treatment for a non-default select (survey-list.tsx `filterActiveClass`).
const ACTIVE_FILTER_CLASS = 'border-primary bg-primary/10 text-foreground';

interface SurveysFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
}

export function SurveysFilters({ isFilterOpen, onFilterOpenChange }: SurveysFiltersProps) {
  const { filters, searchInput, setSearchInput, updateFilter } = useSurveysFiltersContext();

  const activeFilterCount = [
    filters.type !== null,
    filters.brand !== null,
    filters.status !== null,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-100 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="アンケート名で検索..."
            value={searchInput}
            maxLength={SURVEY_SEARCH_MAX_LENGTH}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-8 rounded-lg pl-9 text-xs"
          />
        </div>

        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="ml-auto h-8 gap-1.5 text-xs"
          onClick={() => onFilterOpenChange(!isFilterOpen)}
        >
          <SlidersHorizontal className="size-4" />
          {isFilterOpen ? '閉じる' : '詳細フィルター'}
          {activeFilterCount > 0 && (
            <Badge
              variant="outline"
              className="bg-card text-muted-foreground border-border ml-0.5 tabular-nums"
            >
              {activeFilterCount}
            </Badge>
          )}
          {isFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
      </div>

      {isFilterOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.type ?? 'all'}
            onValueChange={(value) =>
              updateFilter('type', value === 'all' ? null : (value as SurveyFilterCategory))
            }
          >
            <SelectTrigger
              size="sm"
              className={cn('w-[160px] rounded-lg', filters.type && ACTIVE_FILTER_CLASS)}
            >
              <SelectValue placeholder="すべての種別">
                {filters.type ? SURVEY_RESPONSE_CATEGORY_LABELS[filters.type] : 'すべての種別'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての種別</SelectItem>
              {SURVEY_FILTER_CATEGORIES.map((type) => (
                <SelectItem key={type} value={type}>
                  {SURVEY_RESPONSE_CATEGORY_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.brand ? SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand] : 'all'}
            onValueChange={(value) =>
              updateFilter(
                'brand',
                value === 'all'
                  ? null
                  : SURVEY_BRAND_GROUP_URL_VALUE_BY_GROUP[value as SurveyBrandGroup],
              )
            }
          >
            <SelectTrigger
              size="sm"
              className={cn('w-[160px] rounded-lg', filters.brand && ACTIVE_FILTER_CLASS)}
            >
              <SelectValue placeholder="すべてのブランド">
                {filters.brand
                  ? SURVEY_BRAND_GROUP_LABELS[SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand]]
                  : 'すべてのブランド'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのブランド</SelectItem>
              {SURVEY_BRAND_GROUPS.map((group) => (
                <SelectItem key={group} value={group}>
                  {SURVEY_BRAND_GROUP_LABELS[group]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status ?? 'all'}
            onValueChange={(value) =>
              updateFilter('status', value === 'all' ? null : (value as SurveyRealStatus))
            }
          >
            <SelectTrigger
              size="sm"
              className={cn('w-[140px] rounded-lg', filters.status && ACTIVE_FILTER_CLASS)}
            >
              <SelectValue placeholder="すべての状態">
                {filters.status ? SURVEY_REAL_STATUS_LABELS[filters.status] : 'すべての状態'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての状態</SelectItem>
              {(Object.keys(SURVEY_REAL_STATUS_LABELS) as SurveyRealStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {SURVEY_REAL_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
