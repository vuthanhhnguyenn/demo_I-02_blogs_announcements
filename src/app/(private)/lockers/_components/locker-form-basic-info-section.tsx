'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';

import { SearchableSelect } from '@/components/common/searchable-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import {
  adminStoreControllerDetailOptions,
  adminStoreControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreSummaryDto } from '@/lib/api-real/types.gen';

import type { LockerFormValues } from '../_schemas/locker-form.schema';

const STORE_SEARCH_LIMIT = 20;

type LockerFormBasicInfoSectionProps = {
  /** The store is fixed after creation (`UpdateLockerDto` has no `storeId`) */
  isEdit?: boolean;
};

export function LockerFormBasicInfoSection({ isEdit = false }: LockerFormBasicInfoSectionProps) {
  const form = useFormContext<LockerFormValues>();
  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const selectedStoreId = form.watch('storeId');

  // `GET /admin/stores` is not scoped for a Manager (only Staff is), so a restricted role picks from
  // its own stores — the ones the header switcher offers. The BE still refuses others (E-LOC-100)
  const { canSelectAllStores, restrictedStores } = useCurrentStore();

  const { data: storesRes, isFetching: isStoresFetching } = useQuery({
    ...adminStoreControllerListOptions({
      query: {
        page: 1,
        limit: STORE_SEARCH_LIMIT,
        keyword: storeSearchQuery || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: isStorePopoverOpen && canSelectAllStores,
  });

  const normalizedQuery = storeSearchQuery.trim().toLowerCase();
  const stores = canSelectAllStores
    ? (storesRes?.items ?? [])
    : restrictedStores.filter((store) =>
        [store.name, store.code].some((text) => text?.toLowerCase().includes(normalizedQuery)),
      );
  const selectedStoreFromOptions = selectedStoreId
    ? stores.find((store) => store.id === selectedStoreId)
    : undefined;

  const { data: selectedStoreRes } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: selectedStoreId } }),
    enabled: Boolean(selectedStoreId) && !selectedStoreFromOptions,
  });

  const selectedStoreLabel = selectedStoreId
    ? (selectedStoreFromOptions?.name ?? selectedStoreRes?.name)
    : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">基本情報</CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="storeId"
            render={({ field, fieldState }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>
                  設置店舗<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <SearchableSelect<StoreSummaryDto>
                    value={field.value || null}
                    valueLabel={selectedStoreLabel}
                    options={stores}
                    placeholder="店舗を選択"
                    searchPlaceholder="店舗名・店舗IDで検索..."
                    emptyMessage="該当する店舗がありません"
                    loadingMessage="店舗を読み込み中..."
                    isLoading={isStoresFetching}
                    open={isStorePopoverOpen}
                    onOpenChange={setIsStorePopoverOpen}
                    onSearchChange={setStoreSearchQuery}
                    onSelect={(store) => field.onChange(store?.id ?? '')}
                    getOptionKey={(store) => store.id}
                    getOptionLabel={(store) => store.name}
                    getOptionKeywords={(store) =>
                      [store.name, store.code, store.id, store.clubCode].filter(Boolean).join(' ')
                    }
                    disabled={isEdit}
                    // aria-invalid lets the invalid-submit handler scroll here first (BUG-E01-11)
                    hasError={!!fieldState.error}
                    triggerClassName="h-9 w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
