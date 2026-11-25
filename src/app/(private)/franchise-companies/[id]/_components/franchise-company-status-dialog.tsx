'use client';

import { useRef, useState } from 'react';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  adminFcCompanyControllerDetailQueryKey,
  adminFcCompanyControllerHistoryQueryKey,
  adminFcCompanyControllerListQueryKey,
  adminFcCompanyControllerSetActiveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { toSetActiveBody } from '../../_utils/fc-company-api.util';

const DISABLE_REASON_MAX_LENGTH = 1000;

interface FranchiseCompanyStatusDialogProps {
  companyId: string;
  companyName: string;
  isActive: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FranchiseCompanyStatusDialog({
  companyId,
  companyName,
  isActive,
  open,
  onOpenChange,
}: Readonly<FranchiseCompanyStatusDialogProps>) {
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);
  const [disableReason, setDisableReason] = useState('');
  const activating = !isActive;

  const mutation = useMutation({
    ...adminFcCompanyControllerSetActiveMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminFcCompanyControllerDetailQueryKey({ path: { id: companyId } }),
      });
      void queryClient.invalidateQueries({
        queryKey: adminFcCompanyControllerHistoryQueryKey({ path: { id: companyId } }),
      });
      void queryClient.invalidateQueries({ queryKey: adminFcCompanyControllerListQueryKey() });
      toast.success(
        activating ? `「${companyName}」を有効化しました` : `「${companyName}」を無効化しました`,
      );
      setDisableReason('');
      onOpenChange(false);
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleConfirm = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    mutation.mutate({
      path: { id: companyId },
      body: toSetActiveBody({
        isActive: activating,
        reason: disableReason,
      }),
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDisableReason('');
        onOpenChange(next);
      }}
    >
      {/* Capped to the viewport: title and buttons stay put, the description + reason scroll.
          Long unbroken text (company name / reason) wraps instead of widening the dialog. */}
      <AlertDialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <AlertDialogHeader className="shrink-0">
          <AlertDialogTitle className="max-w-full wrap-anywhere">
            {activating ? 'FC企業を有効にしますか？' : 'FC企業を無効にしますか？'}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4">
          <AlertDialogDescription className="text-center wrap-anywhere sm:text-left">
            {activating
              ? `「${companyName}」のステータスを有効に変更します。店舗の紐づけ候補に再び表示されるようになります。`
              : `「${companyName}」のステータスを無効に変更します。無効にすると、店舗の紐づけ候補に表示されなくなります。変更履歴は保持され、後から再度有効化できます。`}
          </AlertDialogDescription>
          {!activating && (
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="fc-company-disable-reason" className="text-sm">
                無効化理由
              </Label>
              <Textarea
                id="fc-company-disable-reason"
                maxLength={DISABLE_REASON_MAX_LENGTH}
                placeholder="無効化理由を入力してください（任意）"
                rows={3}
                value={disableReason}
                onChange={(event) => setDisableReason(event.target.value)}
                className="max-h-40 overflow-y-auto wrap-anywhere"
              />
            </div>
          )}
        </div>
        <AlertDialogFooter className="shrink-0">
          <AlertDialogCancel disabled={mutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} onClick={handleConfirm}>
            {activating ? '有効にする' : '無効にする'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
