'use client';

import { useState } from 'react';

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
  DEFAULT_LESSON_STATUS_FILTER,
  LESSON_STATUS_LABELS,
  type LessonStatusFilter,
} from '../_constants/constants';
import type { UseLessonsFiltersReturn } from '../_hooks/use-lessons-filters';
import {
  type ApiFeeType,
  type ApiLessonBrand,
  FEE_TYPE_LABELS,
  LESSON_BRAND_LABELS,
  LESSON_BRAND_OPTIONS,
} from '../_utils/lesson-api.util';

const ALL = 'all';

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

/** First element of a single-axis array filter, or the "all" sentinel. */
function singleValue(values: string[]): string {
  return values.length > 0 ? values[0] : ALL;
}

interface LessonsFilterBarProps {
  filtersHook: UseLessonsFiltersReturn;
  searchPlaceholder: string;
}

export function LessonsFilterBar({ filtersHook, searchPlaceholder }: LessonsFilterBarProps) {
  const { filters, setFilters, searchInput, setSearchInput, hasActiveFilters, clearFilters } =
    filtersHook;
  const [expanded, setExpanded] = useState(false);

  // Filters: brand / 料金種別 / status only — no 区分・カテゴリ axis and no 削除済み toggle
  // (spec 007 Clarifications 2026-10-08). The default status (active only) is not counted.
  const isStatusFiltered = filters.status !== DEFAULT_LESSON_STATUS_FILTER;
  const activeFilterCount = [
    filters.brand.length > 0,
    filters.fee_type.length > 0,
    isStatusFiltered,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-[400px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9 text-xs"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <SlidersHorizontal className="size-4" />
            {expanded ? '閉じる' : '詳細フィルター'}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={singleValue(filters.brand)}
            onValueChange={(value) =>
              setFilters({ brand: value === ALL ? null : [value as ApiLessonBrand], page: 1 })
            }
          >
            <SelectTrigger
              className={`h-8 w-[130px] text-xs ${filterActiveClass(filters.brand.length > 0)}`}
            >
              <SelectValue placeholder="全ブランド">
                {filters.brand.length > 0 ? LESSON_BRAND_LABELS[filters.brand[0]] : '全ブランド'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全ブランド</SelectItem>
              {LESSON_BRAND_OPTIONS.map((brand) => (
                <SelectItem key={brand.value} value={brand.value}>
                  {brand.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={singleValue(filters.fee_type)}
            onValueChange={(value) =>
              setFilters({ fee_type: value === ALL ? null : [value as ApiFeeType], page: 1 })
            }
          >
            <SelectTrigger
              className={`h-8 w-[130px] text-xs ${filterActiveClass(filters.fee_type.length > 0)}`}
            >
              <SelectValue placeholder="全料金種別">
                {filters.fee_type.length > 0 ? FEE_TYPE_LABELS[filters.fee_type[0]] : '全料金種別'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全料金種別</SelectItem>
              {(Object.keys(FEE_TYPE_LABELS) as ApiFeeType[]).map((feeType) => (
                <SelectItem key={feeType} value={feeType}>
                  {FEE_TYPE_LABELS[feeType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 全ステータス is the explicit `all` value — an absent status means active only */}
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ status: value as LessonStatusFilter, page: 1 })}
          >
            <SelectTrigger
              className={`h-8 w-[120px] text-xs ${filterActiveClass(isStatusFiltered)}`}
            >
              <SelectValue placeholder="全ステータス">
                {filters.status === 'all' ? '全ステータス' : LESSON_STATUS_LABELS[filters.status]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全ステータス</SelectItem>
              <SelectItem value="active">{LESSON_STATUS_LABELS.active}</SelectItem>
              <SelectItem value="inactive">{LESSON_STATUS_LABELS.inactive}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground ml-auto h-8 text-xs"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            すべてクリア
          </Button>
        </div>
      )}
    </div>
  );
}
