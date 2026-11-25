'use client';

import { useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';

import { useQuery } from '@tanstack/react-query';

import { SearchableSelect } from '@/components/common/searchable-select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import {
  adminMemberControllerListOptions,
  adminStoreControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberListItemDto, StoreSummaryDto } from '@/lib/api-real/types.gen';

import type { ManualRegistrationFormValues } from '../_schemas/manual-registration-form.schema';

/** API-111 / API-093 list `limit` max */
const PICKER_LIMIT = 100;

/**
 * API-115 §8.1: the member must be `active` or `provisional` (else 400 `invalid_reference`), so
 * the picker only offers those.
 */
const BILLABLE_MEMBER_STATUSES = 'active,provisional';

export function getMemberDisplayName(member: MemberListItemDto): string {
  return [member.lastName, member.firstName].filter(Boolean).join(' ') || member.memberNumber;
}

// A failed load must not read as an empty result; reopening the picker refetches
const LOAD_ERROR_MESSAGE = {
  store: '店舗を取得できませんでした。もう一度開いてください',
  member: '利用者を取得できませんでした。もう一度開いてください',
};

interface StoreMemberPickerProps {
  control: Control<ManualRegistrationFormValues>;
  storeLabel?: string;
  /** Manager / Staff: only their own stores are offered (the store API lists every store) */
  storeOptions?: StoreSummaryDto[];
  memberLabel?: string;
  onStoreChange: (store: StoreSummaryDto | null) => void;
  onMemberChange: (member: MemberListItemDto | null) => void;
}

export function StoreMemberPicker({
  control,
  storeLabel,
  storeOptions,
  memberLabel,
  onStoreChange,
  onMemberChange,
}: Readonly<StoreMemberPickerProps>) {
  const storeId = useWatch({ control, name: 'store_id' });

  const [storeOpen, setStoreOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Server-side search (`keyword` / `query`): the lists are paged at 100, so a client filter
  // over the first page would hide matches.
  const {
    data: storesRes,
    isFetching: isStoreFetching,
    isError: isStoreError,
  } = useQuery({
    ...adminStoreControllerListOptions({
      query: {
        page: 1,
        limit: PICKER_LIMIT,
        sort: 'name',
        order: 'asc',
        keyword: storeSearch || undefined,
      },
    }),
    enabled: storeOpen && !storeOptions,
  });
  const stores = storeOptions
    ? storeOptions.filter((store) =>
        `${store.name} ${store.code}`.toLowerCase().includes(storeSearch.toLowerCase()),
      )
    : (storesRes?.items ?? []);

  const {
    data: membersRes,
    isFetching: isMemberFetching,
    isError: isMemberError,
  } = useQuery({
    ...adminMemberControllerListOptions({
      query: {
        storeId: storeId || undefined,
        memberStatus: BILLABLE_MEMBER_STATUSES,
        query: memberSearch || undefined,
        page: 1,
        limit: PICKER_LIMIT,
        sort: 'memberNumber',
        order: 'asc',
      },
    }),
    enabled: Boolean(storeId) && memberOpen,
  });
  const members = membersRes?.items ?? [];

  return (
    <>
      <FormField
        control={control}
        name="store_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              店舗<span className="text-destructive ml-0.5">*</span>
            </FormLabel>
            <FormControl>
              <SearchableSelect<StoreSummaryDto>
                value={field.value || null}
                valueLabel={field.value ? storeLabel : undefined}
                options={stores}
                isLoading={isStoreFetching}
                placeholder="店舗を選択"
                searchPlaceholder="店舗名・コードで検索..."
                emptyMessage={isStoreError ? LOAD_ERROR_MESSAGE.store : '該当なし'}
                open={storeOpen}
                onOpenChange={setStoreOpen}
                onSearchChange={setStoreSearch}
                onSelect={(store) => {
                  field.onChange(store?.id ?? '');
                  onStoreChange(store ?? null);
                }}
                getOptionKey={(store) => store.id}
                getOptionLabel={(store) => store.name}
                getOptionKeywords={(store) => `${store.name} ${store.code}`}
                triggerClassName="h-9 w-full justify-between"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="member_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              利用者<span className="text-destructive ml-0.5">*</span>
            </FormLabel>
            <FormControl>
              <SearchableSelect<MemberListItemDto>
                value={field.value || null}
                valueLabel={field.value ? memberLabel : undefined}
                options={members}
                isLoading={isMemberFetching}
                placeholder={storeId ? '利用者を選択' : '先に店舗を選択してください'}
                searchPlaceholder="氏名・会員番号で検索..."
                emptyMessage={
                  isMemberError ? LOAD_ERROR_MESSAGE.member : '該当する利用者がいません'
                }
                disabled={!storeId}
                open={memberOpen}
                onOpenChange={setMemberOpen}
                onSearchChange={setMemberSearch}
                onSelect={(member) => {
                  field.onChange(member?.memberId ?? '');
                  onMemberChange(member ?? null);
                }}
                getOptionKey={(member) => member.memberId}
                getOptionLabel={(member) =>
                  `${member.memberNumber}: ${getMemberDisplayName(member)}`
                }
                getOptionKeywords={(member) =>
                  `${getMemberDisplayName(member)} ${member.memberNumber}`
                }
                triggerClassName="h-9 w-full justify-between"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
