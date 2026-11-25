'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { toMemberGenderFilter } from '@/app/(private)/area-master/_utils/area-gender.util';
import { PAGE_SIZE } from '@/constants/app.constants';
import { formatISODateLocal } from '@/utils/date.util';
import {
  formatDate,
  formatJapaneseDate,
  formatJapaneseMonthDay,
  formatNextMonthStart,
  formatYen,
  nextMonthStartISO,
} from '@/utils/format.util';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { endOfMonth } from 'date-fns';
import { MoreHorizontal, Plus, RefreshCw, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { SearchableSelect } from '@/components/common/searchable-select';
import { TablePagination } from '@/components/common/table-pagination';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import {
  adminMemberContractOpsControllerAddOptionContractMutation,
  adminMemberContractOpsControllerCancelOptionContractMutation,
  adminMemberContractOpsControllerContractSummaryQueryKey,
  adminMemberContractOpsControllerListOptionContractsInfiniteOptions,
  adminMemberContractOpsControllerListOptionContractsOptions,
  adminMemberContractOpsControllerListOptionContractsQueryKey,
  adminMemberContractOpsControllerMainContractOptions,
  adminMemberContractOpsControllerSwitchOptionContractMutation,
  adminMemberControllerDetailOptions,
  adminMemberControllerDetailQueryKey,
  adminStoreSettingsControllerListOptionsInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  CancelOptionContractDto,
  MemberOptionContractItemDto,
  MemberOptionContractListDto,
  ProxyApplicationDto,
  StoreOptionListResponseDto,
} from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { STATUS_CHANGE_REASON_MAX_LENGTH } from '../../../_schemas/proxy-agreement.schema';
import { ProxyApplicationSection } from '../../proxy-application-section';
import { getProxyAgreedAtError } from './proxy-agreed-at.util';

/** Server caps `limit` at 100. */
const LIVE_CONTRACTS_PAGE_SIZE = 100;

function OptionsFetchError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <p className="text-destructive text-xs">
      {message}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        onClick={onRetry}
      >
        再読み込み
      </Button>
    </p>
  );
}

/** One row of the 店舗オプションマスタ as the add / change sheets render it. */
interface OptionChoice {
  value: string;
  label: string;
  price: number;
  description: string;
  /** Whether a mid-month start is prorated (`proratedEnabled`); off bills the whole month. */
  prorated: boolean;
}

/**
 * A-01 FR-007 v7: 今日から prorates to month-end only for an option with the proration flag on;
 * with it off the current month is billed in full. Before an option is picked, only the date shows.
 */
function getDateLabels(prorated: boolean | undefined) {
  const today = new Date();
  const nextMonthFirstLabel = formatNextMonthStart();
  const lastDayOfMonth = endOfMonth(today);
  const todayStart = `${formatJapaneseDate(today)}〜`;
  let todayLabel = todayStart;
  if (prorated === true) todayLabel = `${todayStart}（月末までの日割り料金を請求）`;
  else if (prorated === false) todayLabel = `${todayStart}（日割りなし・当月分を満額請求）`;
  return {
    todayLabel,
    nextMonthLabel: `${nextMonthFirstLabel}〜（通常請求・${formatJapaneseMonthDay(lastDayOfMonth)}までキャンセル可）`,
    nextMonthFirstLabel,
  };
}

/**
 * Row action menu. The sheet is opened from `onOpenChangeComplete`, i.e. once the menu has
 * finished closing and restored focus to its trigger — opening it straight from the item handler
 * makes the two fight over focus.
 */
