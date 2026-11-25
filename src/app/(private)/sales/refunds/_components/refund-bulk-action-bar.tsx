'use client';

import { ShieldAlert } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';

import { Permission } from '@/types/permission.type';

interface RefundBulkActionBarProps {
  selectedCount: number;
  approvableCount: number;
  excludedCount: number;
  onClear: () => void;
  onApprove: () => void;
}

/**
 * FR-018 / API-118 §10: bulk approve bar. Requests outside the current user's approval authority
 * (approverLevel ≠ role, or own applications) are excluded, with the count surfaced before the
 * action runs; the server re-checks and reports anything else per row.
 */
export function RefundBulkActionBar({
  selectedCount,
  approvableCount,
  excludedCount,
  onClear,
  onApprove,
}: Readonly<RefundBulkActionBarProps>) {
  if (selectedCount === 0) return null;

  const excludedTooltip =
    excludedCount > 0 ? `${excludedCount}件は承認権限がないため除外されます` : undefined;

  return (
    <div className="bg-primary/10 border-primary/20 flex items-center gap-3 rounded-lg border px-3 py-2">
      <span className="text-primary text-sm font-medium">{selectedCount}件選択中</span>
      {approvableCount > 0 && (
        <span className="text-muted-foreground text-xs">（承認可能: {approvableCount}件）</span>
      )}
      <Button variant="ghost" size="sm" onClick={onClear}>
        選択解除
      </Button>
      <div className="bg-primary/20 h-4 w-px" />
      <RoleGatedButton
        requiredPermission={Permission.SalesRefundApprove}
        denyTooltip="返金承認の権限がありません"
        tooltip={excludedTooltip}
        size="sm"
        className="gap-1"
        disabled={approvableCount === 0}
        onClick={onApprove}
      >
        {excludedCount > 0 && <ShieldAlert className="size-4" />}
        一括承認
      </RoleGatedButton>
    </div>
  );
}
