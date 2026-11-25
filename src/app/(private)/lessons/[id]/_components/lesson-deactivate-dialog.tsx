'use client';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

import { adminLessonControllerUpdateMutation } from '@/lib/api-real/@tanstack/react-query.gen';

import {
  type LessonDeactivateReasonSubmitValues,
  type LessonDeactivateReasonValues,
  buildLessonDeactivateReasonSchema,
} from '../../_schemas/lesson-deactivate-dialog.schema';
import { LESSON_ERROR_CODE, invalidateLessonQueries } from '../../_utils/lesson-api.util';

interface LessonDeactivateDialogProps {
  lessonId: string;
  lessonName: string;
  /** The detail's `updatedAt` — sent as the optimistic lock (409 E-LSM-005 when stale). */
  expectedUpdatedAt: string;
  /** true → re-activation flow (有効化), false → deactivation flow (無効化). */
  isReactivation: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Deactivate / re-activate confirmation (FR-003-P1-14 / research D9).
 * Validates the required reason (deactivate only), then flips `isActive` through the lesson
 * PATCH (API-111 §4).
 */
export function LessonDeactivateDialog({
  lessonId,
  lessonName,
  expectedUpdatedAt,
  isReactivation,
  open,
  onOpenChange,
}: Readonly<LessonDeactivateDialogProps>) {
  const queryClient = useQueryClient();

  const reasonRequired = !isReactivation;

  const form = useForm<LessonDeactivateReasonValues, unknown, LessonDeactivateReasonSubmitValues>({
    resolver: zodResolver(buildLessonDeactivateReasonSchema(reasonRequired)),
    mode: 'onSubmit',
    defaultValues: { reason: '' },
  });

  // Error toasts come from the shared MutationCache.
  const statusMutation = useMutation({
    ...adminLessonControllerUpdateMutation(),
    onSuccess: () => {
      toast.success(isReactivation ? 'レッスンを有効化しました' : 'レッスンを無効化しました');
      invalidateLessonQueries(queryClient);
      handleOpenChange(false);
    },
    onError: (error) => {
      // Stale (E-LSM-005) or deleted meanwhile (E-LSM-001): the screen is out of date — refetch it
      // so the status card (and the not-found state) catch up.
      if (
        error?.code === LESSON_ERROR_CODE.staleUpdate ||
        error?.code === LESSON_ERROR_CODE.notFound
      ) {
        invalidateLessonQueries(queryClient);
        handleOpenChange(false);
      }
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset();
    onOpenChange(next);
  };

  // TODO(round2) B3: API-111 PATCH takes no reason for 無効化 / 有効化 — the reason input is
  // validated as before but dropped from the request (and so never reaches the change history).
  const handleConfirm = form.handleSubmit(() => {
    statusMutation.mutate({
      path: { lessonId },
      body: { isActive: isReactivation, expectedUpdatedAt },
    });
  });

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isReactivation ? 'このレッスンを有効化しますか？' : 'このレッスンを無効化しますか？'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReactivation ? (
              <>『{lessonName}』を有効化すると、再びスケジュールで利用できるようになります。</>
            ) : (
              <>
                無効化すると、今後このレッスンで新規の予約枠を作成できなくなります。既存の予約はそのまま有効です。
                <br />※ 後から再度有効化できます。
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {reasonRequired && (
          /* 確認ダイアログの理由入力は「ユーザーが取り戻したい未保存データ」ではないため、
             離脱・ログアウト・ダイアログを閉じる操作を破棄確認で止めない。 */
          <Form {...form} guardUnsaved={false}>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="px-1">
                  <FormLabel className="text-xs font-medium">
                    無効化の理由 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20 text-sm"
                      placeholder="無効化する理由を入力してください（変更履歴に記録されます）"
                      disabled={statusMutation.isPending}
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
          <AlertDialogCancel disabled={statusMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className={
              isReactivation
                ? 'bg-success text-success-foreground hover:bg-success/90'
                : 'bg-warning text-warning-foreground hover:bg-warning/90'
            }
            disabled={statusMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {isReactivation ? '有効化する' : '無効化する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
