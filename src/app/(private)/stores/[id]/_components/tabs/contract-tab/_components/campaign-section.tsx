'use client';

import { useMemo, useState } from 'react';

import { formatDate } from '@/utils/format.util';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

import { useDebounce } from '@/hooks/use-debounce.hook';

import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  adminCampaignControllerLinkStoreCampaignMutation,
  adminCampaignControllerListLinkableCampaignsInfiniteOptions,
  adminCampaignControllerListLinkableCampaignsInfiniteQueryKey,
  adminCampaignControllerListStoreCampaignsOptions,
  adminCampaignControllerListStoreCampaignsQueryKey,
  adminCampaignControllerUnlinkStoreCampaignMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LinkableCampaignListResponseDto, StoreCampaignDto } from '@/lib/api-real/types.gen';

import {
  CAMPAIGN_LINK_DENY_TOOLTIP,
  CAMPAIGN_LINK_ROLES,
  CAMPAIGN_PUBLISH_EXCLUDED_TOOLTIP,
  STORE_CAMPAIGN_ACCEPT_STATE_META,
  type StoreBrandEnum,
} from '../../../../../_constants/constants';
import {
  // buildCampaignDiscountSummary, — with the commented-out 割引概要 column
  campaignAcceptState,
} from '../../../../../_utils/store-campaign.util';
import { CampaignBindDrawer } from './campaign-bind-drawer';
import { RemoveActionButton } from './remove-action-button';
import { SectionHeader } from './section-header';
import { SectionLoadError } from './section-load-error';

/** Linked campaigns are a handful per store; one page covers every realistic case */
const LINKED_PAGE_LIMIT = 100;
/** The link drawer's page size */
const CANDIDATE_PAGE_SIZE = 20;

type Props = {
  storeId: string;
  storeBrand: StoreBrandEnum;
};

/**
 * G-03 "select store-use campaigns" on the store detail screen.
 *
 * A linked campaign is never dropped automatically when it expires, stops accepting or is
 * unpublished — only an explicit unlink removes it (`specs/027-store-detail/spec.md` FR-042).
 */
