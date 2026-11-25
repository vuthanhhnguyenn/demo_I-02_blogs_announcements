'use client';

import { useMemo, useState } from 'react';

import { formatDateYYYYMMDD, formatISODateLocal, jstToday } from '@/utils/date.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, startOfMonth } from 'date-fns';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import {
  adminLockerControllerGetSlotOptions,
  adminLockerSlotOpsControllerAssignMutation,
  adminMemberContractOpsControllerListContractsOptions,
  adminMemberControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  LockerDetailDto,
  MemberListItemDto,
  OptionListItemDto,
} from '@/lib/api-real/types.gen';

import { useMemberUnpaidBalance } from '../../_hooks/use-member-unpaid-balance.hook';
import { formatLockerFee } from '../../_utils/locker-fee.util';
import { invalidateLockerQueries } from '../../_utils/locker-query-invalidation.util';
import { LockerContractUnpaidAlert } from '../../contracts/_components/locker-contract-unpaid-alert';
import type { LockerSlotRow } from '../_utils/locker-slot-rows.util';

type StartTiming = 'today' | 'next_month';

/** API-101 §6.1: `startDate` is today or the 1st of next month (JST) — G-02 FR-002 「今日から」「翌月から」 */
function resolveStartDate(timing: StartTiming): string {
  const today = jstToday();
  return formatISODateLocal(timing === 'today' ? today : startOfMonth(addMonths(today, 1)));
}

function memberDisplayName(member: MemberListItemDto): string {
  const name = [member.lastName, member.firstName].filter(Boolean).join(' ');
  return name || '—';
}

interface SlotAssignFormProps {
  row: LockerSlotRow;
  locker: LockerDetailDto;
  feeOptionsById: Map<string, OptionListItemDto>;
  onDone: () => void;
}

