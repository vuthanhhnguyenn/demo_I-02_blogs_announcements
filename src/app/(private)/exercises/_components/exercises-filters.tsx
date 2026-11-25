'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from 'lucide-react';

import { ExerciseRefMasterSelectInput } from '@/components/common/data-select-input';
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
  EXERCISE_LEVEL_OPTIONS,
  EXERCISE_STATUS_LABELS,
  EXERCISE_STATUS_OPTIONS,
} from '../_constants/constants';
import {
  EXERCISE_SEARCH_MAX_LENGTH,
  type useExercisesFilters,
} from '../_hooks/use-exercises-filters';

type FiltersHook = ReturnType<typeof useExercisesFilters>;

/** Sized like the plain filter selects next to it. */
const FILTER_TRIGGER_CLASS = 'h-9 w-fit min-w-[140px] max-w-[240px] text-sm';

/** Prototype `filterActiveClass` — a select holding a non-default value. */
function filterActiveClass(active: boolean) {
  return active ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface ExercisesFiltersProps {
  filtersHook: FiltersHook;
  isExpanded: boolean;
  onExpandedChange: (open: boolean) => void;
}

export function ExercisesFilters({
  filtersHook,
  isExpanded,
  onExpandedChange,
}: ExercisesFiltersProps) {
  const {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    searchInput,
    setSearchInput,
    isSearchTooLong,
  } = filtersHook;
  // While an IME composition is open the unconfirmed text stays local; only the confirmed
  // keyword reaches the debounced search (no request per romaji keystroke).
  const [composingValue, setComposingValue] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full min-w-0 flex-1 md:max-w-[400px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={composingValue ?? searchInput}
            aria-invalid={isSearchTooLong}
            onChange={(event) => {
              const nativeEvent = event.nativeEvent as InputEvent;
              if (nativeEvent.isComposing) {
                setComposingValue(event.target.value);
                return;
              }
              setComposingValue(null);
              setSearchInput(event.target.value);
            }}
            onCompositionStart={(event) => setComposingValue(event.currentTarget.value)}
            onCompositionEnd={(event) => {
              setComposingValue(null);
              setSearchInput(event.currentTarget.value);
            }}
            placeholder="エクササイズ名で検索"
            className="pl-9"
          />
          {isSearchTooLong && (
            <p role="alert" className="text-destructive mt-1 text-xs">
              検索キーワードは{EXERCISE_SEARCH_MAX_LENGTH}文字以内で入力してください
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <Button
            type="button"
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            onClick={() => onExpandedChange(!isExpanded)}
            className="gap-1"
            aria-expanded={isExpanded}
          >
            <SlidersHorizontal className="size-4" />
            {isExpanded ? '閉じる' : '詳細フィルター'}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters} className="gap-2">
              <X className="size-4" />
              クリア
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-wrap gap-2">
          <ExerciseRefMasterSelectInput
            kind="category"
            value={filters.categoryId}
            onChange={(option) => setFilters({ categoryId: option?.id ?? null, page: 1 })}
            placeholder="全てのカテゴリ"
            clearLabel="全てのカテゴリ"
            triggerClassName={cn(
              FILTER_TRIGGER_CLASS,
              filterActiveClass(filters.categoryId !== null),
            )}
          />

          <ExerciseRefMasterSelectInput
            kind="muscle"
            value={filters.primaryMuscleId}
            onChange={(option) => setFilters({ primaryMuscleId: option?.id ?? null, page: 1 })}
            placeholder="全ての主働筋"
            clearLabel="全ての主働筋"
            triggerClassName={cn(
              FILTER_TRIGGER_CLASS,
              filterActiveClass(filters.primaryMuscleId !== null),
            )}
          />

          <ExerciseRefMasterSelectInput
            kind="tool"
            value={filters.toolId}
            onChange={(option) => setFilters({ toolId: option?.id ?? null, page: 1 })}
            placeholder="全ての器具種別"
            clearLabel="全ての器具種別"
            triggerClassName={cn(FILTER_TRIGGER_CLASS, filterActiveClass(filters.toolId !== null))}
          />

          <Select
            value={filters.level ?? '__all__'}
            onValueChange={(value) =>
              setFilters({
                level: value === '__all__' ? null : (value as typeof filters.level),
                page: 1,
              })
            }
          >
            <SelectTrigger
              className={cn(
                'w-fit max-w-[240px] min-w-[140px] rounded-lg',
                filterActiveClass(filters.level !== null),
              )}
            >
              <SelectValue>
                {filters.level
                  ? (EXERCISE_LEVEL_OPTIONS.find((item) => item.value === filters.level)?.label ??
                    '全てのレベル')
                  : '全てのレベル'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全てのレベル</SelectItem>
              {EXERCISE_LEVEL_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.publishStatus ?? '__all__'}
            onValueChange={(value) =>
              setFilters({
                publishStatus: value === '__all__' ? null : (value as typeof filters.publishStatus),
                page: 1,
              })
            }
          >
            <SelectTrigger
              className={cn(
                'w-fit max-w-[240px] min-w-[140px] rounded-lg',
                filterActiveClass(filters.publishStatus !== null),
              )}
            >
              <SelectValue>
                {filters.publishStatus
                  ? EXERCISE_STATUS_LABELS[
                      filters.publishStatus as keyof typeof EXERCISE_STATUS_LABELS
                    ]
                  : '全てのステータス'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全てのステータス</SelectItem>
              {EXERCISE_STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {EXERCISE_STATUS_LABELS[item.value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
