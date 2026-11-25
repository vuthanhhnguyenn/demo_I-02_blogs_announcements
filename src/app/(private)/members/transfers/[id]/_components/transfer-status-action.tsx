'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { StatusCard } from '@/components/common/status-card';

import type { TransferDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  TRANSFER_APPLICATION_STATUS,
  TRANSFER_APPLICATION_STATUS_ICONS,
  TRANSFER_APPLICATION_STATUS_LABELS,
  TRANSFER_APPLICATION_STATUS_TONES,
  TRANSFER_DETAIL_EXCLUSION_BLOCK_REASONS,
  getTransferExclusionBlockReason,
  isTransferApplicationPending,
} from '../../_constants/constants';
import { TransferApproveDialog } from './transfer-approve-dialog';
import { TransferRejectDialog } from './transfer-reject-dialog';

interface Props {
  transfer: TransferDetailDto;
  /** Why the current user cannot act on this application, or `null` when they can (see `useTransferActScope`). */
  blockedReason: string | null;
}

/**
 * Status hub + the approve / reject actions.
 *
 * The API returns no per-row "can act" flag, so the row-level decision (does the current user
 * belong to the store that owns this step) arrives as `blockedReason`, computed from the same
 * rule the list uses; `RoleGatedButton` covers the role permission. 承認 is additionally blocked
 * by a JOYFIT auto-transfer exclusion (未納 / 縛り期間); 否認 is not — an excluded case can still
 * be closed.
 */
export function TransferStatusAction({ transfer, blockedReason }: Readonly<Props>) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const isWaitingDestination =
    transfer.status === TRANSFER_APPLICATION_STATUS.PENDING_DESTINATION_APPROVAL;

  // 最終更新 is the latest status transition (the API has no `updatedAt`).
  const lastChangedAt = transfer.statusHistories.at(-1)?.changedAt;
  const meta = [
    `申請日: ${formatDateYYYYMMDD_HHMM(transfer.appliedAt)}`,
    ...(lastChangedAt ? [`最終更新: ${formatDateYYYYMMDD_HHMM(lastChangedAt)}`] : []),
    ...(isWaitingDestination ? ['移籍先店舗の承認待ちです'] : []),
  ];

  // The server does not block approving an excluded application, so this is the screen's own
  // rule: a 縛り期間 case goes through the admin-only manual release (an approve with a reason)
  // in the exclusion alert, never through the plain 承認.
  const approveBlockedReason =
    blockedReason ??
    getTransferExclusionBlockReason(transfer.autoTransfer, TRANSFER_DETAIL_EXCLUSION_BLOCK_REASONS);

  return (
    <>
      <div className="sticky top-6 flex flex-col gap-4">
        <StatusCard
          tone={TRANSFER_APPLICATION_STATUS_TONES[transfer.status]}
          icon={TRANSFER_APPLICATION_STATUS_ICONS[transfer.status]}
          label={TRANSFER_APPLICATION_STATUS_LABELS[transfer.status]}
          meta={meta}
          action={
            // A decided transfer offers no actions at all — not disabled ones.
            isTransferApplicationPending(transfer.status) ? (
              <div className="flex w-full flex-col gap-2">
                <RoleGatedButton
                  requiredPermission={Permission.MembersTransfersApprove}
                  denyTooltip="移籍承認の権限がありません"
                  tooltip={approveBlockedReason ?? undefined}
                  disabled={approveBlockedReason !== null}
                  size="sm"
                  fullWidth
                  onClick={() => setApproveOpen(true)}
                >
                  {isWaitingDestination ? '移籍先として承認' : '承認'}
                </RoleGatedButton>
                <RoleGatedButton
                  requiredPermission={Permission.MembersTransfersApprove}
                  denyTooltip="移籍否認の権限がありません"
                  tooltip={blockedReason ?? undefined}
                  disabled={blockedReason !== null}
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRejectOpen(true)}
                >
                  否認
                </RoleGatedButton>
              </div>
            ) : undefined
          }
        />
      </div>

      <TransferApproveDialog open={approveOpen} onOpenChange={setApproveOpen} transfer={transfer} />
      <TransferRejectDialog open={rejectOpen} onOpenChange={setRejectOpen} transfer={transfer} />
    </>
  );
}
