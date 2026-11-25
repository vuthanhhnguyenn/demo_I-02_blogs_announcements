'use client';

import { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

import {
  adminPlanControllerDetailOptions,
  adminPlanControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { PlanListResponseDto } from '@/lib/api-real/types.gen';

import { CAMPAIGN_SEARCH_PAGE_LIMIT } from '../_constants/constants';
import type { CampaignFormValues } from '../_schemas/campaign-form.schema';
import { CampaignFieldLabel } from './campaign-required-label';

export function CampaignFormMainContract() {
  const form = useFormContext<CampaignFormValues>();
  const planId = useWatch({ control: form.control, name: 'planId' });
  const brandEnum = useWatch({ control: form.control, name: 'brandEnum' });
  const [planSearch, setPlanSearch] = useState('');
  const {
    data: plansData,
    isFetching: isPlansFetching,
    fetchNextPage: fetchNextPlans,
    hasNextPage: hasMorePlans,
    isFetchingNextPage: isFetchingMorePlans,
    isError: isPlansError,
    refetch: refetchPlans,
  } = useInfiniteQuery({
    // API-088 rejects a plan of another brand (422 E-CMP-004), so only same-brand plans are offered.
    ...adminPlanControllerListInfiniteOptions({
      query: {
        limit: CAMPAIGN_SEARCH_PAGE_LIMIT,
        brandEnum,
        nameQuery: planSearch || undefined,
      },
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PlanListResponseDto, allPages) => {
      const currentPage = allPages.length;
      const totalPages = lastPage.pagination?.totalPages ?? 0;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });
  const plans = useMemo(
    () => plansData?.pages.flatMap((page) => page.items ?? []) ?? [],
    [plansData],
  );

  // 初回取得範囲（CAMPAIGN_SEARCH_PAGE_LIMIT件）に選択済みの主契約が含まれない場合、
  // 個別取得して名前を解決する（一覧を絞り込んで再現: /campaigns/{id}/edit で発生）。
  const selectedPlanFromOptions = useMemo(
    () => plans.find((plan) => plan.planId === planId),
    [plans, planId],
  );
  const { data: selectedPlanRes } = useQuery({
    ...adminPlanControllerDetailOptions({ path: { planId: planId || '' } }),
    enabled: !!planId && !selectedPlanFromOptions,
  });
  const selectedPlanLabel = selectedPlanFromOptions?.name ?? selectedPlanRes?.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">適用主契約</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <FormField
          control={form.control}
          name="planId"
          render={({ field }) => (
            <FormItem>
              <CampaignFieldLabel required>割引適用先の主契約（1件）</CampaignFieldLabel>
              <FormDescription>
                割引を適用する主契約を1件選択してください。キャンペーンを選択すると、この主契約が自動的に決まります。
              </FormDescription>
              <FormControl>
                <SearchableSelect
                  value={field.value || null}
                  valueLabel={selectedPlanLabel}
                  options={plans}
                  placeholder="主契約を選択"
                  // API-085 `nameQuery` matches the plan name only, so the box does not offer an ID
                  // search it cannot do (CRM UT G-03 No16)
                  searchPlaceholder="主契約名で検索..."
                  emptyMessage={
                    isPlansError ? '主契約の取得に失敗しました' : '該当する主契約がありません'
                  }
                  loadingMessage="検索中..."
                  isLoading={isPlansFetching && !isFetchingMorePlans}
                  hasMore={hasMorePlans && !isPlansError}
                  isLoadingMore={isFetchingMorePlans}
                  onLoadMore={fetchNextPlans}
                  loadingMoreMessage="読み込み中..."
                  onSearchChange={setPlanSearch}
                  onSelect={(plan) => field.onChange(plan?.planId ?? '')}
                  getOptionKey={(plan) => plan.planId}
                  getOptionLabel={(plan) => plan.name}
                  triggerClassName="h-9 w-full"
                />
              </FormControl>
              {isPlansError && (
                <p role="alert" className="text-destructive flex items-center gap-2 text-xs">
                  主契約の取得に失敗しました。
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => void refetchPlans()}
                  >
                    再試行する
                  </Button>
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