function OptionRowActions({
  option,
  changeDisabled,
  changeTooltip,
  cancelDisabled,
  onChange,
  onCancel,
}: {
  option: TargetOption;
  changeDisabled: boolean;
  /** Why this row's option cannot be the switch source; shown on the disabled 変更 item. */
  changeTooltip?: string;
  cancelDisabled: boolean;
  onChange: (option: TargetOption) => void;
  onCancel: (option: TargetOption) => void;
}) {
  const pendingAction = useRef<'change' | 'cancel' | null>(null);

  return (
    <DropdownMenu
      onOpenChangeComplete={(isOpen) => {
        if (isOpen || !pendingAction.current) return;
        const action = pendingAction.current;
        pendingAction.current = null;
        if (action === 'change') onChange(option);
        else onCancel(option);
      }}
    >
      <DropdownMenuTrigger className="hover:bg-accent hover:text-accent-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-md">
        <MoreHorizontal className="text-muted-foreground size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <RoleGatedMenuItem
          requiredPermission={Permission.MembersOptionContractOperate}
          denyBadge="権限なし"
          disabled={changeDisabled || option.status !== 'active'}
          tooltip={changeTooltip}
          onClick={() => {
            pendingAction.current = 'change';
          }}
        >
          変更
        </RoleGatedMenuItem>
        <RoleGatedMenuItem
          requiredPermission={Permission.MembersOptionContractOperate}
          denyBadge="権限なし"
          className="text-destructive"
          disabled={
            cancelDisabled ||
            option.status === 'pending_cancel' ||
            option.status === 'cancelled' ||
            option.status === 'used'
          }
          onClick={() => {
            pendingAction.current = 'cancel';
          }}
        >
          解約
        </RoleGatedMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface OptionContractsCardProps {
  memberId: string;
  isOnLeave: boolean;
  isRetirePending: boolean;
  hasUnpaidFee: boolean;
  /** A withdrawn member keeps the history but accepts no new contract operation. */
  isWithdrawn: boolean;
  /** A-01 FR-007 edge case: block change/cancel during the cancellation-fee period (option only) */
  inCancellationPeriod: boolean;
}

type TargetOption = {
  id: string;
  optionId: string;
  name: string;
  monthlyFee: number;
  status: MemberOptionContractItemDto['contractStatus'];
};

/** Keyed by the real contract status: `pending_start` reads as 翌月適用, `pending_cancel` as 解約予定. */
const OPTION_STATUS_META: Record<
  MemberOptionContractItemDto['contractStatus'],
  { label: string; className: string }
> = {
  active: { label: '有効', className: 'border-success/20 bg-success/15 text-success' },
  pending_start: { label: '翌月適用', className: 'border-info/20 bg-info/15 text-info' },
  pending_cancel: {
    label: '解約予定',
    className: 'border-warning/20 bg-warning/15 text-warning',
  },
  cancelled: {
    label: '解約済み',
    className: 'border-muted-foreground/20 bg-muted text-muted-foreground',
  },
  used: {
    label: '使用済み',
    className: 'border-muted-foreground/20 bg-muted text-muted-foreground',
  },
};

/**
 * Tooltip on the disabled 変更 item, one per `switchBlockedReason`. The two usage-rule texts
 * (G-02 FR-005) are the prototype's; the prototype has no text for the other four.
 * Partial so a runtime `null` (the generated type drops `nullable`) looks up to no text.
 */
const SWITCH_BLOCKED_TOOLTIP: Partial<
  Record<MemberOptionContractItemDto['switchBlockedReason'], string>
> = {
  not_active: '有効なオプション契約のみ変更できます',
  option_not_found: 'オプションマスタが見つからないため変更できません',
  not_monthly: '月額のオプションのみ変更できます',
  locker: 'ロッカーオプションは変更できません',
  usability_unavailable: 'このオプションは利用不可（既存契約の継続のみ）のため変更できません',
  usability_add_cancel_only: 'このオプションは追加・解約のみ可能です（変更不可）',
};

export function OptionContractsCard({
  memberId,
  isOnLeave,
  isRetirePending,
  hasUnpaidFee,
  isWithdrawn,
  inCancellationPeriod,
}: OptionContractsCardProps) {
  const queryClient = useQueryClient();

  // Add sheet state
  const [showAddSheet, setShowAddSheet] = useState(false);
  // The whole choice is kept, not just its id: a server-side search swaps the dropdown's rows, so the
  // picked option may no longer be among them while its label and price are still on screen.
  const [selectedOptionChoice, setSelectedOptionChoice] = useState<OptionChoice | null>(null);
  const selectedOptionId = selectedOptionChoice?.value ?? '';
  // A-01 FR-007: the start is 今日から or 翌月から only — no arbitrary date
  // (v7: nothing is preselected — the operator has to choose one)
  const [optionTiming, setOptionTiming] = useState<'today' | 'next_month' | ''>('');
  // A-01 FR-017: an addition entered at the counter is always filed on the member's behalf
  const [addProxyAgreedAt, setAddProxyAgreedAt] = useState<Date | undefined>(undefined);
  const [addProxyMethod, setAddProxyMethod] = useState<ProxyApplicationDto['agreementMethod'] | ''>(
    '',
  );

  // Change sheet state
  const [showChangeSheet, setShowChangeSheet] = useState(false);
  const [targetOption, setTargetOption] = useState<TargetOption | null>(null);
  const [optionChangeToChoice, setOptionChangeToChoice] = useState<OptionChoice | null>(null);
  const optionChangeToId = optionChangeToChoice?.value ?? '';
  // A-01 FR-017: an option change entered at the counter is always filed on the member's behalf
  const [changeProxyAgreedAt, setChangeProxyAgreedAt] = useState<Date | undefined>(undefined);
  const [changeProxyMethod, setChangeProxyMethod] = useState<
    ProxyApplicationDto['agreementMethod'] | ''
  >('');

  // Keyword typed into the option dropdowns — filtered client-side (no server-side search).
  const [optionSearch, setOptionSearch] = useState('');
  // Cancel sheet state
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [optionCancelTiming, setOptionCancelTiming] =
    useState<CancelOptionContractDto['cancellationTiming']>('immediate');
  const [optionCancelReason, setOptionCancelReason] = useState('');
  // A-01 FR-017: a cancellation entered at the counter is always filed on the member's behalf
  const [cancelProxyAgreedAt, setCancelProxyAgreedAt] = useState<Date | undefined>(undefined);
  const [cancelProxyMethod, setCancelProxyMethod] = useState<
    ProxyApplicationDto['agreementMethod'] | ''
  >('');

  const [requestedOptionContractsPage, setOptionContractsPage] = useState(1);
  const {
    data: optionContractsResponse,
    isLoading: isOptionContractsLoading,
    isError: isOptionContractsError,
    refetch: refetchOptionContracts,
  } = useQuery({
    ...adminMemberContractOpsControllerListOptionContractsOptions({
      path: { memberId },
      query: { page: requestedOptionContractsPage, limit: PAGE_SIZE },
    }),
    placeholderData: keepPreviousData,
  });
  const optionContracts = optionContractsResponse?.items;
  const optionContractsPagination = optionContractsResponse?.pagination;
  // Cancelling the last row of the last page leaves it empty; step back onto the new last page.
  if (
    optionContractsPagination &&
    requestedOptionContractsPage > optionContractsPagination.totalPages
  ) {
    setOptionContractsPage(optionContractsPagination.totalPages);
  }

  // A-01 FR-007 edge cases, per operation: suspended / pending withdrawal block everything; an
  // unpaid fee blocks add and change; the cancellation-fee period forbids cancelling an option on
  // its own (G-02), and a change cancels the source next month, so it blocks change and cancel.
  const memberBlocked = isOnLeave || isRetirePending || isWithdrawn;
  const optionAddBlocked = memberBlocked || hasUnpaidFee;
  const optionChangeBlocked = memberBlocked || hasUnpaidFee || inCancellationPeriod;
  const optionCancelBlocked = memberBlocked || inCancellationPeriod;

  const { data: memberData } = useQuery(
    adminMemberControllerDetailOptions({
      path: { memberId },
    }),
  );
  // Plans and options are sold per store (G-01 FR-S002 販売設定), and the store that counts is the one
  // the main contract is held at (A-01: 移籍 = 主契約締結店舗を変更すること; the switch DTO checks "the
  // contract store's sales list"). `primaryStore` is not necessarily that store and can be null.
  const storeId = memberData?.currentMainContract?.store?.storeId;
  // E-02 FR-016 / G-02 FR-002 (prototype 11/12): an option whose areas' gender condition the member
  // does not meet is offered neither as an addition nor as a change target (API: 422 E-ARE-003).
  // The list endpoint leaves those out itself, before paging.
  const memberGender = toMemberGenderFilter(memberData?.personalInfo?.gender);
  // The option contract hangs off the main contract, so its id is part of the add request.
  const { data: mainContractResponse } = useQuery({
    ...adminMemberContractOpsControllerMainContractOptions({ path: { memberId } }),
    enabled: showAddSheet,
  });
  const mainContractId = mainContractResponse?.mainContract?.contractId;
  // The option master is read per store (Y-02-02 販売設定). Without a store the query never runs, and
  // the dropdown's default 「ありません」 would blame an empty master for what is really a missing store.
  const optionMasterUnavailable = !storeId;
  // The option master feeds BOTH the add sheet and the change sheet, so it has to be enabled for
  // either one — gating it on the add sheet alone leaves 変更先オプション empty.
  // `addable` drops unavailable / change_cancel_only options server-side; neither list may offer
  // them (A-01 FR-007, G-02 FR-005).
  // The master is searched server-side (`keyword` matches name and code) and paged by the
  // dropdown's own infinite scroll, so only the rows being looked at are ever fetched.
  const {
    data: storeOptionsData,
    isLoading: isStoreOptionsLoading,
    isError: isStoreOptionsError,
    refetch: refetchStoreOptions,
    fetchNextPage: fetchMoreStoreOptions,
    hasNextPage: hasMoreStoreOptions,
    isFetchingNextPage: isFetchingMoreStoreOptions,
  } = useInfiniteQuery({
    ...adminStoreSettingsControllerListOptionsInfiniteOptions({
      path: { id: storeId ?? '' },
      query: {
        enabled: true,
        addable: true,
        keyword: optionSearch || undefined,
        memberGender,
        limit: PAGE_SIZE,
      },
    }),
    enabled: Boolean(storeId) && (showAddSheet || showChangeSheet),
    // Keep the rows on screen while a new keyword loads, so the open dropdown does not blank out.
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreOptionListResponseDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < (lastPage.pagination?.totalPages ?? 0) ? currentPage + 1 : undefined;
    },
  });
  const allAvailableOptions = useMemo<OptionChoice[]>(
    () =>
      storeOptionsData?.pages.flatMap((page) =>
        page.items.map((option) => ({
          value: option.optionId,
          label: option.name,
          price: option.fee,
          // 説明 under the dropdown is the option master's own description (null when unset).
          description: option.description ?? '',
          prorated: option.proratedEnabled,
        })),
      ) ?? [],
    [storeOptionsData],
  );
  // The table above is paged, so it cannot say which options the member holds. The exclusion list
  // has its own query: every live contract (`liveOnly` = pending_start / active / pending_cancel,
  // the rows the server's duplicate check E-OPT-005 counts), read page by page until exhausted.
  const {
    data: liveContractsData,
    isPending: isLiveContractsPending,
    isError: isLiveContractsError,
    hasNextPage: hasMoreLiveContracts,
    isFetchingNextPage: isFetchingMoreLiveContracts,
    fetchNextPage: fetchMoreLiveContracts,
    refetch: refetchLiveContracts,
  } = useInfiniteQuery({
    ...adminMemberContractOpsControllerListOptionContractsInfiniteOptions({
      path: { memberId },
      query: { liveOnly: true, limit: LIVE_CONTRACTS_PAGE_SIZE },
    }),
    enabled: showAddSheet || showChangeSheet,
    initialPageParam: 1,
    getNextPageParam: (lastPage: MemberOptionContractListDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < (lastPage.pagination?.totalPages ?? 0) ? currentPage + 1 : undefined;
    },
  });
  // A failed page leaves `hasNextPage` true, so stop on error; the 再読み込み button retries.
  useEffect(() => {
    if (hasMoreLiveContracts && !isFetchingMoreLiveContracts && !isLiveContractsError) {
      void fetchMoreLiveContracts();
    }
  }, [
    hasMoreLiveContracts,
    isFetchingMoreLiveContracts,
    isLiveContractsError,
    fetchMoreLiveContracts,
  ]);
  // Until every page is in, the set is incomplete, so the pickers stay locked rather than offer a
  // held option.
  const isContractedOptionsLoading =
    (showAddSheet || showChangeSheet) && (isLiveContractsPending || hasMoreLiveContracts);
  const contractedOptionsUnavailable = isLiveContractsError;
  const contractedOptionIds = new Set(
    liveContractsData?.pages.flatMap((page) => page.items.map((o) => o.option.optionId)) ?? [],
  );
  const availableOptions = allAvailableOptions.filter((o) => !contractedOptionIds.has(o.value));
  // Change-target options: exclude the option being changed and any option already held (E-OPT-005)
  const optionChangeCandidates = allAvailableOptions.filter(
    (o) => o.value !== targetOption?.optionId && !contractedOptionIds.has(o.value),
  );
  // Held options are dropped after the server has paged the master, so a page made up only of held
  // options leaves the list empty; an empty list renders no scroll sentinel, so the next page has to
  // be requested here or the remaining options could never be reached. A failed page leaves
  // `hasNextPage` true, so stop on error and let the operator retry instead of looping on it.
  const hiddenPageBlocksPicker =
    (showAddSheet || showChangeSheet) &&
    !isStoreOptionsLoading &&
    !isContractedOptionsLoading &&
    hasMoreStoreOptions &&
    !isStoreOptionsError &&
    (showChangeSheet ? optionChangeCandidates : availableOptions).length === 0;
  useEffect(() => {
    if (hiddenPageBlocksPicker && !isFetchingMoreStoreOptions) void fetchMoreStoreOptions();
  }, [hiddenPageBlocksPicker, isFetchingMoreStoreOptions, fetchMoreStoreOptions]);
  // Prototype: with nothing left to offer (every page read, no keyword typed) the picker is
  // disabled and says so in its placeholder instead of opening onto an empty list.
  const isCandidateListSettled =
    Boolean(storeId) &&
    !optionSearch &&
    !isStoreOptionsLoading &&
    !isContractedOptionsLoading &&
    !hasMoreStoreOptions &&
    !isStoreOptionsError &&
    !contractedOptionsUnavailable;
  const noAddCandidates = isCandidateListSettled && availableOptions.length === 0;
  const noChangeCandidates = isCandidateListSettled && optionChangeCandidates.length === 0;

  const selectedOptionData = selectedOptionChoice;

  const { todayLabel, nextMonthLabel, nextMonthFirstLabel } = getDateLabels(
    selectedOptionData?.prorated,
  );
  const addAgreedAtError = getProxyAgreedAtError(addProxyAgreedAt);
  const changeAgreedAtError = getProxyAgreedAtError(changeProxyAgreedAt);
  const cancelAgreedAtError = getProxyAgreedAtError(cancelProxyAgreedAt);

  const invalidateContractQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminMemberContractOpsControllerListOptionContractsQueryKey({
          path: { memberId },
        }),
      }),
      // 契約サマリー (月額合計) and the head-up bundle aggregate the option contracts too
      queryClient.invalidateQueries({
        queryKey: adminMemberContractOpsControllerContractSummaryQueryKey({ path: { memberId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      }),
    ]);
  };

  // One operation at a time: `isPending` flips only after a render, so a double-click could
  // otherwise fire the same request twice.
  const { acquire, release } = useSingleFlight();

  const { mutate: submitAddOption, isPending: isAddingOption } = useMutation({
    ...adminMemberContractOpsControllerAddOptionContractMutation(),
    onSettled: release,
    onSuccess: async () => {
      toast.success('オプション契約を追加しました');
      await invalidateContractQueries();
      setShowAddSheet(false);
      setSelectedOptionChoice(null);
      setOptionTiming('');
      setAddProxyAgreedAt(undefined);
      setAddProxyMethod('');
    },
  });

  const { mutate: submitChangeOption, isPending: isChangingOption } = useMutation({
    ...adminMemberContractOpsControllerSwitchOptionContractMutation(),
    onSettled: release,
    onSuccess: async () => {
      toast.success('オプション契約を変更しました');
      await invalidateContractQueries();
      setShowChangeSheet(false);
      setTargetOption(null);
      setOptionChangeToChoice(null);
      setChangeProxyAgreedAt(undefined);
      setChangeProxyMethod('');
    },
  });

  const { mutate: submitCancelOption, isPending: isCancellingOption } = useMutation({
    ...adminMemberContractOpsControllerCancelOptionContractMutation(),
    onSettled: release,
    onSuccess: async () => {
      toast.success('オプション契約を解約しました');
      await invalidateContractQueries();
      setShowCancelSheet(false);
      setTargetOption(null);
      setOptionCancelTiming('immediate');
      setOptionCancelReason('');
      setCancelProxyAgreedAt(undefined);
      setCancelProxyMethod('');
    },
  });

  const handleOptionAdd = () => {
    setSelectedOptionChoice(null);
    setOptionTiming('');
    setAddProxyAgreedAt(undefined);
    setAddProxyMethod('');
    setShowAddSheet(true);
  };

  const handleOptionChange = (opt: TargetOption) => {
    setTargetOption(opt);
    setOptionChangeToChoice(null);
    setChangeProxyAgreedAt(undefined);
    setChangeProxyMethod('');
    setShowChangeSheet(true);
  };

  const handleOptionCancel = (opt: TargetOption) => {
    setTargetOption(opt);
    setOptionCancelTiming('immediate');
    setOptionCancelReason('');
    setCancelProxyAgreedAt(undefined);
    setCancelProxyMethod('');
    setShowCancelSheet(true);
  };

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">オプション契約</CardTitle>
            <RoleGatedButton
              requiredPermission={Permission.MembersOptionContractOperate}
              denyTooltip="オプション操作の権限がありません"
              variant="outline"
              size="sm"
              disabled={optionAddBlocked}
              onClick={handleOptionAdd}
            >
              + 追加
            </RoleGatedButton>
          </div>
        </CardHeader>

        {isOnLeave && (
          <div className="px-4 pb-3">
            <Alert className="border-warning/20 bg-warning/10">
              <AlertDescription className="text-warning text-xs">
                休会中はオプション契約の変更・追加・解約ができません
              </AlertDescription>
            </Alert>
          </div>
        )}
        {isRetirePending && !isOnLeave && (
          <div className="px-4 pb-3">
            <Alert className="border-warning/20 bg-warning/10">
              <AlertDescription className="text-warning text-xs">
                退会予定のため、オプション契約の変更・追加・解約はできません
              </AlertDescription>
            </Alert>
          </div>
        )}
        {hasUnpaidFee && !isOnLeave && !isRetirePending && (
          <div className="px-4 pb-3">
            <Alert className="border-destructive/30 bg-destructive/10">
              <AlertDescription className="text-destructive text-xs">
                未納金があるため、オプションの追加・変更はできません
              </AlertDescription>
            </Alert>
          </div>
        )}
        {inCancellationPeriod && !isOnLeave && !isRetirePending && (
          <div className="px-4 pb-3">
            <Alert className="border-warning/20 bg-warning/10">
              <AlertDescription className="text-warning text-xs">
                解約手数料期間中のため、オプションの変更・解約はできません
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DataStateBoundary
          isLoading={isOptionContractsLoading}
          isError={isOptionContractsError}
          isEmpty={!optionContracts}
          onRetry={() => refetchOptionContracts()}
          errorTitle="オプション契約の取得に失敗しました"
          skeleton={
            <div className="space-y-3 px-4 pb-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`option-contract-row-${index}`} className="h-9 w-full" />
              ))}
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">オプション名</TableHead>
                <TableHead className="text-right text-xs font-semibold">月額</TableHead>
                <TableHead className="text-xs font-semibold">適用開始日</TableHead>
                <TableHead className="text-xs font-semibold">状態</TableHead>
                <TableHead className="w-10 text-xs font-semibold" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {optionContracts && optionContracts.length > 0 ? (
                optionContracts.map((opt) => {
                  const { option: master } = opt;
                  return (
                    <TableRow key={opt.optionContractId}>
                      <TableCell className="text-sm font-medium">
                        <span className="block max-w-36 truncate" title={master.name ?? undefined}>
                          {master.name ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatYen(opt.monthlyFee ?? 0)}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(opt.startDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${OPTION_STATUS_META[opt.contractStatus].className}`}
                        >
                          {OPTION_STATUS_META[opt.contractStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <OptionRowActions
                          option={{
                            id: opt.optionContractId,
                            optionId: master.optionId,
                            name: master.name ?? '',
                            monthlyFee: opt.monthlyFee ?? 0,
                            status: opt.contractStatus,
                          }}
                          changeDisabled={optionChangeBlocked || !opt.switchable}
                          changeTooltip={
                            opt.switchable
                              ? undefined
                              : SWITCH_BLOCKED_TOOLTIP[opt.switchBlockedReason]
                          }
                          cancelDisabled={optionCancelBlocked}
                          onChange={handleOptionChange}
                          onCancel={handleOptionCancel}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-6 text-center text-sm">
                    オプション契約はありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataStateBoundary>
        {optionContractsPagination && optionContractsPagination.totalPages > 1 && (
          <TablePagination
            currentPage={optionContractsPagination.page}
            totalPages={optionContractsPagination.totalPages}
            total={optionContractsPagination.totalItems}
            limit={optionContractsPagination.limit}
            onPageChange={setOptionContractsPage}
          />
        )}
      </Card>

      {/* Option change Sheet */}
      <Sheet open={showChangeSheet} onOpenChange={setShowChangeSheet}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <RefreshCw className="size-4" />
                オプション変更
              </SheetTitle>
              <SheetDescription className="sr-only">オプション変更フォーム</SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col gap-4 py-4">
              <div>
                <p className="text-muted-foreground mb-1 text-xs">現在のオプション</p>
                <p className="text-sm font-medium">
                  {targetOption
                    ? `${targetOption.name}　${formatYen(targetOption.monthlyFee)}/月`
                    : '—'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="option-change-to" className="text-sm font-medium">
                  変更先オプション <span className="text-destructive ml-1 text-xs">*</span>
                </Label>
                <SearchableSelect<OptionChoice>
                  value={optionChangeToId || null}
                  options={optionChangeCandidates}
                  placeholder={
                    noChangeCandidates ? '変更できるオプションはありません' : '選択してください'
                  }
                  searchPlaceholder="オプション名で検索..."
                  emptyMessage={
                    optionMasterUnavailable
                      ? '所属店舗が未設定のため、オプションを取得できません'
                      : '変更できるオプションはありません'
                  }
                  loadingMessage="オプションを読み込み中..."
                  triggerClassName="h-9 w-full text-sm"
                  disabled={
                    isStoreOptionsLoading ||
                    isContractedOptionsLoading ||
                    contractedOptionsUnavailable ||
                    noChangeCandidates
                  }
                  isLoading={
                    isStoreOptionsLoading || isContractedOptionsLoading || hiddenPageBlocksPicker
                  }
                  onSearchChange={setOptionSearch}
                  valueLabel={optionChangeToChoice?.label}
                  onSelect={setOptionChangeToChoice}
                  getOptionKey={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  renderOption={(option) => (
                    <span className="flex w-full min-w-0 items-center justify-between gap-2">
                      <TextWithTooltip
                        text={option.label}
                        wrapperClassName="min-w-0 flex-1"
                        className="w-full text-left"
                        side="right"
                        align="center"
                      />
                      <span className="shrink-0">{formatYen(option.price)}/月</span>
                    </span>
                  )}
                  hasMore={hasMoreStoreOptions && !isStoreOptionsError}
                  isLoadingMore={isFetchingMoreStoreOptions}
                  onLoadMore={fetchMoreStoreOptions}
                  loadingMoreMessage="読み込み中..."
                />
                {isStoreOptionsError && (
                  <OptionsFetchError
                    message="オプションを取得できませんでした。"
                    onRetry={() => void refetchStoreOptions()}
                  />
                )}
                {contractedOptionsUnavailable && (
                  <OptionsFetchError
                    message="契約中のオプションを取得できませんでした。"
                    onRetry={() => void refetchLiveContracts()}
                  />
                )}
              </div>

              <ProxyApplicationSection
                alwaysProxy
                agreedAt={changeProxyAgreedAt}
                onAgreedAtChange={setChangeProxyAgreedAt}
                method={changeProxyMethod}
                onMethodChange={setChangeProxyMethod}
                agreedAtError={changeAgreedAtError}
              />

              <Alert className="border-info/20 bg-info/10">
                <AlertDescription className="text-info text-xs">
                  変更は翌月月初（{nextMonthFirstLabel}）から適用されます
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t px-6 py-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowChangeSheet(false)}>
              キャンセル
            </Button>
            <Button
              className="flex-1"
              disabled={
                optionChangeBlocked ||
                !optionChangeToId ||
                !targetOption ||
                !changeProxyAgreedAt ||
                Boolean(changeAgreedAtError) ||
                !changeProxyMethod ||
                isChangingOption
              }
              onClick={() => {
                if (!targetOption || !changeProxyAgreedAt || !changeProxyMethod) return;
                if (!acquire()) return;
                submitChangeOption({
                  path: { memberId, optionContractId: targetOption.id },
                  body: {
                    toOptionId: optionChangeToId,
                    // `crm_direct` is rejected here (API-094): a counter operation is always a
                    // proxy filing.
                    applicationSource: 'proxy',
                    proxy: {
                      agreementAt: changeProxyAgreedAt.toISOString(),
                      agreementMethod: changeProxyMethod,
                    },
                  },
                });
              }}
            >
              {isChangingOption ? '送信中...' : '変更'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Option cancellation Sheet */}
      <Sheet open={showCancelSheet} onOpenChange={setShowCancelSheet}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldOff className="size-4" />
                オプション解約
              </SheetTitle>
              <SheetDescription className="sr-only">オプション解約フォーム</SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col gap-4 py-4">
              <div>
                <p className="text-muted-foreground mb-1 text-xs">解約対象</p>
                <p className="text-sm font-medium">
                  {targetOption
                    ? `${targetOption.name}　${formatYen(targetOption.monthlyFee)}/月`
                    : '—'}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium">
                  解約タイミング <span className="text-destructive ml-1 text-xs">*</span>
                </Label>
                <RadioGroup
                  value={optionCancelTiming}
                  onValueChange={(v) =>
                    setOptionCancelTiming(v as CancelOptionContractDto['cancellationTiming'])
                  }
                  className="flex flex-col gap-2"
                >
                  <label
                    htmlFor="cancel-timing-immediate"
                    className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors ${
                      optionCancelTiming === 'immediate'
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <RadioGroupItem
                      id="cancel-timing-immediate"
                      value="immediate"
                      className="mt-0.5"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">即時解約</span>
                      <span className="text-muted-foreground text-xs">本日付で解約</span>
                    </div>
                  </label>
                  <label
                    htmlFor="cancel-timing-next"
                    className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors ${
                      optionCancelTiming === 'next_month'
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <RadioGroupItem
                      id="cancel-timing-next"
                      value="next_month"
                      className="mt-0.5"
                      disabled={targetOption?.status === 'pending_start'}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">当月末で解約</span>
                      <span className="text-muted-foreground text-xs">翌月から利用不可</span>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>

            <Separator className="-mx-6 w-[calc(100%+48px)]" />

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="option-cancel-reason" className="text-sm font-medium">
                  解約理由 <span className="text-muted-foreground ml-1 text-xs">任意</span>
                </Label>
                <Textarea
                  id="option-cancel-reason"
                  rows={3}
                  maxLength={STATUS_CHANGE_REASON_MAX_LENGTH}
                  className="resize-none text-sm"
                  value={optionCancelReason}
                  onChange={(e) => setOptionCancelReason(e.target.value)}
                />
              </div>
              {/* A-01 FR-017 / API-094: a cancellation entered in the CRM is always filed on the
                  member's behalf, so the agreement evidence is collected unconditionally — the API
                  rejects `crm_direct` and there is no staff-direct source to fall back on. */}
              <ProxyApplicationSection
                alwaysProxy
                agreedAt={cancelProxyAgreedAt}
                onAgreedAtChange={setCancelProxyAgreedAt}
                method={cancelProxyMethod}
                onMethodChange={setCancelProxyMethod}
                agreedAtError={cancelAgreedAtError}
              />

              <Alert className="border-warning/20 bg-warning/10">
                <AlertDescription className="text-warning text-xs">
                  解約後の再追加は翌月以降になります
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t px-6 py-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelSheet(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (!targetOption || !cancelProxyAgreedAt || !cancelProxyMethod) return;
                if (!acquire()) return;
                submitCancelOption({
                  path: { memberId, optionContractId: targetOption.id },
                  body: {
                    cancellationTiming: optionCancelTiming,
                    memo: optionCancelReason.trim() || undefined,
                    // `crm_direct` is rejected here (API-094): a cancellation is the member's
                    // decision, so a counter operation is always a proxy filing.
                    applicationSource: 'proxy',
                    proxy: {
                      agreementAt: cancelProxyAgreedAt.toISOString(),
                      agreementMethod: cancelProxyMethod,
                    },
                  },
                });
              }}
              disabled={
                optionCancelBlocked ||
                !targetOption ||
                !cancelProxyAgreedAt ||
                Boolean(cancelAgreedAtError) ||
                !cancelProxyMethod ||
                isCancellingOption
              }
            >
              {isCancellingOption ? '送信中...' : '解約'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Option add Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <Plus className="size-4" />
                オプション追加
              </SheetTitle>
              <SheetDescription className="sr-only">オプション追加フォーム</SheetDescription>
            </SheetHeader>
          </div>

          {/* No 未納金 alert here: the 追加 button is already disabled in that case (FR-007),
              so the sheet can never be opened while an unpaid fee exists. */}
          <div className="flex-1 overflow-y-auto px-6">
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="option-select" className="text-sm font-medium">
                  追加するオプション <span className="text-destructive ml-1 text-xs">*</span>
                </Label>
                <SearchableSelect<OptionChoice>
                  value={selectedOptionId || null}
                  options={availableOptions}
                  placeholder={
                    noAddCandidates ? '追加できるオプションはありません' : '選択してください'
                  }
                  searchPlaceholder="オプション名で検索..."
                  emptyMessage={
                    optionMasterUnavailable
                      ? '所属店舗が未設定のため、オプションを取得できません'
                      : '追加できるオプションはありません'
                  }
                  loadingMessage="オプションを読み込み中..."
                  triggerClassName="h-9 w-full text-sm"
                  disabled={
                    isStoreOptionsLoading ||
                    isContractedOptionsLoading ||
                    contractedOptionsUnavailable ||
                    noAddCandidates
                  }
                  isLoading={
                    isStoreOptionsLoading || isContractedOptionsLoading || hiddenPageBlocksPicker
                  }
                  onSearchChange={setOptionSearch}
                  valueLabel={selectedOptionChoice?.label}
                  onSelect={setSelectedOptionChoice}
                  getOptionKey={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  renderOption={(option) => (
                    <span className="flex w-full min-w-0 items-center justify-between gap-2">
                      <TextWithTooltip
                        text={option.label}
                        wrapperClassName="min-w-0 flex-1"
                        className="w-full text-left"
                        side="right"
                        align="center"
                      />
                      <span className="shrink-0">{formatYen(option.price)}/月</span>
                    </span>
                  )}
                  hasMore={hasMoreStoreOptions && !isStoreOptionsError}
                  isLoadingMore={isFetchingMoreStoreOptions}
                  onLoadMore={fetchMoreStoreOptions}
                  loadingMoreMessage="読み込み中..."
                />
                {isStoreOptionsError && (
                  <OptionsFetchError
                    message="オプションを取得できませんでした。"
                    onRetry={() => void refetchStoreOptions()}
                  />
                )}
                {contractedOptionsUnavailable && (
                  <OptionsFetchError
                    message="契約中のオプションを取得できませんでした。"
                    onRetry={() => void refetchLiveContracts()}
                  />
                )}
              </div>

              {selectedOptionData && (
                <div className="bg-muted/40 flex flex-col gap-1 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium wrap-anywhere">
                      {selectedOptionData.label}
                    </p>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatYen(selectedOptionData.price)}/月
                    </p>
                  </div>
                  {selectedOptionData.description ? (
                    <p className="text-muted-foreground text-xs">
                      {selectedOptionData.description}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <Separator className="-mx-6 w-[calc(100%+48px)]" />

            <div className="flex flex-col gap-3 py-4">
              <Label className="text-sm font-medium">
                開始タイミング <span className="text-destructive ml-1 text-xs">*</span>
              </Label>
              <RadioGroup
                value={optionTiming}
                onValueChange={(v) => setOptionTiming(v as 'today' | 'next_month')}
                className="flex flex-col gap-2"
              >
                <label
                  htmlFor="timing-today"
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors ${
                    optionTiming === 'today' ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <RadioGroupItem id="timing-today" value="today" className="mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">今日から</span>
                    <span className="text-muted-foreground text-xs">{todayLabel}</span>
                  </div>
                </label>
                <label
                  htmlFor="timing-next"
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors ${
                    optionTiming === 'next_month' ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <RadioGroupItem id="timing-next" value="next_month" className="mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">翌月から</span>
                    <span className="text-muted-foreground text-xs">{nextMonthLabel}</span>
                  </div>
                </label>
              </RadioGroup>
              {optionTiming === 'today' && selectedOptionData?.prorated && (
                <Alert className="border-info/20 bg-info/15">
                  <AlertDescription className="text-info text-xs">
                    JACCS契約の場合、月途中加入の日割り分は翌月の月額料金に合算して請求されます。
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator className="-mx-6 w-[calc(100%+48px)]" />

            <div className="py-4">
              <ProxyApplicationSection
                alwaysProxy
                agreedAt={addProxyAgreedAt}
                onAgreedAtChange={setAddProxyAgreedAt}
                method={addProxyMethod}
                onMethodChange={setAddProxyMethod}
                agreedAtError={addAgreedAtError}
              />
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t px-6 py-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddSheet(false)}>
              キャンセル
            </Button>
            <Button
              className="flex-1"
              disabled={
                optionAddBlocked ||
                !selectedOptionId ||
                !optionTiming ||
                !mainContractId ||
                !storeId ||
                !addProxyAgreedAt ||
                Boolean(addAgreedAtError) ||
                !addProxyMethod ||
                isAddingOption
              }
              onClick={() => {
                if (
                  !optionTiming ||
                  !mainContractId ||
                  !storeId ||
                  !addProxyAgreedAt ||
                  !addProxyMethod
                )
                  return;
                if (!acquire()) return;
                submitAddOption({
                  path: { memberId },
                  body: {
                    contractId: mainContractId,
                    optionId: selectedOptionId,
                    // The API accepts only today (JST) or the 1st of next month (E-OPT-007)
                    startDate:
                      optionTiming === 'today'
                        ? formatISODateLocal(new Date())
                        : nextMonthStartISO(),
                    storeId,
                    applicationSource: 'proxy',
                    proxy: {
                      agreementAt: addProxyAgreedAt.toISOString(),
                      agreementMethod: addProxyMethod,
                    },
                  },
                });
              }}
            >
              {isAddingOption ? '送信中...' : 'オプションを追加'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
