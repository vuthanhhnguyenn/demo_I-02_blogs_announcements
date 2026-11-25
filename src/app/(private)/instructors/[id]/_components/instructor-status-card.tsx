'use client';

import { useRef } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { adminTrainerControllerUpdateMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { TrainerDetailDto } from '@/lib/api-real/types.gen';

import { UserRole } from '@/types/permission.type';

import {
  INSTRUCTOR_ERROR_CODE,
  fullName,
  invalidateInstructorQueries,
} from '../../_utils/instructor-api.util';

interface InstructorStatusCardProps {
  instructor: TrainerDetailDto;
}

export function InstructorStatusCard({ instructor }: InstructorStatusCardProps) {
  const instructorName = fullName(instructor);
  const status = instructor.isActive ? 'active' : 'inactive';
  const queryClient = useQueryClient();
  // Synchronous re-entrancy guard: `disabled={isPending}` only updates on the next
  // render, so rapid clicks in the same tick would otherwise fire duplicate requests.
  const submittingRef = useRef(false);

  // PATCH isActive under the optimistic lock (API-109 §6.2); the shared MutationCache toasts errors
  const statusMutation = useMutation({
    ...adminTrainerControllerUpdateMutation(),
    onSuccess: (data) => {
      toast.success(
        data.isActive ? `${instructorName}を有効化しました` : `${instructorName}を無効化しました`,
      );
      invalidateInstructorQueries(queryClient);
    },
    onError: (error) => {
      // Edited elsewhere meanwhile: reload so the next click carries the fresh updatedAt
      if (error?.code === INSTRUCTOR_ERROR_CODE.stale) invalidateInstructorQueries(queryClient);
    },
    onSettled: () => {
      submittingRef.current = false;
    },
  });

  const handleToggle = () => {
    if (submittingRef.current || statusMutation.isPending) return;
    submittingRef.current = true;
    statusMutation.mutate({
      path: { trainerId: instructor.id },
      body: { isActive: !instructor.isActive, expectedUpdatedAt: instructor.updatedAt },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">ステータス</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            {status === 'active' ? (
              <div className="bg-success/10 flex size-20 items-center justify-center rounded-full">
                <CheckCircle2 className="text-success size-9" />
              </div>
            ) : (
              <div className="bg-muted flex size-20 items-center justify-center rounded-full">
                <Ban className="text-muted-foreground size-9" />
              </div>
            )}
          </div>
          <div className="flex justify-center">
            {status === 'active' ? (
              <Badge
                variant="outline"
                className="bg-success/15 text-success border-success/20 gap-1 text-xs font-medium"
              >
                <span className="bg-success size-1.5 rounded-full" />
                有効
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground border-border gap-1 text-xs font-medium"
              >
                <span className="bg-muted-foreground size-1.5 rounded-full" />
                無効
              </Badge>
            )}
          </div>
          <RoleGatedButton
            allowedRoles={[UserRole.System, UserRole.Headquarter, UserRole.Manager]}
            denyTooltip="ステータス変更は本部・マネージャーのみ可能です"
            variant="outline"
            size="sm"
            fullWidth
            disabled={statusMutation.isPending}
            className={`gap-1 ${status === 'active' ? 'text-warning hover:text-warning' : 'text-success hover:text-success'}`}
            onClick={handleToggle}
          >
            <Ban className="size-4" />
            {status === 'active' ? '無効化する' : '有効化する'}
          </RoleGatedButton>
        </div>
      </CardContent>
    </Card>
  );
}
