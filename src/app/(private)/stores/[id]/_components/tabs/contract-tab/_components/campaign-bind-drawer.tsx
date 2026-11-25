'use client';

import { useRef, useState } from 'react';

// import { formatISODateLocal } from '@/utils/date.util'; — with the commented-out 募集期間終了 check
import { formatDate } from '@/utils/format.util';
import { Link2, Plus, Search, X } from 'lucide-react';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { LinkableCampaignListItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  CAMPAIGN_LINK_DENY_TOOLTIP,
  CAMPAIGN_LINK_ROLES,
  CAMPAIGN_PUBLISH_EXCLUDED_TOOLTIP,
  STORE_CAMPAIGN_ACCEPT_STATE_META,
  type StoreBrandEnum,
} from '../../../../../_constants/constants';
import {
  // buildCampaignDiscountSummary, — see the commented-out summary below
  campaignAcceptState,
} from '../../../../../_utils/store-campaign.util';
import { SectionLoadError } from './section-load-error';

type BlockReason = 'ブランド対象外' | '公開対象外' | '募集期間終了';

const BLOCK_TOOLTIPS: Record<BlockReason, string> = {
  ブランド対象外: '自店舗のブランド対象外のキャンペーンは利用できません',
  公開対象外: CAMPAIGN_PUBLISH_EXCLUDED_TOOLTIP,
  募集期間終了: '募集期間が終了しているため紐づけできません',
};

/**
 * FR-043 block reason, precedence ブランド対象外 > 公開対象外 > 募集期間終了. Stopped campaigns stay
 * selectable (FR-044).
 *
 * `GET …/linkable-campaigns` (API-088 §10a, v0.12) returns campaigns not published to this store
 * flagged `isPublished = false` — linking one is a 422 E-CMP-020 — so 公開対象外 is live. Strict
 * `false`, so a BE without the field blocks nothing. The other two stay off (user decision
 * 2026-10-09): the server leaves other-brand campaigns out, and the BE accepts a link outside the
 * recruitment window (§11).
 */
function getBlockReason(
  campaign: LinkableCampaignListItemDto,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read again with the ブランド対象外 check
  storeBrand: StoreBrandEnum,
): BlockReason | null {
  // if (campaign.brandEnum !== storeBrand) return 'ブランド対象外';
  if (campaign.isPublished === false) return '公開対象外';
  // if (campaign.recruitmentEnd < formatISODateLocal(new Date())) return '募集期間終了';
  return null;
}

type Props = {
  storeBrand: StoreBrandEnum;
  /** Candidates loaded so far — brand and not-yet-linked filtered server-side, unpublished flagged */
  candidates: LinkableCampaignListItemDto[];
  /** Every candidate matching the search, from the server; unknown until the first page lands */
  candidateTotal?: number;
  /** True while the candidate list is being (re)fetched — the keyword search included */
  isLoading: boolean;
  /** The candidate read failed — shown as an error with a retry, not as an empty list */
  isError?: boolean;
  onRetry?: () => void;
  /** Whether the master has further pages behind the ones in `candidates` */
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  /** Raw keyword, owned by the caller so it can debounce before hitting the API */
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  /** Told when the drawer opens or closes, so the caller can hold its query until then */
  onOpenChange?: (open: boolean) => void;
  isBinding: boolean;
  /**
   * Links the selection. Resolves to the ids still left unlinked — empty once every write went
   * through, and the drawer closes; otherwise (already toasted globally) the drawer stays open
   * with just those selected so the operator can retry (BUG-U5-07).
   */
  onBind: (campaignIds: string[]) => Promise<string[]>;
};

