'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { useMemberUnpaidBalance } from '../../_hooks/use-member-unpaid-balance.hook';

type LockerContractUnpaidAlertProps = {
  memberId?: string | null;
  /** What the unknown state blocks, e.g. 「スロットの割当」; omitted where nothing is blocked */
  blockedActionLabel?: string;
};

export function LockerContractUnpaidAlert({
  memberId,
  blockedActionLabel,
}: LockerContractUnpaidAlertProps) {
  const { balance, refetch, isFetching } = useMemberUnpaidBalance(memberId);

  if (balance.status === 'idle' || balance.status === 'loading') return null;

  /**
   * FR-005: an unreachable balance is *unknown*, never 「0円」. Claiming 契約可能 here would let
   * staff assign a slot to a member who may still owe money, so the unknown state warns instead.
   */
  if (balance.status === 'unknown') {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <AlertTriangle className="text-warning size-4" />
        <AlertDescription className="text-warning text-xs">
          未納金の確認ができませんでした。
          {blockedActionLabel ? `安全のため、${blockedActionLabel}はできません。` : null}
          <button
            type="button"
            className="text-warning ml-1 underline underline-offset-4 disabled:opacity-60"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            再試行
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  // 403 E-AUTH-101: this member is outside the caller's member scope — the BE checks on save
  if (balance.status === 'unchecked') {
    return (
      <Alert>
        <AlertTriangle className="text-muted-foreground size-4" />
        <AlertDescription className="text-muted-foreground text-xs">
          この会員の未納金は表示できません（権限外）。未納金がある場合は登録時にエラーになります。
        </AlertDescription>
      </Alert>
    );
  }

  if (balance.status === 'unpaid') {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="text-destructive size-4" />
        <AlertDescription className="text-destructive text-xs">
          未納金あり: ¥{balance.amount.toLocaleString()}（契約不可）—
          未納金が残っている会員はロッカー契約を締結できません。先に未納金を解消してください。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-success/50 bg-success/10">
      <CheckCircle2 className="text-success size-4" />
      <AlertDescription className="text-success text-xs">未納金: 0円（契約可能）</AlertDescription>
    </Alert>
  );
}
