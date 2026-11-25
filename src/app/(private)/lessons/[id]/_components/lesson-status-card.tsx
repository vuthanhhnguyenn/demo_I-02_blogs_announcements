'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { Activity, Ban, CheckCircle2 } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { StatusCard } from '@/components/common/status-card';

import type { LessonDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { LESSON_DETAIL_STATUS_LABELS, LESSON_DETAIL_STATUS_TONE } from '../_constants/constants';
import { LessonDeactivateDialog } from './lesson-deactivate-dialog';

interface LessonStatusCardProps {
  detail: LessonDetailDto;
}

function formatMeta(label: string, value?: string | null): string | undefined {
  if (!value) return undefined;
  return `${label}: ${formatDateYYYYMMDD_HHMM(value, value)}`;
}

/**
 * Right-column status hub with a role-gated 無効化/有効化 lifecycle action
 * (FR-003-P1-17 / 21). The action opens the deactivate / re-activate dialog.
 */
export function LessonStatusCard({ detail }: LessonStatusCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const isActive = detail.isActive;
  const statusKey = isActive ? 'active' : 'inactive';

  const meta = [formatMeta('作成', detail.createdAt), formatMeta('更新', detail.updatedAt)].filter(
    (m): m is string => Boolean(m),
  );

  return (
    <>
      <StatusCard
        tone={LESSON_DETAIL_STATUS_TONE[statusKey]}
        icon={isActive ? Activity : Ban}
        label={LESSON_DETAIL_STATUS_LABELS[statusKey]}
        meta={meta}
        action={
          <RoleGatedButton
            requiredPermission={Permission.LessonContentsDelete}
            variant="outline"
            size="sm"
            denyTooltip={isActive ? '無効化の権限がありません' : '有効化の権限がありません'}
            className={
              isActive
                ? 'text-warning hover:text-warning w-full gap-1'
                : 'text-success hover:text-success w-full gap-1'
            }
            onClick={() => setDialogOpen(true)}
          >
            {isActive ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
            {isActive ? '無効化する' : '有効化する'}
          </RoleGatedButton>
        }
      />

      <LessonDeactivateDialog
        lessonId={detail.id}
        lessonName={detail.name}
        expectedUpdatedAt={detail.updatedAt}
        isReactivation={!isActive}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