function SlotAssignForm({ row, locker, feeOptionsById, onDone }: SlotAssignFormProps) {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword.trim(), 300);
  const [member, setMember] = useState<MemberListItemDto | null>(null);
  const [startTiming, setStartTiming] = useState<StartTiming>('today');

  const option = row.effectiveOptionId ? feeOptionsById.get(row.effectiveOptionId) : undefined;
  // API-101 §6.1: `optionId` must be active (400 E-VAL-001); a cabinet may still point at an inactive one
  const isOptionInactive = option !== undefined && !option.isActive;

  const { data: membersData, isFetching: isSearching } = useQuery({
    // No `storeId`: it filters on `members.primary_store_id`, which can be empty or another store
    // while the main contract is here — the main-contract lookup below is the store check.
    ...adminMemberControllerListOptions({
      query: { query: debouncedKeyword, page: 1, limit: 10 },
    }),
    enabled: debouncedKeyword.length > 0 && member === null,
  });

  // The locker contract hangs off the member's main contract at this cabinet's store (E-01 前提条件).
  const {
    data: contractsData,
    isError: isContractsError,
    refetch: refetchContracts,
  } = useQuery({
    ...adminMemberContractOpsControllerListContractsOptions({
      path: { memberId: member?.memberId ?? '' },
      query: { storeId: locker.storeId },
    }),
    enabled: member !== null,
  });
  // API-101 §6.1 #4 / #5: an `active` main contract at the cabinet's store (the list is already
  // filtered by `storeId`). Not `isCurrentMain`: it also needs `members.primary_store_id`, which an
  // app-enrolled member may not have yet, so it would refuse members the BE accepts.
  const mainContract = useMemo(() => {
    const active =
      contractsData?.contracts.filter((contract) => contract.contractStatus === 'active') ?? [];
    return active.find((contract) => contract.isCurrentMain) ?? active[0] ?? null;
  }, [contractsData?.contracts]);

  // FR-005 異常系 (#309): refused up front for unpaid / unknown balances; the BE re-checks (E-LOC-011)
  const { balance } = useMemberUnpaidBalance(member?.memberId);
  const isBlockedByUnpaid =
    member !== null && balance.status !== 'clear' && balance.status !== 'unchecked';

  // `updatedAt` for the optimistic lock (E-LOC-013 when the slot changed meanwhile)
  const { data: slotDetail } = useQuery(
    adminLockerControllerGetSlotOptions({ path: { slotId: row.slot.id } }),
  );

  // `disabled={isPending}` lands a render late: a same-tick double click would POST twice
  const runAssign = useInFlightGuard();
  const assignMutation = useMutation({
    ...adminLockerSlotOpsControllerAssignMutation(),
    // 409 E-LOC-011 (unpaid balance), E-LOC-014, 422 E-LOC-010 / E-LOC-013 are toasted with their
    // `userMessage` by the shared MutationCache.
    onSuccess: (data) => {
      toast.success(`${row.label} を ${data.memberName} さんに割り当てました`);
      onDone();
    },
    onSettled: () => invalidateLockerQueries(queryClient),
  });

  const startDate = resolveStartDate(startTiming);
  const canSubmit =
    member !== null &&
    mainContract !== null &&
    option !== undefined &&
    !isOptionInactive &&
    !isBlockedByUnpaid &&
    !assignMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>スロット割当</DialogTitle>
        <DialogDescription>{row.label} に会員のロッカー契約を登録します</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="bg-muted/30 grid grid-cols-2 gap-3 rounded-lg border px-4 py-3">
          <div>
            <p className="text-muted-foreground text-xs">スロット</p>
            <p className="text-sm font-medium">{row.label}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">契約種類</p>
            <p className="text-sm font-medium">
              {option ? `${option.name}（${formatLockerFee(option)}/月）` : '未設定'}
            </p>
          </div>
        </div>
        {!option ? (
          <p className="text-destructive text-xs">
            このスロットの契約種類が未設定のため割り当てできません。ロッカー情報の「契約形態コード」を設定してください。
          </p>
        ) : isOptionInactive ? (
          <p className="text-destructive text-xs">
            このスロットの契約種類「{option.name}
            」は無効のため割り当てできません。ロッカー情報の「契約形態コード」を有効な契約種類に変更してください。
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium">会員</Label>
          {member ? (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{memberDisplayName(member)}</p>
                <p className="text-muted-foreground text-xs">会員番号 {member.memberNumber}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setMember(null)}>
                変更
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="会員番号・氏名で検索"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>
              {debouncedKeyword ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border">
                  {isSearching ? (
                    <p className="text-muted-foreground px-3 py-2 text-xs">検索中...</p>
                  ) : (membersData?.items.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground px-3 py-2 text-xs">
                      該当する会員が見つかりません
                    </p>
                  ) : (
                    membersData?.items.map((item) => (
                      <button
                        key={item.memberId}
                        type="button"
                        className="hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-left"
                        onClick={() => setMember(item)}
                      >
                        <span className="text-sm">{memberDisplayName(item)}</span>
                        <span className="text-muted-foreground text-xs">{item.memberNumber}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </>
          )}
          {/* A failed lookup is not "no main contract" — say so and offer a retry */}
          {member && isContractsError ? (
            <p className="text-destructive flex items-center gap-2 text-xs">
              主契約の取得に失敗しました。
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => void refetchContracts()}
              >
                再試行する
              </Button>
            </p>
          ) : null}
          {member && contractsData && !mainContract ? (
            <p className="text-destructive text-xs">
              この店舗で有効な主契約がないため割り当てできません。
            </p>
          ) : null}
          {mainContract ? (
            <p className="text-muted-foreground text-xs">
              主契約: {mainContract.plan.name}（{formatDateYYYYMMDD(mainContract.startDate)}〜）
            </p>
          ) : null}
          {member ? (
            <LockerContractUnpaidAlert
              memberId={member.memberId}
              blockedActionLabel="スロットの割当"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium">利用開始日</Label>
          <RadioGroup
            value={startTiming}
            onValueChange={(value) => setStartTiming(value as StartTiming)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="today" id="assign-start-today" />
              <Label htmlFor="assign-start-today" className="cursor-pointer text-sm font-normal">
                今日から
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="next_month" id="assign-start-next-month" />
              <Label
                htmlFor="assign-start-next-month"
                className="cursor-pointer text-sm font-normal"
              >
                翌月から
              </Label>
            </div>
          </RadioGroup>
          <p className="text-muted-foreground text-xs">
            開始日: {formatDateYYYYMMDD(startDate)}
            {startTiming === 'next_month' ? (
              <Badge variant="outline" className="ml-2 text-[10px]">
                開始前
              </Badge>
            ) : null}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={assignMutation.isPending}>
          キャンセル
        </Button>
        <Button
          disabled={!canSubmit}
          onClick={() => {
            if (!member || !mainContract || !option) return;
            void runAssign(() =>
              assignMutation
                .mutateAsync({
                  path: { slotId: row.slot.id },
                  body: {
                    contractId: mainContract.contractId,
                    optionId: option.id,
                    startDate,
                    expectedSlotUpdatedAt: slotDetail?.updatedAt,
                  },
                })
                // The shared MutationCache already toasts the error
                .catch(() => undefined),
            );
          }}
        >
          <UserPlus className="mr-1 size-4" />
          {assignMutation.isPending ? '割当中...' : '割り当てる'}
        </Button>
      </DialogFooter>
    </>
  );
}

interface SlotAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: LockerSlotRow | null;
  locker: LockerDetailDto;
  feeOptionsById: Map<string, OptionListItemDto>;
}

/**
 * S1 — スロット契約・割当 from the CRM (E-01 FR-005; `POST /admin/locker-slots/{slotId}/contract`,
 * API-101 §6.1). Opened from an available slot of the cabinet detail.
 */
export function SlotAssignDialog({
  open,
  onOpenChange,
  row,
  locker,
  feeOptionsById,
}: SlotAssignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {open && row ? (
          <SlotAssignForm
            key={row.slot.id}
            row={row}
            locker={locker}
            feeOptionsById={feeOptionsById}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
