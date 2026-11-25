'use client';

import { useMemo, useRef } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';

import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';
import { getNextPageFromPagination } from '@/hooks/use-load-all-pages.hook';

import { badgeVariants } from '@/components/ui/badge';

import { adminExerciseRefMasterControllerListMusclesInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { EXERCISE_SECONDARY_MUSCLE_PAGE_SIZE } from '../_constants/constants';

type ExerciseSecondaryMuscleChipsProps = {
  /** Currently picked 協働筋 ids. */
  selectedIds: readonly string[];
  /** The 主働筋 — a muscle cannot be both, so it is never offered here. */
  excludeId: string | undefined;
  onToggle: (muscleId: string, selected: boolean) => void;
};

/**
 * 協働筋 chip picker. The muscle master has no upper bound, so the chips sit in a fixed-height
 * scroll area and further pages are fetched as it scrolls instead of rendering every row at once.
 */
export function ExerciseSecondaryMuscleChips({
  selectedIds,
  excludeId,
  onToggle,
}: Readonly<ExerciseSecondaryMuscleChipsProps>) {
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const muscleQuery = useInfiniteQuery({
    ...adminExerciseRefMasterControllerListMusclesInfiniteOptions({
      query: {
        limit: EXERCISE_SECONDARY_MUSCLE_PAGE_SIZE,
        isActive: true,
        sort: 'sortOrder',
        order: 'asc',
      },
    }),
    initialPageParam: 1,
    getNextPageParam: getNextPageFromPagination,
  });

  const muscles = useMemo(
    () =>
      (muscleQuery.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (muscle) => muscle.id !== excludeId,
      ),
    [muscleQuery.data, excludeId],
  );

  const sentinelRef = useInfiniteScroll({
    hasMore: muscleQuery.hasNextPage,
    // A failed page must not be re-requested in a loop while the sentinel stays visible.
    isLoading: muscleQuery.isFetchingNextPage || muscleQuery.isFetchNextPageError,
    onLoadMore: () => void muscleQuery.fetchNextPage(),
    rootRef: scrollRootRef,
  });

  if (muscleQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
        <Loader2 className="size-3 animate-spin" />
        読み込み中...
      </div>
    );
  }

  return (
    <div ref={scrollRootRef} className="max-h-40 min-w-0 overflow-y-auto">
      <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="協働筋">
        {muscles.map((muscle) => {
          const selected = selectedIds.includes(muscle.id);
          return (
            <button
              key={muscle.id}
              type="button"
              aria-pressed={selected}
              title={muscle.name}
              className={cn(
                badgeVariants({ variant: selected ? 'default' : 'outline' }),
                'focus-visible:ring-ring/50 max-w-full cursor-pointer text-xs font-normal select-none focus-visible:ring-[3px]',
              )}
              onClick={() => onToggle(muscle.id, selected)}
            >
              {selected ? <Check className="size-3 shrink-0" /> : null}
              <span className="truncate">{muscle.name}</span>
            </button>
          );
        })}
      </div>
      {muscleQuery.hasNextPage ? (
        <div
          ref={sentinelRef}
          className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
        >
          {muscleQuery.isFetchingNextPage ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              読み込み中...
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
