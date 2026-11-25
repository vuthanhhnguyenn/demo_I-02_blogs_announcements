'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { formatNextMonthStart } from '@/utils/format.util';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { RequiredMark } from '@/components/common/field-marker';
import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

import { adminPlanControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminPlanControllerListResponse,
  MemberListItemDto,
  PlanListItemDto,
} from '@/lib/api-real/types.gen';

type MemberItem = MemberListItemDto;
type ContractItem = PlanListItemDto;

/**
 * Option label of the 変更先の主契約 picker — 「プラン名（¥料金）」, as the prototype
 * spells it, so the price is readable while choosing and not only in the preview
 * underneath. `priceMonthly` is tax-inclusive (API-087 v0.14).
 */
function contractLabel(contract: ContractItem): string {
  return `${contract.name}（¥${contract.priceMonthly.toLocaleString()}）`;
}

interface MemberBulkContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMemberIds: string[];
  selectedMembers: MemberItem[];
  isChangingMainContract: boolean;
  onExecute: (contract: ContractItem) => void;
}

export function MemberBulkContractDialog({
  open,
  onOpenChange,
  selectedMemberIds,
  selectedMembers,
  isChangingMainContract,
  onExecute,
}: MemberBulkContractDialogProps) {
  // The picked target contract lives here — the parent only needs it on execute.
  const [toContract, setToContract] = useState<ContractItem | null>(null);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  // Two clicks landing in the same tick both run before React re-renders with
  // `isChangingMainContract`, so the disabled prop alone cannot stop the second one
  // from booking a duplicate change. The ref closes that window synchronously.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (open) isSubmittingRef.current = false;
  }, [open]);

  // Clear the pick on close so it never lingers into the next bulk change.
  const handleOpenChange = (next: boolean) => {
    if (!next) setToContract(null);
    onOpenChange(next);
  };

  const {
    data: contractsData,
    isFetching: isContractsFetching,
    fetchNextPage: fetchNextContracts,
    hasNextPage: hasMoreContracts,
    isFetchingNextPage: isFetchingMoreContracts,
  } = useInfiniteQuery({
    ...adminPlanControllerListInfiniteOptions({
      query: { limit: 20, nameQuery: contractSearch || undefined, sort: 'name', order: 'asc' },
    }),
    enabled: open && contractOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminPlanControllerListResponse, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pagination.totalPages ? currentPage + 1 : undefined;
    },
  });
  const contractOptions = useMemo(
    () => contractsData?.pages.flatMap((page) => page.items) ?? [],
    [contractsData],
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg grid-cols-[minmax(0,1fr)]">
        <AlertDialogHeader>
          <AlertDialogTitle>主契約の一括変更</AlertDialogTitle>
          <AlertDialogDescription>
            選択した {selectedMemberIds.length}{' '}
            名の主契約を一括で変更します。変更は翌月月初から適用されます。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">
              変更先の主契約
              <RequiredMark />
            </Label>
            <SearchableSelect<ContractItem>
              value={toContract?.planId ?? null}
              valueLabel={toContract ? contractLabel(toContract) : '選択してください'}
              options={contractOptions}
              placeholder="選択してください"
              searchPlaceholder="プラン名で検索..."
              emptyMessage="該当するプランがありません"
              loadingMessage="プランを読み込み中..."
              open={contractOpen}
              onOpenChange={setContractOpen}
              onSearchChange={setContractSearch}
              onSelect={(contract) => setToContract(contract)}
              getOptionKey={(contract) => contract.planId}
              getOptionLabel={contractLabel}
              getOptionKeywords={(contract) =>
                [contract.name, contract.nameForMember, contract.planId].filter(Boolean).join(' ')
              }
              renderOption={(contract) => (
                <TextWithTooltip
                  text={contractLabel(contract)}
                  wrapperClassName="w-full"
                  className="w-full"
                  side="right"
                  align="center"
                />
              )}
              isLoading={isContractsFetching}
              hasMore={hasMoreContracts}
              isLoadingMore={isFetchingMoreContracts}
              onLoadMore={fetchNextContracts}
              loadingMoreMessage="読み込み中..."
              triggerClassName="h-9 w-full text-sm"
            />
          </div>

          {/* 変更内容プレビュー */}
          {toContract && (
            <div className="bg-muted/50 space-y-2 rounded-md p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-16 shrink-0">変更後:</span>
                <span className="text-primary min-w-0 font-medium wrap-anywhere">
                  {toContract.name}
                </span>
                <span className="text-muted-foreground shrink-0">
                  ¥{toContract.priceMonthly.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-16 shrink-0">適用開始:</span>
                <span className="text-foreground font-medium">
                  {formatNextMonthStart()}（翌月月初）
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              対象会員プレビュー（全 {selectedMembers.length} 名）
            </Label>
            <div className="bg-background space-y-1 rounded-md border p-3">
              {selectedMembers.slice(0, 5).map((member) => {
                const memberName = [member.lastName, member.firstName].filter(Boolean).join(' ');
                const currentPlanName = member.currentMainContract?.plan.name;
                return (
                  <div key={member.memberId} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-20 shrink-0 font-mono">
                      {member.memberNumber || member.memberId}
                    </span>
                    <span
                      className="max-w-[25%] shrink-0 truncate font-medium"
                      title={memberName || undefined}
                    >
                      {memberName || '-'}
                    </span>
                    <span
                      className="text-muted-foreground ml-auto max-w-[30%] min-w-0 truncate"
                      title={currentPlanName || undefined}
                    >
                      {currentPlanName || '-'}
                    </span>
                    <ArrowRight className="text-muted-foreground size-3 shrink-0" />
                    <span
                      className="text-primary max-w-[35%] min-w-0 truncate"
                      title={toContract?.name}
                    >
                      {toContract?.name || '―'}
                    </span>
                  </div>
                );
              })}
              {selectedMembers.length > 5 && (
                <p className="text-muted-foreground border-t pt-1 text-xs">
                  他 {selectedMembers.length - 5} 名
                </p>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isChangingMainContract}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            disabled={!toContract || isChangingMainContract}
            onClick={() => {
              if (!toContract || isSubmittingRef.current) return;
              isSubmittingRef.current = true;
              onExecute(toContract);
              setToContract(null);
            }}
          >
            実行
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
