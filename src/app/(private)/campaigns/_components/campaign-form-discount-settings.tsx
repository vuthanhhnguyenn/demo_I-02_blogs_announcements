'use client';

import { useMemo, useState } from 'react';
import { useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';

import { useInfiniteQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { adminOptionControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionListResponseDto } from '@/lib/api-real/types.gen';

import { CAMPAIGN_SEARCH_PAGE_LIMIT } from '../_constants/constants';
import {
  type CampaignFormValues,
  DISCOUNT_VALUE_PAIR_MESSAGES,
  EMPTY_DISCOUNT_ROW,
} from '../_schemas/campaign-form.schema';
import { CampaignPickerError } from './campaign-picker-error';

/** 割引行の対象種別。SelectTrigger のラベル表示にも使う。 */
const DISCOUNT_TARGET_LABELS: Record<string, string> = {
  plan: '主契約',
  option: 'オプション',
  entry_fee: '入会金',
};

const ROWS_NAME = 'discountRows';

function DiscountBlock() {
  const form = useFormContext<CampaignFormValues>();
  const [optionSearch, setOptionSearch] = useState('');
  const brandEnum = useWatch({ control: form.control, name: 'brandEnum' });
  const {
    data: optionsData,
    isFetching: isOptionsFetching,
    fetchNextPage: fetchNextOptions,
    hasNextPage: hasMoreOptions,
    isFetchingNextPage: isFetchingMoreOptions,
    isError: isOptionsError,
    refetch: refetchOptions,
  } = useInfiniteQuery({
    // API-088 only accepts active options of the campaign's brand (400 E-VAL-001 otherwise).
    ...adminOptionControllerListInfiniteOptions({
      query: {
        limit: CAMPAIGN_SEARCH_PAGE_LIMIT,
        brandEnum,
        isActive: true,
        keyword: optionSearch || undefined,
      },
    }),
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
  const enabled = useWatch({ control: form.control, name: 'discountEnabled' });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: ROWS_NAME,
  });
  const rows = useWatch({ control: form.control, name: ROWS_NAME });
  const optionNames = useWatch({ control: form.control, name: 'optionNames' });
  const { errors } = useFormState({ control: form.control, name: ROWS_NAME });
  const hasPairError = (index: number) => {
    const message = errors.discountRows?.[index]?.amount?.message;
    return message !== undefined && DISCOUNT_VALUE_PAIR_MESSAGES.includes(message);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Label htmlFor="discount-enabled" className="text-sm font-semibold">
            割引を設定する
          </Label>
          <p className="text-muted-foreground text-xs">対象ごとに割引を1つ設定します</p>
        </div>
        <FormField
          control={form.control}
          name="discountEnabled"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Switch
                  id="discount-enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {enabled && (
        <div className="border-muted flex flex-col gap-3 border-l-2 pl-4">
          {fields.map((fieldItem, index) => (
            <div
              key={fieldItem.id}
              className="grid grid-cols-[120px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2"
            >
              <FormField
                control={form.control}
                name={`${ROWS_NAME}.${index}.target`}
                render={({ field }) => (
                  <FormItem>
                    {index === 0 && <Label className="text-sm">対象</Label>}
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // 対象種別を切り替えたら、別マスタのオプション選択が残らないようクリアする
                        if (value !== 'option') {
                          form.setValue(`${ROWS_NAME}.${index}.optionId`, '');
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          {/* base-ui の Select.Value は既定で「値」を描画するためラベルを明示する。 */}
                          <SelectValue placeholder="対象を選択">
                            {DISCOUNT_TARGET_LABELS[field.value] ?? undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DISCOUNT_TARGET_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${ROWS_NAME}.${index}.optionId`}
                render={({ field }) => (
                  <FormItem>
                    {index === 0 && (
                      <Label className="text-sm">
                        {rows?.[index]?.target === 'entry_fee' ? '対象名' : 'オプション名'}
                      </Label>
                    )}
                    <FormControl>
                      {rows?.[index]?.target === 'entry_fee' ? (
                        <Input value="入会金" readOnly disabled />
                      ) : (
                        <SearchableSelect
                          value={field.value || null}
                          options={options}
                          placeholder="—"
                          searchPlaceholder="オプション名で検索..."
                          emptyMessage="該当するオプションがありません"
                          loadingMessage="読み込み中..."
                          isLoading={isOptionsFetching && !isFetchingMoreOptions}
                          hasMore={hasMoreOptions && !isOptionsError}
                          isLoadingMore={isFetchingMoreOptions}
                          onLoadMore={fetchNextOptions}
                          loadingMoreMessage="読み込み中..."
                          onSearchChange={setOptionSearch}
                          valueLabel={
                            field.value
                              ? (options.find((option) => option.id === field.value)?.name ??
                                optionNames[field.value])
                              : undefined
                          }
                          onSelect={(option) => {
                            if (option) {
                              form.setValue('optionNames', {
                                ...form.getValues('optionNames'),
                                [option.id]: option.name,
                              });
                            }
                            field.onChange(option?.id ?? '');
                          }}
                          getOptionKey={(option) => option.id}
                          getOptionLabel={(option) => option.name}
                          disabled={rows?.[index]?.target !== 'option'}
                          triggerClassName="h-9 w-full"
                          contentClassName="w-auto max-w-[min(480px,90vw)] min-w-(--anchor-width)"
                        />
                      )}
                    </FormControl>
                    {isOptionsError && rows?.[index]?.target === 'option' && (
                      <CampaignPickerError
                        message="オプションの取得に失敗しました。"
                        onRetry={() => void refetchOptions()}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${ROWS_NAME}.${index}.amount`}
                render={({ field }) => (
                  <FormItem>
                    {index === 0 && <Label className="text-sm">割引額（円）</Label>}
                    <div className="flex items-center gap-1">
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          min={0}
                          placeholder="例: 3000"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-muted-foreground shrink-0 text-sm">円</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${ROWS_NAME}.${index}.rate`}
                // The amount/rate cross-field errors are bound to `amount`, so re-validate it on rate changes
                rules={{ deps: `${ROWS_NAME}.${index}.amount` }}
                render={({ field, fieldState }) => (
                  <FormItem>
                    {index === 0 && <Label className="text-sm">割引率（%）</Label>}
                    <div className="flex items-center gap-1">
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          min={0}
                          max={100}
                          placeholder="例: 50"
                          {...field}
                          aria-invalid={!!fieldState.error || hasPairError(index)}
                        />
                      </FormControl>
                      <span className="text-muted-foreground shrink-0 text-sm">%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className={`flex h-9 items-center ${index === 0 ? 'mt-7' : ''}`}>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive size-8 p-0"
                    onClick={() => remove(index)}
                    aria-label="割引対象を削除"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit text-xs"
            onClick={() => append({ ...EMPTY_DISCOUNT_ROW, target: 'option' })}
          >
            + 対象を追加
          </Button>
        </div>
      )}
    </div>
  );
}

export function CampaignFormDiscountSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">割引設定</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          <p className="text-muted-foreground text-xs">
            主契約・オプションごとに割引額（円）または割引率（%）を設定します。
          </p>

          <DiscountBlock />
        </div>
      </CardContent>
    </Card>
  );
}
