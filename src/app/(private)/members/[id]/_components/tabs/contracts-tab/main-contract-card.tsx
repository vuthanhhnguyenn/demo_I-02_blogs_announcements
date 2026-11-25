'use client';

import { useEffect, useState } from 'react';

import { toMemberGenderFilter } from '@/app/(private)/area-master/_utils/area-gender.util';
import {
  formatDate,
  formatNextMonthStart,
  formatYen,
  nextMonthStartISO,
} from '@/utils/format.util';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

import {
  adminMemberContractOpsControllerContractSummaryQueryKey,
  adminMemberContractOpsControllerCreatePlanChangeMutation,
  adminMemberContractOpsControllerMainContractOptions,
  adminMemberContractOpsControllerMainContractQueryKey,
  adminMemberControllerDetailOptions,
  adminMemberControllerDetailQueryKey,
  adminStoreSettingsControllerListPlansInfiniteOptions,
  adminStoreSettingsControllerListPlansOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  MemberMainContractDetailDto,
  StorePlanListResponseDto,
} from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { UserRole } from '@/types/permission.type';

import {
  type ProxyAgreementMethod,
  ProxyApplicationSection,
} from '../../proxy-application-section';
import { getProxyAgreedAtError } from './proxy-agreed-at.util';

/** Server caps `limit` at 100; the dropdown then pulls the remaining pages itself. */
const STORE_PLANS_PAGE_SIZE = 100;

const MAIN_CONTRACT_CHANGE_ROLES = [UserRole.Headquarter, UserRole.System] as const;

/**
 * The contract read carries three states; the 状態 column used to render a fixed 有効 badge, so a
 * 休会 or 解約済み contract still read as active.
 */
const MAIN_CONTRACT_STATUS_META: Record<
  MemberMainContractDetailDto['contractStatus'],
  { label: string; className: string }
> = {
  active: { label: '有効', className: 'border-success/20 bg-success/15 text-success' },
  suspended: { label: '休会中', className: 'border-warning/20 bg-warning/15 text-warning' },
  cancelled: {
    label: '解約済み',
    className: 'border-muted-foreground/20 bg-muted text-muted-foreground',
  },
};

interface MainContractCardProps {
  memberId: string;
}

function MainContractCardSkeleton() {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">主契約</CardTitle>
          <Skeleton className="h-8 w-16" />
        </div>
      </CardHeader>
      <div className="space-y-3 px-4 pb-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
  );
}

