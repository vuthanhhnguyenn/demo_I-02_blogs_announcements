import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

import {
  TRANSFER_APPLICATION_STATUS,
  TRANSFER_APPLICATION_STATUS_CLASSES,
  TRANSFER_APPLICATION_STATUS_DOT_CLASSES,
  TRANSFER_APPLICATION_STATUS_LABELS,
  type TransferApplicationStatus,
} from '../_constants/constants';

/** Status badge shared by the list column and the detail header, so the two never disagree. */
export function TransferApplicationStatusBadge({
  status,
  className,
}: Readonly<{ status: TransferApplicationStatus; className?: string }>) {
  if (status === TRANSFER_APPLICATION_STATUS.COMPLETED) {
    return (
      <Badge variant="secondary" className={cn('text-[10px] font-medium', className)}>
        {TRANSFER_APPLICATION_STATUS_LABELS[status]}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-[10px] font-medium',
        TRANSFER_APPLICATION_STATUS_CLASSES[status],
        className,
      )}
    >
      <span
        className={cn('size-1.5 rounded-full', TRANSFER_APPLICATION_STATUS_DOT_CLASSES[status])}
      />
      {TRANSFER_APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
