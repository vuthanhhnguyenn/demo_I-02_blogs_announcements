'use client';

import { REAL_MEMBER_TYPE_LABELS } from '@/app/(private)/members/_constants/constants';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

import { StoreSelectInput, useStoreLabel } from '@/components/common/data-select-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import {
  SURVEY_BRAND_GROUPS,
  SURVEY_BRAND_GROUP_BY_URL_VALUE,
  SURVEY_BRAND_GROUP_LABELS,
  SURVEY_BRAND_GROUP_URL_VALUE_BY_GROUP,
  type SurveyBrandGroup,
} from '../../_constants/survey-brand-group';
import { useSurveyAnalyticsFiltersContext } from '../_contexts/survey-analytics-filters-context';
import {
  SURVEY_ANALYTICS_PERIOD_LABELS,
  type SurveyAnalyticsMemberType,
  type SurveyAnalyticsPeriod,
} from '../_hooks/use-survey-analytics-filters';
import {
  SURVEY_ANALYTICS_GENDER_LABELS,
  SURVEY_ANALYTICS_TENURE_LABELS,
  type SurveyAnalyticsGender,
  type SurveyAnalyticsTenure,
} from '../_utils/survey-analytics-tenure.util';
import { SurveyAnalyticsSurveySelect } from './survey-analytics-survey-select';

interface SurveyAnalyticsFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  surveyId: string;
  surveyName?: string;
  totalResponses?: number;
}

function filterActiveClass(value: string, defaultValue: string) {
  return value !== defaultValue ? 'border-primary bg-primary/10 text-foreground' : '';
}

