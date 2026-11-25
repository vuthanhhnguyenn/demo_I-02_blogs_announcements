import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

interface RefundPendingBannerProps {
  pendingCount: number;
}

/**
 * FR-014: banner showing the number of currently pending refund requests. The count comes from a
 * `displayStatus=pending_approval&limit=1` query (pagination.totalItems).
 */
export function RefundPendingBanner({ pendingCount }: Readonly<RefundPendingBannerProps>) {
  if (pendingCount === 0) return null;

  return (
    <Alert className="bg-warning/10 border-warning/20 text-warning">
      <AlertTriangle className="size-4" />
      <AlertDescription className="text-sm font-medium">
        承認待ちの返金申請が <span className="font-bold tabular-nums">{pendingCount}件</span>
        {/* TODO(round3) R301: 承認待ち total amount — spec silent; no total in the API — integrate in phase 2
        （合計 <span className="tabular-nums">{formatYen(pendingAmount)}</span>） */}
        あります
      </AlertDescription>
    </Alert>
  );
}
