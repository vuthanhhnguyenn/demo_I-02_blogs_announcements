'use client';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { Check } from 'lucide-react';

import { StatusCard } from '@/components/common/status-card';

import { type StaffDetailDto } from '@/lib/api-real/types.gen';

import { StaffDeactivateAction } from '../../_components/staff-deactivate-action';
import { STAFF_STATUS_LABELS, StaffStatus } from '../../_constants/constants';
import { StaffReactivateAction } from './staff-reactivate-action';

interface StaffStatusCardProps {
  staff: StaffDetailDto;
}

/**
 * Right-column StatusCard — tone/icon/label/meta lines, 無効化する action button
 * src: staff-detail.tsx L299-315
 */
const STATUS_TONE: Record<StaffStatus, 'success' | 'muted' | 'info'> = {
  [StaffStatus.ACTIVE]: 'success',
  [StaffStatus.INACTIVE]: 'muted',
  [StaffStatus.INVITED]: 'info',
};

export function StaffStatusCard({ staff }: StaffStatusCardProps) {
  const staffStatus = staff.status as StaffStatus;

  return (
    <StatusCard
      tone={STATUS_TONE[staffStatus]}
      icon={Check}
      label={STAFF_STATUS_LABELS[staffStatus] || '-'}
      meta={[
        `作成: ${formatDateYYYYMMDD_HHMM(staff.createdAt)}`,
        `更新: ${formatDateYYYYMMDD_HHMM(staff.updatedAt)}`,
      ]}
      action={
        staffStatus === StaffStatus.INACTIVE ? (
          <StaffReactivateAction staffId={staff.id} staffName={staff.name} />
        ) : (
          <StaffDeactivateAction staffId={staff.id} staffName={staff.name} withReason />
        )
      }
    />
  );
}