export function SurveyAnalyticsFilters({
  isFilterOpen,
  onFilterOpenChange,
  surveyId,
  surveyName,
  totalResponses,
}: Readonly<SurveyAnalyticsFiltersProps>) {
  const { filters, updateFilter, clearFilters, lockedStoreId } = useSurveyAnalyticsFiltersContext();

  // A header store other than 全店舗 locks the in-page 店舗 select to that store; the locked
  // store is not a user-chosen filter, so it stays out of the badge and the summary line.
  const isStoreLocked = lockedStoreId.length > 0;
  const shownStoreId = isStoreLocked ? lockedStoreId : filters.store_id;
  const { label: shownStoreName } = useStoreLabel(shownStoreId || null);
  const selectedStoreLabel = shownStoreName ?? '全店舗';
  const selectedPeriod = filters.period as SurveyAnalyticsPeriod;

  const activeFilterCount = [
    filters.period !== 'all',
    filters.brand !== null,
    filters.store_id.length > 0,
    filters.member_type !== null,
    filters.tenure !== 'all',
    filters.gender !== null,
  ].filter(Boolean).length;

  const filterSummary = [
    filters.period !== 'all' ? SURVEY_ANALYTICS_PERIOD_LABELS[selectedPeriod] : '',
    filters.brand ? SURVEY_BRAND_GROUP_LABELS[SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand]] : '',
    filters.store_id ? selectedStoreLabel : '',
    filters.member_type ? REAL_MEMBER_TYPE_LABELS[filters.member_type] : '',
    filters.tenure !== 'all' ? SURVEY_ANALYTICS_TENURE_LABELS[filters.tenure] : '',
    filters.gender ? SURVEY_ANALYTICS_GENDER_LABELS[filters.gender] : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const filteredSummaryText = activeFilterCount > 0 ? `絞り込み中: ${filterSummary}` : '全件';

  const targetSummaryText = surveyName
    ? ` — 対象: ${surveyName}（${(totalResponses ?? 0).toLocaleString()}件）`
    : '';

  return (
    <Card className="mb-6 gap-0 py-0">
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <SurveyAnalyticsSurveySelect
            surveyId={surveyId}
            surveyName={surveyName}
            onChange={(id) => updateFilter('survey_id', id)}
          />
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="ml-auto h-8 gap-1 text-xs"
            onClick={() => onFilterOpenChange(!isFilterOpen)}
          >
            <SlidersHorizontal className="size-3" />
            {isFilterOpen ? '閉じる' : '詳細フィルター'}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
            {isFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>

        {isFilterOpen && (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.period}
              onValueChange={(value) => {
                updateFilter('period', value as SurveyAnalyticsPeriod);
              }}
            >
              <SelectTrigger
                className={`h-8 w-[120px] text-xs ${filterActiveClass(filters.period, 'all')}`}
              >
                <SelectValue>{SURVEY_ANALYTICS_PERIOD_LABELS[selectedPeriod]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SURVEY_ANALYTICS_PERIOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.brand ? SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand] : 'all'}
              onValueChange={(value) => {
                updateFilter(
                  'brand',
                  value === 'all'
                    ? null
                    : SURVEY_BRAND_GROUP_URL_VALUE_BY_GROUP[value as SurveyBrandGroup],
                );
              }}
            >
              <SelectTrigger
                className={`h-8 w-fit max-w-[240px] min-w-[140px] text-xs ${filterActiveClass(filters.brand ?? 'all', 'all')}`}
              >
                <SelectValue>
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

            <Tooltip>
              <TooltipTrigger
                disabled={!isStoreLocked}
                render={<span className={isStoreLocked ? 'cursor-not-allowed' : undefined} />}
              >
                <StoreSelectInput
                  value={shownStoreId || null}
                  valueLabel={shownStoreName}
                  disabled={isStoreLocked}
                  onChange={(store) => updateFilter('store_id', store?.id ?? '')}
                  enabled={isFilterOpen}
                  triggerClassName={`h-8 w-[200px] text-xs ${isStoreLocked ? '' : filterActiveClass(filters.store_id || 'all', 'all')}`}
                />
              </TooltipTrigger>
              {isStoreLocked && (
                <TooltipContent>
                  ヘッダーで選択中の店舗に絞り込まれています。横断抽出にはヘッダーを「全店舗」に切替えてください。
                </TooltipContent>
              )}
            </Tooltip>

            <Select
              value={filters.member_type ?? 'all'}
              onValueChange={(value) => {
                updateFilter(
                  'member_type',
                  value === 'all' ? null : (value as SurveyAnalyticsMemberType),
                );
              }}
            >
              <SelectTrigger
                className={`h-8 w-fit max-w-[240px] min-w-[140px] text-xs ${filterActiveClass(filters.member_type ?? 'all', 'all')}`}
              >
                <SelectValue>
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

            <Select
              value={filters.tenure}
              onValueChange={(value) => {
                updateFilter('tenure', value as SurveyAnalyticsTenure);
              }}
            >
              <SelectTrigger
                className={`h-8 w-fit max-w-[240px] min-w-[140px] text-xs ${filterActiveClass(filters.tenure, 'all')}`}
              >
                <SelectValue>{SURVEY_ANALYTICS_TENURE_LABELS[filters.tenure]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SURVEY_ANALYTICS_TENURE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.gender ?? 'all'}
              onValueChange={(value) => {
                updateFilter('gender', value === 'all' ? null : (value as SurveyAnalyticsGender));
              }}
            >
              <SelectTrigger
                className={`h-8 w-[110px] text-xs ${filterActiveClass(filters.gender ?? 'all', 'all')}`}
              >
                <SelectValue>
                  {filters.gender ? SURVEY_ANALYTICS_GENDER_LABELS[filters.gender] : '全性別'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全性別</SelectItem>
                {Object.entries(SURVEY_ANALYTICS_GENDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground ml-auto h-8 text-xs"
              onClick={clearFilters}
            >
              すべてクリア
            </Button>
          </div>
        )}
      </div>

      <div className="text-muted-foreground border-t px-4 py-2 text-xs wrap-anywhere">
        {filteredSummaryText}
        {targetSummaryText}
      </div>
    </Card>
  );
}
