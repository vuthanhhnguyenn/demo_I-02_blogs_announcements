'use client';

import { REAL_MEMBER_TYPE_LABELS } from '@/app/(private)/members/_constants/constants';
import { format, parse } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { StoreSelectInput, useStoreLabel } from '@/components/common/data-select-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  SURVEY_FILTER_CATEGORIES,
  SURVEY_RESPONSE_CATEGORY_LABELS,
  type SurveyFilterCategory,
} from '../../_constants/constants';
import {
  SURVEY_BRAND_GROUPS,
  SURVEY_BRAND_GROUP_BY_URL_VALUE,
  SURVEY_BRAND_GROUP_LABELS,
  SURVEY_BRAND_GROUP_URL_VALUE_BY_GROUP,
  type SurveyBrandGroup,
} from '../../_constants/survey-brand-group';
import { useSurveyResponsesFiltersContext } from '../_contexts/survey-responses-filters-context';
import {
  SURVEY_RESPONSES_SEARCH_MAX_LENGTH,
  type SurveyResponseMemberType,
} from '../_hooks/use-survey-responses-filters';

function filterActiveClass(active: boolean) {
  return active ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface SurveyResponsesFiltersProps {
  isFilterOpen: boolean;
  activeFilterCount: number;
  onFilterOpenChange: (open: boolean) => void;
}

export function SurveyResponsesFilters({
  isFilterOpen,
  onFilterOpenChange,
  activeFilterCount,
}: Readonly<SurveyResponsesFiltersProps>) {
  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    lockedStoreId,
    canFilterByMemberAttributes,
  } = useSurveyResponsesFiltersContext();

  // A header store other than 全店舗 hides the in-page 店舗 filter (entry-exit rule).
  const isStoreLocked = lockedStoreId.length > 0;
  const { label: selectedStoreName } = useStoreLabel(filters.store_id || null, {
    enabled: !isStoreLocked,
  });

  const periodFromDate = filters.period_from
    ? parse(filters.period_from, 'yyyy/MM/dd', new Date(), { locale: ja })
    : undefined;
  const periodToDate = filters.period_to
    ? parse(filters.period_to, 'yyyy/MM/dd', new Date(), { locale: ja })
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-[400px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="アンケート名で検索..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            maxLength={SURVEY_RESPONSES_SEARCH_MAX_LENGTH}
            className="h-8 rounded-lg pl-9"
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
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <DatePicker
              date={periodFromDate}
              onDateChange={(date) => {
                updateFilter('period_from', date ? format(date, 'yyyy/MM/dd', { locale: ja }) : '');
              }}
              disabledDate={periodToDate ? (date) => date > periodToDate : undefined}
              placeholder="開始日"
              className={filterActiveClass(filters.period_from.length > 0)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <DatePicker
              date={periodToDate}
              onDateChange={(date) => {
                updateFilter('period_to', date ? format(date, 'yyyy/MM/dd', { locale: ja }) : '');
              }}
              disabledDate={periodFromDate ? (date) => date < periodFromDate : undefined}
              placeholder="終了日"
              className={filterActiveClass(filters.period_to.length > 0)}
            />
          </div>

          {canFilterByMemberAttributes && (
            <Select
              value={filters.brand ? SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand] : 'all'}
              onValueChange={(value) => {
                updateFilter(
                  'brand',
                  value && value !== 'all'
                    ? SURVEY_BRAND_GROUP_URL_VALUE_BY_GROUP[value as SurveyBrandGroup]
                    : null,
                );
              }}
            >
              <SelectTrigger
                className={`h-8 min-w-[140px] rounded-lg text-xs ${filterActiveClass(filters.brand !== null)}`}
              >
                <SelectValue placeholder="全ブランド">
                  {filters.brand
                    ? SURVEY_BRAND_GROUP_LABELS[SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand]]
                    : '全ブランド'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ブランド</SelectItem>
                {SURVEY_BRAND_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {SURVEY_BRAND_GROUP_LABELS[group]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* A header store other than 全店舗 already scopes the list: no in-page 店舗 filter (entry-exit rule). */}
          {!isStoreLocked && (
            <StoreSelectInput
              value={filters.store_id || null}
              valueLabel={selectedStoreName}
              onChange={(store) => updateFilter('store_id', store?.id ?? '')}
              enabled={isFilterOpen}
              triggerClassName={`h-8 w-[200px] rounded-lg text-xs ${filterActiveClass(filters.store_id.length > 0)}`}
            />
          )}

          {canFilterByMemberAttributes && (
            <Select
              value={filters.member_type ?? 'all'}
              onValueChange={(value) => {
                updateFilter(
                  'member_type',
                  value && value !== 'all' ? (value as SurveyResponseMemberType) : null,
                );
              }}
            >
              <SelectTrigger
                className={`h-8 min-w-[160px] rounded-lg text-xs ${filterActiveClass(filters.member_type !== null)}`}
              >
                <SelectValue placeholder="全区分">
                  {filters.member_type ? REAL_MEMBER_TYPE_LABELS[filters.member_type] : '全区分'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全区分</SelectItem>
                {Object.entries(REAL_MEMBER_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={filters.template_type ?? 'all'}
            onValueChange={(value) => {
              updateFilter(
                'template_type',
                value && value !== 'all' ? (value as SurveyFilterCategory) : null,
              );
            }}
          >
            <SelectTrigger
              className={`h-8 min-w-[150px] rounded-lg text-xs ${filterActiveClass(filters.template_type !== null)}`}
            >
              <SelectValue placeholder="すべての種別">
                {filters.template_type
                  ? SURVEY_RESPONSE_CATEGORY_LABELS[filters.template_type]
                  : 'すべての種別'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての種別</SelectItem>
              {SURVEY_FILTER_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {SURVEY_RESPONSE_CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
