import { JargonTip } from '@/components/common/jargon-tip';
import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

interface FeeAdjustmentBadgeProps {
  /** The detail header explains the term; list rows keep the plain label. */
  withTip?: boolean;
  className?: string;
}

/**
 * A-03 FR-001 (v3) — marks a member whose individual fee adjustment (A-01 FR-006) is in
 * force, as an input to suspension / withdrawal handling.
 */
export function FeeAdjustmentBadge({
  withTip = false,
  className,
}: Readonly<FeeAdjustmentBadgeProps>) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'bg-warning/15 text-warning border-warning/30 gap-1',
        withTip ? 'text-xs' : 'text-[10px]',
        className,
      )}
    >
      {withTip ? <JargonTip term="個別会費調整">個別会費調整中</JargonTip> : '個別会費調整中'}
    </Badge>
  );
}
