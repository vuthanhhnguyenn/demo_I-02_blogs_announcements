import { CheckCircle2, Clock3, Hourglass, XCircle } from 'lucide-react';

import type { StatusTone } from '@/components/common/status-card';

import type { LockerOptionStatus } from '../../../_constants/locker-enum-labels.constants';
import { LOCKER_OPTION_STATUS_LABELS } from '../../../_constants/locker-enum-labels.constants';

/** Side status card of the contract detail, keyed by the contract (`optionStatus`), not the slot */
export const LOCKER_CONTRACT_STATUS_CARD_MAP: Record<
  LockerOptionStatus,
  { tone: StatusTone; icon: typeof CheckCircle2; label: string }
> = {
  pending_start: {
    tone: 'info',
    icon: Hourglass,
    label: LOCKER_OPTION_STATUS_LABELS.pending_start,
  },
  active: {
    tone: 'success',
    icon: CheckCircle2,
    label: LOCKER_OPTION_STATUS_LABELS.active,
  },
  pending_cancel: {
    tone: 'warning',
    icon: Clock3,
    label: LOCKER_OPTION_STATUS_LABELS.pending_cancel,
  },
  cancelled: {
    tone: 'muted',
    icon: XCircle,
    label: LOCKER_OPTION_STATUS_LABELS.cancelled,
  },
};