export function CampaignBindDrawer({
  storeBrand,
  candidates,
  candidateTotal,
  isLoading,
  isError = false,
  onRetry,
  hasMore,
  isLoadingMore,
  onLoadMore,
  keyword,
  onKeywordChange,
  onOpenChange,
  isBinding,
  onBind,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const run = useInFlightGuard();
  const listRef = useRef<HTMLDivElement>(null);

  const sentinelRef = useInfiniteScroll({
    hasMore,
    isLoading: isLoading || isLoadingMore,
    onLoadMore,
    rootRef: listRef,
    enabled: open,
  });

  const setDrawerOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setSelectedIds([]);
      onKeywordChange('');
    }
  };

  const close = () => setDrawerOpen(false);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Guarded: two clicks landing in the same tick must not send the writes twice (BUG-U5-06)
  const handleBind = () =>
    run(async () => {
      if (selectedIds.length === 0) return;
      const remaining = await onBind(selectedIds);
      if (remaining.length === 0) close();
      else setSelectedIds(remaining);
    });

  return (
    <>
      <RoleGatedButton
        // FR-047: System / Headquarter / Staff, exactly what the endpoint accepts. Not
        // `stores.config-contract` — that is the sales settings (main contracts / options), which Staff lacks.
        allowedRoles={CAMPAIGN_LINK_ROLES}
        denyTooltip={CAMPAIGN_LINK_DENY_TOOLTIP}
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs"
        onClick={() => setDrawerOpen(true)}
      >
        <Plus className="size-3.5" />
        紐づけ追加
      </RoleGatedButton>

      <Drawer direction="right" open={open} onOpenChange={setDrawerOpen}>
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-120">
          <DrawerHeader className="border-border border-b px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DrawerTitle className="text-base">キャンペーンを紐づける</DrawerTitle>
                <DrawerDescription className="text-xs">
                  「商材・施策 &gt;
                  キャンペーン管理」で作成されたキャンペーンから、この店舗で利用するものを選んで紐づけてください。
                </DrawerDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={close}>
                <X className="size-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="space-y-3 p-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={keyword}
                onChange={(event) => onKeywordChange(event.target.value)}
                placeholder="キャンペーン名で検索"
                className="pl-9"
              />
            </div>
            {/* The server's total; without it, what has loaded so far */}
            {isError ? null : (
              <p className="text-muted-foreground text-xs">
                未紐づけのキャンペーン（
                {candidateTotal !== undefined
                  ? `${candidateTotal}件`
                  : `${candidates.length}${hasMore ? '件以上' : '件'}`}
                ）
              </p>
            )}

            <div ref={listRef} className="max-h-[calc(100vh-250px)] space-y-2 overflow-y-auto pr-1">
              {candidates.map((campaign) => {
                const blockReason = getBlockReason(campaign, storeBrand);
                const checked = selectedIds.includes(campaign.campaignId);
                const acceptMeta = STORE_CAMPAIGN_ACCEPT_STATE_META[campaignAcceptState(campaign)];
                const meta = (
                  <>
                    {/* The name wraps (even an unbroken token) and the badge stays beside it */}
                    <div className="flex items-start gap-2">
                      <p className="text-foreground min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]">
                        {campaign.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-0.5 shrink-0 px-1.5 py-0 text-[10px] font-medium',
                          acceptMeta.className,
                        )}
                      >
                        {acceptMeta.label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs [overflow-wrap:anywhere]">
                      {/* 割引概要 removed by API-088 §3.3 (BE MR !691) — the list item carries no
                          discount fields. Was: {buildCampaignDiscountSummary(campaign)} ·{' '} */}
                      {formatDate(campaign.recruitmentStart)} 〜{' '}
                      {formatDate(campaign.recruitmentEnd)}
                    </p>
                  </>
                );

                if (blockReason) {
                  return (
                    <div
                      key={campaign.campaignId}
                      className="border-border bg-card flex items-center gap-3 rounded-md border p-3 opacity-50"
                    >
                      <div className="min-w-0 flex-1">{meta}</div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <span className="text-muted-foreground shrink-0 text-[10px]">
                              {blockReason}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{BLOCK_TOOLTIPS[blockReason]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  );
                }

                return (
                  <button
                    key={campaign.campaignId}
                    type="button"
                    onClick={() => toggle(campaign.campaignId)}
                    className={cn(
                      'border-border bg-card flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
                      checked && 'border-primary bg-primary/5',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(campaign.campaignId)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">{meta}</div>
                  </button>
                );
              })}

              {isLoading || isLoadingMore ? (
                <div className="space-y-2" aria-hidden>
                  {Array.from({ length: isLoading ? 4 : 2 }, (_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : null}

              {!isLoading && isError && candidates.length === 0 ? (
                <SectionLoadError
                  title="キャンペーンの取得に失敗しました"
                  onRetry={() => onRetry?.()}
                />
              ) : null}

              {!isLoading && !isError && candidates.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  紐づけ可能なキャンペーンはありません
                </p>
              ) : null}

              <div ref={sentinelRef} className="h-px" aria-hidden />
            </div>
          </div>

          <DrawerFooter className="border-border border-t bg-neutral-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                {selectedIds.length > 0
                  ? `${selectedIds.length}件を選択中`
                  : 'キャンペーンを選択してください'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBinding}
                  onClick={close}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={selectedIds.length === 0 || isBinding}
                  onClick={() => void handleBind()}
                >
                  <Link2 className="size-3.5" />
                  {selectedIds.length > 0 ? `${selectedIds.length}件を紐づける` : '紐づける'}
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
