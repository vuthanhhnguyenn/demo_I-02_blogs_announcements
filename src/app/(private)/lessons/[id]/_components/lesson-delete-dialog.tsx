'use client';

import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, XCircle } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

import {
  adminLessonControllerDetailQueryKey,
  adminLessonControllerHistoryQueryKey,
  adminLessonControllerListQueryKey,
  adminLessonControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminLessonControllerRemoveResponse } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  type LessonDeleteReasonValues,
  lessonDeleteReasonSchema,
} from '../../_schemas/lesson-delete-dialog.schema';
import { LESSON_ERROR_CODE, invalidateLessonQueries } from '../../_utils/lesson-api.util';

interface LessonDeleteDialogProps {
  lessonId: string;
  lessonName: string;
  /** `scheduleCounts.upcomingScheduleCount` — non-cancelled sessions dated today or later (JST). */
  upcomingScheduleCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the lesson is really deleted (204), right before the redirect to the list. */
  onDeleted?: () => void;
}

/** 200 = in use, deactivated instead of deleted; 204 (no body, `{}` from the client) = deleted. */
function isDeactivatedInstead(response: AdminLessonControllerRemoveResponse): boolean {
  return typeof response === 'object' && response !== null && response.deactivated === true;
}

/**
 * Delete confirmation (FR-003-P1-15/16 / research D5).
 * - upcoming schedules > 0  → blocking alert, disabled confirm, link to in-use schedules.
 * - no upcoming schedule → required delete reason, enabled confirm → API call → redirect to list.
 *
 * API-111 DELETE no longer refuses an in-use lesson — it deactivates it instead (200). The UI
 * keeps blocking that case up front; the 200 branch is still handled for a schedule created
 * between the detail read and the delete.
 */
export function LessonDeleteDialog({
  lessonId,
  lessonName,
  upcomingScheduleCount,
  open,
  onOpenChange,
  onDeleted,
}: LessonDeleteDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const inUse = upcomingScheduleCount > 0;

  const form = useForm<LessonDeleteReasonValues>({
    resolver: zodResolver(lessonDeleteReasonSchema),
    mode: 'onSubmit',
    defaultValues: { reason: '' },
  });

  // Error toasts come from the shared MutationCache.
  const deleteMutation = useMutation({
    ...adminLessonControllerRemoveMutation(),
    onSuccess: (response) => {
      if (isDeactivatedInstead(response)) {
        toast.success('スケジュールで使用中のため、レッスンを無効化しました');
        invalidateLessonQueries(queryClient);
        handleOpenChange(false);
        return;
      }

      toast.success('レッスンを削除しました');
      onDeleted?.();
      void queryClient.invalidateQueries({ queryKey: adminLessonControllerListQueryKey() });
      // The deleted lesson's own detail / history are only marked stale: refetching them while
      // this screen is still mounted would flash the not-found state before the redirect.
      void queryClient.invalidateQueries({
        queryKey: adminLessonControllerDetailQueryKey({ path: { lessonId } }),
        refetchType: 'none',
      });
      void queryClient.invalidateQueries({
        queryKey: adminLessonControllerHistoryQueryKey({ path: { lessonId } }),
        refetchType: 'none',
      });
      handleOpenChange(false);
      router.push(navigate('/lessons'));
    },
    onError: (error) => {
      // Deleted elsewhere meanwhile (E-LSM-001): refetch so the screen lands on the not-found state.
      if (error?.code === LESSON_ERROR_CODE.notFound) {
        invalidateLessonQueries(queryClient);
        handleOpenChange(false);
      }
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset();
    onOpenChange(next);
  };

  const handleConfirm = form.handleSubmit((values) => {
    if (inUse) return;
    deleteMutation.mutate({
      path: { lessonId },
      body: { deleteReason: values.reason.trim() },
    });
  });

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>レッスンを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            『{lessonName}』を削除します。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>

        {inUse ? (
          <div className="flex flex-col gap-3">
            <Alert variant="destructive">
              <XCircle className="size-4" />
              <AlertDescription>
                このレッスンはスケジュールで使用中のため削除できません。
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-auto justify-start gap-1 p-0 text-xs"
              onClick={() => {
                handleOpenChange(false);
                router.push(navigate('/lesson-schedules'));
              }}
            >
              使用中のスケジュールを確認 ({upcomingScheduleCount}件)
              <ExternalLink className="size-3" />
            </Button>
          </div>
        ) : (
          /* 確認ダイアログの理由入力は「ユーザーが取り戻したい未保存データ」ではないため、
             離脱・ログアウト・ダイアログを閉じる操作を破棄確認で止めない。 */
          <Form {...form} guardUnsaved={false}>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="px-1">
                  <FormLabel className="text-xs font-medium">
                    削除理由 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20 text-sm"
                      placeholder="削除する理由を入力してください（変更履歴に記録されます）"
                      disabled={deleteMutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={inUse || deleteMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
