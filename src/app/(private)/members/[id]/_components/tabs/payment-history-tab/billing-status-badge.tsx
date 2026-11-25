import type { BillingBadgeStatus } from '@/utils/billing.util';

import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

interface BillingStatusBadgeProps {
  readonly status: BillingBadgeStatus;
}

/**
 * Colours mirror the prototype's `getBillingStatusClass`
 * (.cache/fitness-crm-ui/src/pages/member-detail.tsx) — semantic theme tokens, not raw palette
 * colours, so the badge follows light/dark theming. The prototype's billing table predates the
 * refund/cancel collection states, so those two take the 売上管理 prototype's colours instead:
 * 返金済み from `getRefundStatusBadge` (sales.tsx), キャンセル from its 却下 / default branch.
 */
const STATUS_CONFIG: Record<BillingBadgeStatus, { label: string; className: string }> = {
  pending: {
    label: '未確定',
    className: 'bg-warning/15 text-warning border-warning/20',
  },
  confirmed: {
    label: '確定',
    className: 'bg-info/15 text-info border-info/20',
  },
  paid: {
    label: '入金済み',
    className: 'bg-success/15 text-success border-success/20',
  },
  refunded: {
    label: '返金済み',
    className: 'bg-info/15 text-info border-info/20',
  },
  uncollected: {
    label: '未回収',
    className: 'bg-destructive/15 text-destructive border-destructive/20',
  },
  'written-off': {
    label: '貸倒',
    className: 'bg-destructive/15 text-destructive border-destructive/20',
  },
  cancelled: {
    label: 'キャンセル',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

/** A status the server added after this build: shown as-is in the muted colour, never a crash. */
const UNKNOWN_STATUS_CLASS = 'bg-muted text-muted-foreground border-border';

export function BillingStatusBadge({ status }: BillingStatusBadgeProps) {
  const config: { label: string; className: string } | undefined = STATUS_CONFIG[status];
  if (!config) {
    return (
      <Badge variant="outline" className={cn('text-[10px]', UNKNOWN_STATUS_CLASS)}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('text-[10px]', config.className)}>
      {config.label}
    </Badge>
  );
}