export function CampaignSection({ storeId, storeBrand }: Props) {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [candidateKeyword, setCandidateKeyword] = useState('');
  const debouncedCandidateKeyword = useDebounce(candidateKeyword, 300);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminCampaignControllerListStoreCampaignsOptions({
      path: { id: storeId },
      query: { page: 1, limit: LINKED_PAGE_LIMIT },
    }),
    enabled: Boolean(storeId),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const linkedIds = useMemo(() => new Set(items.map((row) => row.campaignId)), [items]);

  // FR-034: the keyword is applied over the whole master server-side, not over a loaded page.
  // The query is held until the drawer opens and the typing is debounced, so browsing the tab
  // costs no request and a search is one request per pause rather than one per keystroke.
  //
  // API-088 §10a (v0.12): the server narrows the candidates to this store's brand and not yet
  // linked. Campaigns not published to this store come back too, flagged `isPublished = false`,
  // and the drawer shows them dimmed with 公開対象外 (FR-043); other-brand ones stay left out.
  const candidatesQuery = useInfiniteQuery({
    ...adminCampaignControllerListLinkableCampaignsInfiniteOptions({
      path: { id: storeId },
      query: {
        nameQuery: debouncedCandidateKeyword.trim() || undefined,
        limit: CANDIDATE_PAGE_SIZE,
      },
    }),
    enabled: Boolean(storeId) && drawerOpen,
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: LinkableCampaignListResponseDto,
      allPages: LinkableCampaignListResponseDto[],
    ) => (allPages.length < lastPage.pagination.totalPages ? allPages.length + 1 : undefined),
  });

  // The server leaves linked campaigns out already; the client-side filter only covers the moment
  // between a link and the candidate refetch
  const candidates = useMemo(
    () =>
      (candidatesQuery.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (campaign) => !linkedIds.has(campaign.campaignId),
      ),
    [candidatesQuery.data?.pages, linkedIds],
  );

  // 未紐づけのキャンペーン（N件） is the server's count (§10a), not the pages loaded so far
  const candidateTotal = candidatesQuery.data?.pages[0]?.pagination.totalItems;

  // A link or unlink changes both lists: the candidates are "not yet linked" server-side
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminCampaignControllerListStoreCampaignsQueryKey({ path: { id: storeId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: adminCampaignControllerListLinkableCampaignsInfiniteQueryKey({
          path: { id: storeId },
        }),
      }),
    ]);

  // Refetch on settle, not only on success: a 404 (already unlinked) or 409 (already linked)
  // means the list on screen is stale (BUG-U5-18)
  const linkMutation = useMutation({
    ...adminCampaignControllerLinkStoreCampaignMutation(),
    onSettled: invalidate,
  });

  const unlinkMutation = useMutation({
    ...adminCampaignControllerUnlinkStoreCampaignMutation(),
    onSettled: invalidate,
  });

  /**
   * The real endpoint links one campaign per request (a per-id POST, not a full-set replace, so a
   * stale tab cannot drop another operator's link), so a multi-select bind is a short series of
   * writes. They run in sequence: a failure stops the run and the shared `MutationCache` toast
   * names it, leaving the campaigns already linked in place rather than rolling back.
   *
   * Resolves to the ids still left to link — empty when every write went through — so the drawer
   * can stay open with just those selected for a retry (BUG-U5-07).
   */
  const handleBind = async (campaignIds: string[]) => {
    for (const [index, campaignId] of campaignIds.entries()) {
      const name =
        candidates.find((campaign) => campaign.campaignId === campaignId)?.name ?? campaignId;
      try {
        await linkMutation.mutateAsync({ path: { id: storeId, campaignId } });
      } catch {
        // Already surfaced by the shared mutation-error toast
        return campaignIds.slice(index);
      }
      toast.success(`『${name}』を紐づけました`, {
        description: 'この店舗の入会申請で選択できるようになります',
      });
    }
    return [];
  };

  const columns = useMemo<ColumnDef<StoreCampaignDto>[]>(
    () => [
      {
        id: 'campaignNumber',
        header: 'キャンペーンID',
        // The display number (CP-####), not the UUID (BUG-U5-15)
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {row.original.campaign.campaignNumber}
          </span>
        ),
        meta: { className: 'whitespace-nowrap' },
      },
      {
        accessorKey: 'name',
        header: 'キャンペーン名',
        // FR-041: `isPublished` is for the path store; HQ may narrow the published set after the
        // store linked the campaign, and the link stays listed until it is unlinked (FR-042).
        // `=== false`, not `!`: a BE without API-088 v0.9.1 omits the field, and that must not
        // mark every row.
        // Long names wrap rather than widening the table past its card (BUG-U5-03)
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium [overflow-wrap:anywhere]">
              {row.original.campaign.name}
            </span>
            {row.original.isPublished === false && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    <span className="text-muted-foreground shrink-0 text-[10px]">公開対象外</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{CAMPAIGN_PUBLISH_EXCLUDED_TOOLTIP}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
        // Takes the width the commented-out 割引概要 column used to absorb
        meta: { className: 'w-full min-w-28 whitespace-normal' },
      },
      // 割引概要 removed by API-088 §3.3 (BE MR !691, Otaki Q&A ①): the store-campaign row
      // carries no discount fields any more and the column is not in the FR.
      // Restoring it also restores `buildCampaignDiscountSummary` (store-campaign.util.ts) and
      // moves `w-full` back from キャンペーン名.
      // {
      //   id: 'discountSummary',
      //   header: '割引概要',
      //   cell: ({ row }) => (
      //     <span className="text-xs [overflow-wrap:anywhere]">
      //       {buildCampaignDiscountSummary(row.original.campaign)}
      //     </span>
      //   ),
      //   meta: { className: 'w-full min-w-28 whitespace-normal' },
      // },
      {
        id: 'period',
        header: '募集期間',
        cell: ({ row }) => (
          // Each date stays whole; the pair may break at 〜 so the column stays compact (BUG-U5-16)
          <span className="text-xs">
            <span className="whitespace-nowrap">
              {formatDate(row.original.campaign.recruitmentStart)}
            </span>{' '}
            <span className="whitespace-nowrap">
              〜 {formatDate(row.original.campaign.recruitmentEnd)}
            </span>
          </span>
        ),
        meta: { className: 'min-w-24 whitespace-normal' },
      },
      {
        id: 'acceptingStatus',
        header: '受付可否',
        cell: ({ row }) => {
          const meta = STORE_CAMPAIGN_ACCEPT_STATE_META[campaignAcceptState(row.original.campaign)];
          return (
            <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${meta.className}`}>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'linkedAt',
        header: '紐づけ日',
        cell: ({ row }) => <span className="text-xs">{formatDate(row.original.linkedAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <div className="text-right text-xs font-semibold">解除</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <RemoveActionButton
              allowedRoles={CAMPAIGN_LINK_ROLES}
              denyTooltip={CAMPAIGN_LINK_DENY_TOOLTIP}
              dialogTitle="キャンペーンの紐づけを解除しますか？"
              dialogDescription={`『${row.original.campaign.name}』の紐づけを解除します。この店舗の入会申請でこのキャンペーンは選択できなくなります。`}
              isPending={unlinkMutation.isPending}
              onConfirm={async () => {
                await unlinkMutation.mutateAsync({
                  path: { id: storeId, campaignId: row.original.campaignId },
                });
                toast.success(`『${row.original.campaign.name}』の紐づけを解除しました`);
              }}
            />
          </div>
        ),
      },
    ],
    [storeId, unlinkMutation],
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="p-4 pb-3">
        <SectionHeader
          title="キャンペーン"
          count={items.length}
          isLoading={isLoading}
          isError={isError && !data}
          action={
            <CampaignBindDrawer
              storeBrand={storeBrand}
              candidates={candidates}
              candidateTotal={candidateTotal}
              isLoading={candidatesQuery.isFetching && !candidatesQuery.isFetchingNextPage}
              isError={candidatesQuery.isError}
              onRetry={() => void candidatesQuery.refetch()}
              hasMore={candidatesQuery.hasNextPage}
              isLoadingMore={candidatesQuery.isFetchingNextPage}
              onLoadMore={() => void candidatesQuery.fetchNextPage()}
              keyword={candidateKeyword}
              onKeywordChange={setCandidateKeyword}
              onOpenChange={setDrawerOpen}
              isBinding={linkMutation.isPending}
              onBind={handleBind}
            />
          }
        />
      </CardHeader>

      {/* Full-bleed table: the header row spans the card, as in the prototype */}
      <DataTable
        variant="simple"
        columns={columns}
        data={items}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        errorTitle="キャンペーンの取得に失敗しました"
        className="rounded-none border-0 border-t"
        containerClassName="max-h-[420px]"
        emptyContent={
          isError && !data ? (
            <SectionLoadError
              title="キャンペーンの取得に失敗しました"
              onRetry={() => void refetch()}
            />
          ) : undefined
        }
      />
    </Card>
  );
}
