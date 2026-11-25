'use client';

import { useRouter } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  adminTrainerControllerDetailQueryKey,
  adminTrainerControllerListQueryKey,
  adminTrainerControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { TrainerDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  INSTRUCTOR_ERROR_CODE,
  invalidateInstructorQueries,
} from '../../_utils/instructor-api.util';

interface InstructorDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: TrainerDetailDto;
  instructorName: string;
}

export function InstructorDeleteDialog({
  open,
  onOpenChange,
  instructor,
  instructorName,
}: InstructorDeleteDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // API-109 §6.3: 204 = deleted; 200 = in use (it became so meanwhile) → deactivated instead (D15).
  // Errors are toasted by the shared MutationCache.
  const deleteMutation = useMutation({
    ...adminTrainerControllerRemoveMutation(),
    onSuccess: (data) => {
      onOpenChange(false);
      if (data && 'softDeactivated' in data && data.softDeactivated) {
        toast.success(`${instructorName}はスケジュールで使用中のため、削除せず無効化しました`);
        invalidateInstructorQueries(queryClient);
        return;
      }
      toast.success(`${instructorName}を削除しました`);
      void queryClient.invalidateQueries({ queryKey: adminTrainerControllerListQueryKey() });
      // Only mark the deleted trainer's detail stale: refetching it while this screen is still
      // mounted would flash the not-found state before the redirect
      void queryClient.invalidateQueries({
        queryKey: adminTrainerControllerDetailQueryKey({ path: { trainerId: instructor.id } }),
        refetchType: 'none',
      });
      router.push(navigate('/instructors'));
    },
    onError: (error) => {
      if (error?.code === INSTRUCTOR_ERROR_CODE.notFound) {
        invalidateInstructorQueries(queryClient);
        onOpenChange(false);
      }
    },
  });

  // FR-005: an instructor on a live schedule is not deleted — the status card deactivates instead
  const isBlocked = instructor.usageSummary.inUse;
  const scheduleCount = instructor.usageSummary.activeScheduleCount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[480px]">
        {/* A long unbroken name wraps instead of pushing the buttons out (UT D-04 No12) */}
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle>指導者を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            「{instructorName}」のプロフィールを削除します。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isBlocked && (
          <Alert variant="destructive">
            <AlertDescription>
              {scheduleCount > 0
                ? `この指導者は${scheduleCount}件のスケジュールに割り当てられているため削除できません。`
                : 'この指導者は今後のスケジュールに割り当てられているため削除できません。'}
              利用を止める場合は「無効化する」に切り替えてください。
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isBlocked || deleteMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate({ path: { trainerId: instructor.id } });
            }}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
