'use client';

import { useState } from 'react';

import Link from 'next/link';

import { AlertTriangle } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import type { TransferDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  TRANSFER_EXCLUSION_BLOCK_REASONS,
  isTransferApplicationPending,
} from '../../_constants/constants';
import { TransferUnlockDialog } from './transfer-unlock-dialog';

/** `2026-02` → `2026年2月分`. */
function formatArrearsMonth(month: string): string {
  const [year, mm] = month.split('-');
  return `${year}年${Number(mm)}月分`;
}

/**
 * JOYFIT auto-transfer exclusion alerts (FR-006, FR-012).
 *
 * - 未納 (`arrears`) — destructive, with no override control. A balance has to be settled, not waived.
 * - 縛り期間中 (`cancellation_fee_period`) — warning, with the admin-only manual release, which
 *   approves the application with the reason as its comment (see `TransferUnlockDialog`).
 *
 * The release is only offered when that approve could succeed and is allowed: a pending
 * application the user may act on (`blockedReason`), with no 未納 alongside — the server does not
 * re-check exclusions on approve, so the arrears rule is held here.
 */
export function TransferExclusionAlert({
  transfer,
  campaignLockRemainingDays,
  blockedReason,
}: Readonly<{
  transfer: TransferDetailDto;
  /** Derived by the page from `autoTransfer.cancellationFeeUntil`. */
  campaignLockRemainingDays: number | null;
  /** Why the current user cannot act on this application, or `null` when they can (see `useTransferActScope`). */
  blockedReason: string | null;
}>) {
  const [unlockOpen, setUnlockOpen] = useState(false);

  // `autoTransfer` is only ever set for a JOYFIT application awaiting source approval, so it is
  // the sole gate — `fromStore.brandEnum` can be null when the store row fails to load.
  const autoTransfer = transfer.autoTransfer;
  const reasons = autoTransfer?.exclusionReasons ?? [];
  const isUnpaid = reasons.includes('arrears');
  const isCampaignLocked = reasons.includes('cancellation_fee_period');
  const arrears = autoTransfer?.arrears;

  if (!isUnpaid && !isCampaignLocked) return null;

  const unlockBlockedReason = !isTransferApplicationPending(transfer.status)
    ? '承認待ちの申請ではありません'
    : (blockedReason ?? (isUnpaid ? TRANSFER_EXCLUSION_BLOCK_REASONS.arrears : null));

  return (
    <div className="flex flex-col gap-2">
      {isUnpaid && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-sm font-semibold">自動移籍 除外: 未納金あり</AlertTitle>
          <AlertDescription className="text-sm">
            未納金 ¥{(arrears?.outstandingAmount ?? 0).toLocaleString()}
            {arrears &&
              arrears.months.length > 0 &&
              `（${arrears.months.map(formatArrearsMonth).join('、')}）`}
            が未解消です。解消後に再申請してください。
            <Button
              nativeButton={false}
              variant="link"
              size="sm"
              className="text-destructive ml-2 h-auto p-0 text-xs underline"
              render={
                <Link
                  href={navigate('/members/[id]', transfer.member.memberId, { tab: 'payment' })}
                />
              }
            >
              売上詳細を確認
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isCampaignLocked && (
        <Alert className="border-warning/50 bg-warning/15 text-warning">
          <AlertTriangle className="text-warning size-4" />
          <AlertTitle className="text-sm font-semibold">
            自動移籍 除外: キャンペーン縛り期間中（解約手数料期間）
          </AlertTitle>
          <AlertDescription className="text-warning/90 text-sm">
            <span className="block">
              キャンペーン縛り期間が
              {campaignLockRemainingDays === null ? '' : `残り ${campaignLockRemainingDays}日`}
              あります。縛り期間終了後に再申請してください。
            </span>
            <span className="mt-2 block">
              <RoleGatedButton
                requiredPermission={Permission.MembersTransfersUnlock}
                denyTooltip="手動解除は管理者権限が必要です"
                tooltip={unlockBlockedReason ?? undefined}
                disabled={unlockBlockedReason !== null}
                variant="outline"
                size="sm"
                className="border-warning/60 text-warning hover:bg-warning/20 hover:text-warning h-7 text-xs"
                onClick={() => setUnlockOpen(true)}
              >
                管理者権限で手動解除して移籍を通す
              </RoleGatedButton>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <TransferUnlockDialog open={unlockOpen} onOpenChange={setUnlockOpen} transfer={transfer} />
    </div>
  );
}
