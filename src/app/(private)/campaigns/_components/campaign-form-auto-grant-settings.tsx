'use client';

import { useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';

import { adminOptionControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionListResponseDto } from '@/lib/api-real/types.gen';

import {
  CAMPAIGN_SEARCH_PAGE_LIMIT,
  CAMPAIGN_TARGET_SEX_LABELS,
  type CampaignTargetSex,
} from '../_constants/constants';
import type { CampaignFormValues } from '../_schemas/campaign-form.schema';
import { CampaignPickerError } from './campaign-picker-error';
import { CampaignFieldLabel } from './campaign-required-label';

const AUTO_GRANT_TARGET_LABELS: Record<'all' | 'conditional', string> = {
  all: '全員',
  conditional: '条件あり',
};

export function CampaignFormAutoGrantSettings() {
  const form = useFormContext<CampaignFormValues>();
  const brandEnum = useWatch({ control: form.control, name: 'brandEnum' });
  const [optionSearch, setOptionSearch] = useState('');
  const debouncedOptionSearch = useDebounce(optionSearch, 300);
  const {
    data: optionsData,
    fetchNextPage: fetchNextOptions,
    hasNextPage: hasMoreOptions,
    isFetchingNextPage: isFetchingMoreOptions,
    isError: isOptionsError,
    refetch: refetchOptions,
  } = useInfiniteQuery({
    ...adminOptionControllerListInfiniteOptions({
      query: {
        limit: CAMPAIGN_SEARCH_PAGE_LIMIT,
        brandEnum,
        isActive: true,
        keyword: debouncedOptionSearch.trim() || undefined,
      },
    }),
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    getNextPageParam: (lastPage: OptionListResponseDto, allPages) => {
      const currentPage = allPages.length;
      const totalPages = lastPage.pagination?.totalPages ?? 0;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });
  const options = useMemo(
    () => optionsData?.pages.flatMap((page) => page.items ?? []) ?? [],
    [optionsData],
  );

  const grantGridRef = useRef<HTMLDivElement | null>(null);
  const grantSentinelRef = useInfiniteScroll({
    hasMore: (hasMoreOptions ?? false) && !isOptionsError,
    isLoading: isFetchingMoreOptions,
    onLoadMore: fetchNextOptions,
    rootRef: grantGridRef,
  });

  const optionNames = useWatch({ control: form.control, name: 'optionNames' });
  const selectedOptionIds = useWatch({ control: form.control, name: 'autoGrantOptionIds' });
  // Saved options outside the loaded page (paginated, active-only) would otherwise vanish from the grid.
  const unlistedSelectedOptions = useMemo(() => {
    if (debouncedOptionSearch.trim()) return [];
    const listedIds = new Set(options.map((option) => option.id));
    // The saved ids stay pinned after being unchecked so they can be checked again (same brand only).
    const defaults = form.formState.defaultValues;
    const savedIds = defaults?.brandEnum === brandEnum ? (defaults?.autoGrantOptionIds ?? []) : [];
    return [...new Set([...savedIds, ...selectedOptionIds])]
      .filter((id): id is string => !!id && !listedIds.has(id))
      .map((id) => ({ id, name: optionNames[id] ?? id }));
  }, [
    brandEnum,
    debouncedOptionSearch,
    form.formState.defaultValues,
    optionNames,
    options,
    selectedOptionIds,
  ]);
  const gridOptions = [...unlistedSelectedOptions, ...options];

  const autoGrantEnabled = useWatch({ control: form.control, name: 'autoGrantEnabled' });
  const autoGrantTarget = useWatch({ control: form.control, name: 'autoGrantTarget' });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">自動付与設定</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="autoGrantEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="auto-grant-switch" className="text-sm">
                      自動付与する
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      条件を満たした会員にオプションを自動で付与します
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      id="auto-grant-switch"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {autoGrantEnabled && (
            <>
              <Separator />

              <FormField
                control={form.control}
                name="autoGrantTarget"
                render={({ field }) => (
                  <FormItem>
                    <CampaignFieldLabel>付与対象</CampaignFieldLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-row gap-6"
                      >
                        {Object.entries(AUTO_GRANT_TARGET_LABELS).map(([value, label]) => (
                          <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem value={value} id={`target-${value}`} />
                            <Label
                              htmlFor={`target-${value}`}
                              className="cursor-pointer text-sm font-normal"
                            >
                              {label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {autoGrantTarget === 'conditional' && (
                <FormField
                  control={form.control}
                  name="autoGrantSexes"
                  render={({ field }) => (
                    <FormItem>
                      <CampaignFieldLabel>性別条件</CampaignFieldLabel>
                      <div className="flex gap-6">
                        {Object.entries(CAMPAIGN_TARGET_SEX_LABELS).map(([value, label]) => (
                          <div key={value} className="flex items-center gap-2">
                            <Checkbox
                              id={`gender-${value}`}
                              checked={field.value.includes(value as CampaignTargetSex)}
                              onCheckedChange={(checked) => {
                                field.onChange(
                                  checked
                                    ? [...field.value, value as CampaignTargetSex]
                                    : field.value.filter((sex) => sex !== value),
                                );
                              }}
                            />
                            <Label
                              htmlFor={`gender-${value}`}
                              className="cursor-pointer text-sm font-normal"
                            >
                              {label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="autoGrantOptionIds"
                render={({ field }) => (
                  <FormItem>
                    <CampaignFieldLabel>自動付与オプション</CampaignFieldLabel>
                    <Input
                      value={optionSearch}
                      onChange={(event) => setOptionSearch(event.target.value)}
                      placeholder="オプション名で検索..."
                      className="h-9"
                    />
                    <div
                      ref={grantGridRef}
                      className="grid max-h-56 grid-cols-3 gap-3 overflow-auto"
                    >
                      {gridOptions.length === 0 && !isOptionsError && (
                        <p className="text-muted-foreground col-span-3 text-sm">
                          該当するオプションがありません
                        </p>
                      )}
                      {gridOptions.map((option) => (
                        <div key={option.id} className="flex min-w-0 items-start gap-2">
                          <Checkbox
                            className="mt-0.5"
                            id={`grant-opt-${option.id}`}
                            checked={field.value.includes(option.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                form.setValue('optionNames', {
                                  ...form.getValues('optionNames'),
                                  [option.id]: option.name,
                                });
                              }
                              field.onChange(
                                checked
                                  ? [...field.value, option.id]
                                  : field.value.filter((id) => id !== option.id),
                              );
                            }}
                          />
                          <Label
                            htmlFor={`grant-opt-${option.id}`}
                            className="min-w-0 cursor-pointer text-sm leading-snug font-normal [overflow-wrap:anywhere]"
                          >
                            {option.name}
                          </Label>
                        </div>
                      ))}
                      {(hasMoreOptions || isFetchingMoreOptions) && (
                        <div
                          ref={grantSentinelRef}
                          className="col-span-3 flex items-center justify-center py-2"
                        >
                          {isFetchingMoreOptions && <Spinner className="size-4" />}
                        </div>
                      )}
                    </div>
                    {isOptionsError && (
                      <CampaignPickerError
                        message="オプションの取得に失敗しました。"
                        onRetry={() => void refetchOptions()}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
