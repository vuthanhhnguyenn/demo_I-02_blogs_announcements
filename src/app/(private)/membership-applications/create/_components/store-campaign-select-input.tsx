'use client';

import { useMemo, useState } from 'react';

import { toMemberGenderFilter } from '@/app/(private)/area-master/_utils/area-gender.util';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';

import {
  adminCampaignControllerListStoreCampaignsInfiniteOptions,
  adminCampaignControllerListStoreCampaignsOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreCampaignDto, StoreCampaignListResponseDto } from '@/lib/api-real/types.gen';

const CAMPAIGN_PAGE_SIZE = 20;

/**
 * Query for the campaigns usable at a store (API-088 §19.1a): accepting applications, published
 * to the store, with a recruitment period containing today. All three are filtered server-side
 * so every page holds only usable rows and paging never stalls on an all-unpublished page.
 */
export function usableStoreCampaignQuery(limit: number) {
  return {
    isAccepting: true,
    isPublished: true,
    recruitmentActiveOn: format(new Date(), 'yyyy-MM-dd'),
    limit,
  };
}

function campaignLabel(link: StoreCampaignDto): string {
  return link.campaign.name;
}

interface StoreCampaignSelectInputProps {
  /** Store whose accepting campaigns are offered; the select stays disabled until one is picked. */
  storeId: string;
  /** Selected campaign id; `''` means nothing selected. */
  value: string;
  onChange: (campaign: StoreCampaignDto | null) => void;
  hasError?: boolean;
  triggerClassName?: string;
  /**
   * The applicant's gender in API terms (`male` / `female` / `other` / `prefer_not_to_say`; null =
   * not chosen). A campaign whose plan the gender does not meet is not offered (E-02 FR-016).
   */
  applicantGender?: string | null;
  /** Brand label the hints name (「JOYFITで受付中の…」). */
  brandLabel?: string;
  /** 「性別を○○に変えたため…外しました」, set by the form when a gender change dropped the pick. */
  removedNotice?: string;
}

/**
 * 適用キャンペーン picker for the enrolment form: the campaigns usable at the selected store,
 * paged with infinite scroll over `GET /admin/stores/{id}/campaigns`. The picked campaign
 * decides the plan (C-01 L212, integration-plan D17). The endpoint has no keyword filter, so
 * the dropdown offers no search box.
 */
export function StoreCampaignSelectInput({
  storeId,
  value,
  onChange,
  hasError = false,
  triggerClassName,
  applicantGender = null,
  brandLabel = '',
  removedNotice = '',
}: StoreCampaignSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Remember the picked row so the trigger keeps its label after the list unmounts.
  const [pickedCampaign, setPickedCampaign] = useState<StoreCampaignDto | null>(null);

  // E-02 FR-016 / G-01 FR-M002 (prototype 11/12): a campaign whose plan (its areas' gender condition
  // and 性別制限) the applicant's gender does not meet is left out by the endpoint itself, before
  // paging; an unset gender meets none.
  const { data, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    ...adminCampaignControllerListStoreCampaignsInfiniteOptions({
      path: { id: storeId },
      query: {
        ...usableStoreCampaignQuery(CAMPAIGN_PAGE_SIZE),
        memberGender: toMemberGenderFilter(applicantGender),
      },
    }),
    // Read on store pick (not only on open): the gender hints under the field need the list.
    enabled: !!storeId,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreCampaignListResponseDto) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const campaigns = useMemo(() => data?.pages.flatMap((page) => page.items ?? []) ?? [], [data]);
  // The hints compare against every usable campaign, gender aside — a one-row probe.
  const { data: unfiltered } = useQuery({
    ...adminCampaignControllerListStoreCampaignsOptions({
      path: { id: storeId },
      query: usableStoreCampaignQuery(1),
    }),
    enabled: !!storeId,
  });
  const usableCount = unfiltered?.pagination.totalItems;
  const forGenderCount = data?.pages[0]?.pagination.totalItems;
  // Prototype: no accepting campaign at the store, or none left for the gender → the select is
  // disabled and says why.
  const noCampaignForStore = usableCount === 0;
  const noCampaignForGender = !!usableCount && forGenderCount === 0;
  // Gender not chosen yet: the campaigns left out are exactly the ones with a gender condition.
  const hasGenderCondition =
    usableCount !== undefined && forGenderCount !== undefined && usableCount > forGenderCount;
  // One hint under the field, highest first: none accepting → none fits the gender → the dropped
  // pick → gender unset.
  const hint = noCampaignForStore
    ? `${brandLabel}で受付中のキャンペーンがありません。キャンペーン管理で受付状況を確認してください`
    : noCampaignForGender
      ? `${brandLabel}で受付中のキャンペーンは、どれも性別の条件が申請者に合いません`
      : removedNotice
        ? removedNotice
        : !applicantGender && hasGenderCondition
          ? '性別を選択すると、性別の条件があるキャンペーンも選べます'
          : undefined;

  const picked =
    pickedCampaign?.campaignId === value
      ? pickedCampaign
      : campaigns.find((c) => c.campaignId === value);
  const valueLabel = value && picked ? campaignLabel(picked) : undefined;
  const placeholder = noCampaignForStore
    ? '受付中のキャンペーンがありません'
    : noCampaignForGender
      ? '適用できるキャンペーンがありません'
      : '選択してください';

  const handleSelect = (campaign: StoreCampaignDto | null) => {
    setPickedCampaign(campaign);
    onChange(campaign);
  };

  return (
    <>
      <SearchableSelect<StoreCampaignDto>
        value={value || null}
        valueLabel={valueLabel ?? placeholder}
        options={campaigns}
        placeholder={placeholder}
        searchable={false}
        emptyMessage={
          noCampaignForGender
            ? '適用できるキャンペーンがありません'
            : '受付中のキャンペーンがありません'
        }
        loadingMessage="キャンペーンを読み込み中..."
        open={isOpen}
        onOpenChange={setIsOpen}
        onSelect={handleSelect}
        getOptionKey={(campaign) => campaign.campaignId}
        getOptionLabel={campaignLabel}
        isLoading={isFetching && !isFetchingNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        loadingMoreMessage="読み込み中..."
        disabled={!storeId || noCampaignForStore || noCampaignForGender}
        hasError={hasError}
        endIcon={<ChevronDownIcon className="text-muted-foreground ml-2 size-4 shrink-0" />}
        triggerClassName={triggerClassName}
      />
      {hint && <p className="text-muted-foreground text-xs wrap-anywhere">{hint}</p>}
    </>
  );
}
