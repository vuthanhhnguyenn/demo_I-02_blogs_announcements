'use client';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';

import { Permission } from '@/types/permission.type';

import { TRANSFER_BULK_APPROVE_MAX } from '../_constants/constants';

interface TransferBulkApproveBarProps {
  selectedCount: number;
  /** The list is still showing the previous query's rows; approving must wait for the current ones. */
  disabled?: boolean;
  onClearSelection: () => void;
  onBulkApprove: () => void;
}

/**
 * PAR011-PAR014. Only rendered while at least one row is selected, so the toolbar does not
 * carry a permanently-disabled bulk control.
 */
export function TransferBulkApproveBar({
  selectedCount,
  disabled = false,
  onClearSelection,
  onBulkApprove,
}: Readonly<TransferBulkApproveBarProps>) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary/10 border-primary/20 flex items-center gap-3 rounded-lg border px-3 py-2">
      <span className="text-primary text-sm font-medium">{selectedCount}件選択中</span>
      {selectedCount >= TRANSFER_BULK_APPROVE_MAX && (
        <span className="text-muted-foreground text-xs">（上限{TRANSFER_BULK_APPROVE_MAX}件）</span>
      )}
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearSelection}>
        選択解除
      </Button>
      <div className="bg-primary/20 h-4 w-px" />
      <RoleGatedButton
        requiredPermission={Permission.MembersTransfersBulkApprove}
        denyTooltip="一括承認はHQ・Manager権限が必要です"
        size="sm"
        className="h-7 text-xs"
        disabled={disabled}
        onClick={onBulkApprove}
      >
        選択した{selectedCount}件を一括承認
      </RoleGatedButton>
    </div>
  );
}