export function MainContractCard({ memberId }: MainContractCardProps) {
  const [open, setOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState('');
  // A-01 FR-017 evidence of the member's agreement — required, see the submit handler
  const [proxyAgreedAt, setProxyAgreedAt] = useState<Date | undefined>(undefined);
  const [proxyMethod, setProxyMethod] = useState<ProxyAgreementMethod | ''>('');
  const queryClient = useQueryClient();
  const {
    data: mainContractResponse,
    isLoading: isMainContractLoading,
    isFetching: isMainContractFetching,
    isError: isMainContractError,
    refetch: refetchMainContract,
  } = useQuery(
    adminMemberContractOpsControllerMainContractOptions({
      path: { memberId },
    }),
  );
  // The real endpoint wraps the contract in `{ mainContract }`.
  const mainContract = mainContractResponse?.mainContract;
  const {
    data: memberData,
    isLoading: isMemberLoading,
    isError: isMemberError,
    refetch: refetchMember,
  } = useQuery(
    adminMemberControllerDetailOptions({
      path: { memberId },
    }),
  );
  // Plans and options are sold per store (G-01 FR-S002 販売設定), and the store that counts is the one
  // the main contract is held at (A-01: 移籍 = 主契約締結店舗を変更すること; the switch DTO checks "the
  // contract store's sales list"). `primaryStore` is not necessarily that store and can be null.
  const storeId = memberData?.currentMainContract?.store?.storeId;
  // E-02 FR-016 / G-01 FR-M002 (prototype 11/12): a plan whose areas / 性別制限 the member's gender
  // does not meet is not offered (the API refuses it with 422 E-ARE-003). The list endpoint leaves
  // those out itself, before paging.
  const memberGender = toMemberGenderFilter(memberData?.personalInfo?.gender);
  // Only plans the store actually offers can be switched to. The endpoint is paginated and caps
  // `limit` at 100, so a single capped call would drop the tail of a long plan master with no
  // error at all; read it page by page instead.
  const {
    data: storeMainContracts,
    isLoading: isStoreMainContractsLoading,
    isError: isStorePlansError,
    refetch: refetchStorePlans,
    fetchNextPage: fetchMoreStorePlans,
    hasNextPage: hasMoreStorePlans,
    isFetchingNextPage: isFetchingMoreStorePlans,
  } = useInfiniteQuery({
    ...adminStoreSettingsControllerListPlansInfiniteOptions({
      path: { id: storeId ?? '' },
      query: { enabled: true, memberGender, limit: STORE_PLANS_PAGE_SIZE },
    }),
    enabled: Boolean(storeId) && open,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StorePlanListResponseDto, allPages) => {
      const currentPage = allPages.length;
      return currentPage < (lastPage.pagination?.totalPages ?? 0) ? currentPage + 1 : undefined;
    },
  });
  // The master carries no server-side search, so keep pulling the remaining pages while the sheet
  // is open — the dropdown picks from what it holds. A failed page leaves `hasNextPage` true, so
  // stop on error and let the operator retry instead of looping on the failing request.
  useEffect(() => {
    if (hasMoreStorePlans && !isFetchingMoreStorePlans && !isStorePlansError) {
      void fetchMoreStorePlans();
    }
  }, [hasMoreStorePlans, isFetchingMoreStorePlans, isStorePlansError, fetchMoreStorePlans]);
  /** The contract read, the head-up bundle and 契約サマリー all reflect a plan change. */
  const refreshContractQueries = () =>
    Promise.all([
      // The two real reads this card renders from — without these the banner keeps the
      // pre-change state until a reload.
      queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: adminMemberContractOpsControllerMainContractQueryKey({ path: { memberId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: adminMemberContractOpsControllerContractSummaryQueryKey({ path: { memberId } }),
      }),
    ]);

  const { acquire, release } = useSingleFlight();
  const { mutate: submitChangeMainContract, isPending: isChangingMainContract } = useMutation({
    ...adminMemberContractOpsControllerCreatePlanChangeMutation(),
    onSettled: release,
    onSuccess: async () => {
      // A-01 FR-013a: this registers an application — the plan itself changes at month start
      toast.success('主契約の変更申請を登録しました');
      await refreshContractQueries();
      setOpen(false);
    },
  });

  // Every fee here is tax-inclusive as the API stores it (API-087 v0.14).
  const currentMonthlyFee = mainContract?.plan.monthlyFee;
  // While 休会中 the member is billed the 休会費, the snapshot on the live recess application.
  const isSuspended = mainContract?.contractStatus === 'suspended';
  const suspensionFee = memberData?.currentMainContract?.activeSuspension?.fee;
  const currentSuspensionFee = isSuspended && suspensionFee != null ? suspensionFee : undefined;
  const planOptions =
    storeMainContracts?.pages.flatMap((page) =>
      page.items.map((contract) => ({
        value: contract.planId,
        label: contract.name,
        price: contract.priceMonthly,
      })),
    ) ?? [];
  // Exclude the plan the member is already on — matched by plan master ID. `contractId` is the
  // contract's own ID, a different key space, so comparing against it never excluded anything.
  const availablePlans = planOptions.filter((p) => p.value !== mainContract?.plan?.planId);
  const isStorePlansLoading = isStoreMainContractsLoading || isFetchingMoreStorePlans;
  // An empty list has two readings the operator must tell apart: the store sells nothing else, or
  // it does but not to this member's gender. Only then is the unfiltered list asked, and two rows
  // are enough to know whether a plan other than the current one exists.
  const isPlanListEmpty =
    Boolean(storeId) &&
    !isStorePlansError &&
    !isStoreMainContractsLoading &&
    !hasMoreStorePlans &&
    availablePlans.length === 0;
  const { data: unfilteredPlans, isLoading: isUnfilteredPlansLoading } = useQuery({
    ...adminStoreSettingsControllerListPlansOptions({
      path: { id: storeId ?? '' },
      query: { enabled: true, limit: 2 },
    }),
    enabled: open && isPlanListEmpty,
  });
  const noGenderMatchedPlan =
    unfilteredPlans?.items.some((p) => p.planId !== mainContract?.plan?.planId) ?? false;
  // The plan master is read per store (Y-02-02 販売設定), so with no store to ask for, the query never
  // runs and the dropdown would sit empty with nothing said. A-01 FR-005 異常系 asks for the reason to
  // be shown instead — the two cases read differently to the operator and must not look alike.
  const planListNotice = !storeId
    ? '所属店舗が未設定のため、変更先プランを取得できません'
    : isStorePlansError
      ? undefined
      : isPlanListEmpty && !isUnfilteredPlansLoading && !noGenderMatchedPlan
        ? '変更できるプランがありません'
        : undefined;
  const selectedContractData = planOptions.find((p) => p.value === selectedContractId);
  const planPriceDiff =
    selectedContractData && currentMonthlyFee !== undefined
      ? selectedContractData.price - currentMonthlyFee
      : null;

  // Read the reservation from the member detail, not from the contract read: the contract
  // read models it as a plan-change application (`toPlan` is `{ planId }` only, and its
  // `applicationSource` has no bulk value), and a bulk job never lands there at all — as of
  // 2026-08-28 it stays null while the member detail carries it. The member detail resolves
  // the destination plan (`name` / `code` / `monthlyFee`) and names the source.
  const pendingPlanChange = memberData?.currentMainContract?.pendingPlanChange;
  // A bulk change is an HQ instruction that is already booked; a single change is a
  // request that can still be withdrawn. Same field, different wording and controls
  // (backend design answer 2026-08-10, QA09 §2.2).
  const isBulkPlanChange = pendingPlanChange?.source === 'bulk_job';

  const nextMonthFirstLabel = formatNextMonthStart();
  const proxyAgreedAtError = getProxyAgreedAtError(proxyAgreedAt);

  // Dim the card while refetching instead of pushing an extra bar into the layout
  const showOverlay = isMainContractFetching && !isMainContractLoading;

  const handleOpen = () => {
    setSelectedContractId('');
    setProxyAgreedAt(undefined);
    setProxyMethod('');
    setOpen(true);
  };

  return (
    <>
      <DataStateBoundary
        isLoading={isMainContractLoading || isMemberLoading}
        isError={isMainContractError || isMemberError}
        isEmpty={!mainContract}
        onRetry={() => {
          void refetchMainContract();
          void refetchMember();
        }}
        errorTitle="主契約の取得に失敗しました"
        emptyTitle="主契約はありません"
        skeleton={<MainContractCardSkeleton />}
      >
        <Card className="relative gap-0 py-0">
          {showOverlay && (
            <div className="bg-background/40 pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <LoaderCircle className="text-muted-foreground size-6 animate-spin" />
            </div>
          )}
          <CardHeader className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">主契約</CardTitle>
                {memberData?.currentMainContract?.activeFeeAdjustment && (
                  <Badge variant="secondary" className="text-[10px]">
                    個別会費調整 適用中
                  </Badge>
                )}
              </div>
              <RoleGatedButton
                allowedRoles={MAIN_CONTRACT_CHANGE_ROLES}
                denyTooltip="主契約の変更は本部のみ可能です"
                variant="outline"
                size="sm"
                onClick={handleOpen}
              >
                変更
              </RoleGatedButton>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">プラン名</TableHead>
                <TableHead className="text-right text-xs font-semibold">月額</TableHead>
                <TableHead className="text-xs font-semibold">適用開始日</TableHead>
                {/* The basis of the 入会取り消し / 退会取り消し gates (header-actions FR-020, FR-026) */}
                <TableHead className="text-xs font-semibold">利用開始日</TableHead>
                <TableHead className="text-xs font-semibold">状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={cn('transition-opacity', showOverlay && 'opacity-50')}>
              <TableRow>
                <TableCell className="text-sm font-medium">
                  <span className="block max-w-36 truncate" title={mainContract?.plan?.name}>
                    {mainContract?.plan?.name}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {isSuspended ? (
                    <div className="flex flex-col items-end">
                      <span>{formatYen(currentSuspensionFee)}</span>
                      <span className="text-muted-foreground text-[10px]">
                        休会費（通常 {formatYen(currentMonthlyFee)}）
                      </span>
                    </div>
                  ) : (
                    formatYen(currentMonthlyFee)
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(mainContract?.planAppliedFrom)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(mainContract?.usageStartDate)}
                </TableCell>
                <TableCell>
                  {mainContract && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${MAIN_CONTRACT_STATUS_META[mainContract.contractStatus].className}`}
                    >
                      {MAIN_CONTRACT_STATUS_META[mainContract.contractStatus].label}
                      {isSuspended &&
                        mainContract.recessEndDate &&
                        `（〜${formatDate(mainContract.recessEndDate)}）`}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {/* A-01 FR-013a: a submitted change stays pending until the month-start run, so the
              card states what will happen. Read-only — no source of requirements (A-01 FR-006,
              the approved design doc, qa-137) defines a cancel operation for a pending
              application, so the CRM does not offer one. */}
          {pendingPlanChange && (
            <div className="px-4 pb-4">
              <Alert className="border-info/20 bg-info/10">
                <AlertDescription className="text-info text-xs">
                  {pendingPlanChange.toPlan.name ?? '—'}
                  {/* Same tax basis as the 月額 column above, so the two figures compare */}
                  {pendingPlanChange.toPlan.monthlyFee !== null &&
                    `（${formatYen(pendingPlanChange.toPlan.monthlyFee)}/月）`}
                  へ{isBulkPlanChange ? '変更予約済み' : '変更申請中'} —{' '}
                  {formatDate(pendingPlanChange.scheduledChangeDate)}から適用
                  {isBulkPlanChange && '（本部の一括変更）'}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </Card>
      </DataStateBoundary>

      {/* Main-contract change Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <RefreshCw className="size-4" />
                主契約変更
              </SheetTitle>
              <SheetDescription className="sr-only">主契約変更フォーム</SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="py-4">
              <div className="bg-muted/40 rounded-md p-3">
                <p className="text-muted-foreground mb-2 text-xs font-medium">現在の契約</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium wrap-anywhere">
                    {mainContract?.plan?.name ?? '—'}
                  </p>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatYen(currentMonthlyFee)}/月
                  </p>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  適用開始日: {formatDate(mainContract?.planAppliedFrom)}
                </p>
              </div>
            </div>

            <Separator className="-mx-6 w-[calc(100%+48px)]" />

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="plan-select" className="text-sm font-medium">
                  変更先プラン <span className="text-destructive ml-1 text-xs">*</span>
                </Label>
                <Select
                  value={selectedContractId}
                  onValueChange={(value) => setSelectedContractId(value ?? '')}
                  items={availablePlans}
                >
                  <SelectTrigger
                    id="plan-select"
                    className="h-9 text-sm"
                    disabled={isStorePlansLoading || availablePlans.length === 0}
                  >
                    <SelectValue
                      placeholder={
                        noGenderMatchedPlan ? '変更できる主契約はありません' : '選択してください'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isStorePlansLoading ? (
                      <div className="px-2 py-2">
                        <Skeleton className="h-7 w-full" />
                      </div>
                    ) : null}
                    {availablePlans.map((p) => (
                      // A long plan name is cut with an ellipsis while the price stays in view; hover shows both
                      <SelectItem
                        key={p.value}
                        value={p.value}
                        title={`${p.label}　${formatYen(p.price)}/月`}
                      >
                        <span className="flex w-full min-w-0 items-center">
                          <span className="min-w-0 truncate">{p.label}</span>
                          <span className="shrink-0">　{formatYen(p.price)}/月</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {planListNotice && (
                  <p
                    className={cn(
                      'text-xs',
                      storeId ? 'text-muted-foreground' : 'text-destructive',
                    )}
                  >
                    {planListNotice}
                  </p>
                )}
                {isStorePlansError && (
                  <p className="text-destructive text-xs">
                    変更先プランを取得できませんでした。
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => void refetchStorePlans()}
                    >
                      再読み込み
                    </Button>
                  </p>
                )}
              </div>

              {selectedContractData && planPriceDiff !== null && (
                <div className="flex flex-col gap-2 rounded-md border p-3">
                  <p className="text-muted-foreground text-xs font-medium">料金変更</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{formatYen(currentMonthlyFee ?? 0)}/月</span>
                    <ArrowRight className="text-muted-foreground size-4" />
                    <span className="font-semibold">
                      {formatYen(selectedContractData.price)}/月
                    </span>
                    {planPriceDiff !== 0 && (
                      <span
                        className={`ml-1 text-xs ${planPriceDiff > 0 ? 'text-destructive' : 'text-success'}`}
                      >
                        {planPriceDiff > 0
                          ? `+${formatYen(planPriceDiff)}`
                          : `-${formatYen(Math.abs(planPriceDiff))}`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Alert className="border-info/20 bg-info/10">
                <AlertDescription className="text-info text-xs">
                  {noGenderMatchedPlan
                    ? '会員の性別に合う変更先の主契約がありません。'
                    : `翌月月初（${nextMonthFirstLabel}）から適用されます。`}
                </AlertDescription>
              </Alert>

              {/* A-01 FR-017 / API-094 §6.2: a plan change entered in the CRM is always filed
                  on the member's behalf, so the agreement evidence is collected unconditionally
                  — there is no staff-direct source to fall back on. */}
              <ProxyApplicationSection
                alwaysProxy
                agreedAt={proxyAgreedAt}
                onAgreedAtChange={setProxyAgreedAt}
                method={proxyMethod}
                onMethodChange={setProxyMethod}
                agreedAtError={proxyAgreedAtError}
              />
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t px-6 py-4">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button
              className="flex-1"
              disabled={
                !selectedContractId ||
                !proxyAgreedAt ||
                Boolean(proxyAgreedAtError) ||
                !proxyMethod ||
                isChangingMainContract
              }
              onClick={() => {
                if (!mainContract || !selectedContractId || !proxyAgreedAt || !proxyMethod) return;
                if (!acquire()) return;
                submitChangeMainContract({
                  path: { memberId, contractId: mainContract.contractId },
                  body: {
                    toPlanId: selectedContractId,
                    // FR-006 「翌月月初から適用」 — the API rejects any other day of month
                    scheduledChangeDate: nextMonthStartISO(),
                    // `crm_direct` is rejected here (API-094 §6.2): a plan change is the member's
                    // decision, so a counter operation is always a proxy filing.
                    applicationSource: 'proxy',
                    proxy: {
                      agreementAt: proxyAgreedAt.toISOString(),
                      agreementMethod: proxyMethod,
                    },
                  },
                });
              }}
            >
              {isChangingMainContract ? '送信中...' : '変更申請を送信'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
