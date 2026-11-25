'use client';
import { useState } from 'react';

import { formatDate } from '@/utils/format.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

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
  adminApplicationControllerCancelMutation,
  adminApplicationControllerListOptions,
  adminApplicationControllerListQueryKey,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { invalidateMemberContractReads } from '../_utils/member-cache.util';

// `CancelApplicationDto.cancelReason` caps at 500 on the server.
const ENROLLMENT_CANCEL_REASON_MAX_LENGTH = 500;

interface EnrollmentCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  memberNumber: string;
  usageStartDate?: string | null;
  /** Switches the screen to the 変更履歴 tab — target of the success toast's 「履歴を見る」 action. */
  onShowHistory: () => void;
}

/**
 * A-01 FR-026 入会取り消し — the C-01 FR-M008 cancellation of an approved enrollment whose usage
 * start date has not arrived. The operation is keyed by the enrollment application, which the
 * member detail does not carry, so the approved application is looked up by member first.
 */
export function EnrollmentCancelDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberNumber,
  usageStartDate,
  onShowHistory,
}: Readonly<EnrollmentCancelDialogProps>) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const applicationQuery = useQuery({
    ...adminApplicationControllerListOptions({
      query: { memberId, status: 'approved', limit: 1 },
    }),
    enabled: open,
  });
  const applicationId = applicationQuery.data?.items[0]?.applicationId;
  const applicationMissing = applicationQuery.isSuccess && !applicationId;

  const { acquire, release } = useSingleFlight();

  const { mutate, isPending } = useMutation({
    ...adminApplicationControllerCancelMutation(),
    onSettled: release,
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
    },
    onSuccess: () => {
      toast.success('入会を取り消しました', {
        description: '契約を無効化しました',
        action: { label: '履歴を見る', onClick: onShowHistory },
      });
      handleClose();
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      void queryClient.invalidateQueries({ queryKey: adminApplicationControllerListQueryKey() });
      void invalidateMemberContractReads(queryClient, memberId);
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setReason(''), 300);
  };

  // C-01 FR-M008: a cancellation filed from the CRM must carry its reason as evidence.
  const trimmedReason = reason.trim();

  const handleConfirm = () => {
    if (!applicationId || !trimmedReason || !acquire()) return;
    mutate({
      path: { applicationId },
      body: { cancelReason: trimmedReason, expectedStatus: 'approved' },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>入会を取り消しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            利用開始日前のため、退会申請ではなく入会・契約自体を取り消します。取り消し後は契約が無効になり、この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border px-4 py-3 text-sm">
          <dt className="text-muted-foreground text-xs">対象会員</dt>
          <dd className="min-w-0 font-medium wrap-anywhere">{memberName}</dd>
          <dt className="text-muted-foreground text-xs">会員ID</dt>
          <dd className="font-mono">{memberNumber}</dd>
          <dt className="text-muted-foreground text-xs">利用開始日</dt>
          <dd>{formatDate(usageStartDate)}</dd>
        </dl>

        {applicationMissing && (
          <p className="text-destructive text-xs">取り消し対象の入会申請が見つかりません</p>
        )}

        <div className="flex flex-col gap-2 px-1 pb-2">
          <Label htmlFor="enrollment-cancel-reason" className="text-sm font-medium">
            取消理由 <span className="text-destructive ml-1 text-xs">*</span>
          </Label>
          <Textarea
            id="enrollment-cancel-reason"
            rows={3}
            maxLength={ENROLLMENT_CANCEL_REASON_MAX_LENGTH}
            placeholder="例：本人都合により入会を取りやめ"
            // The shared Textarea is `field-sizing-content`: a long value stretched the dialog past
            // the viewport and an unbroken token widened it off-screen. Fix the box and scroll.
            className="field-sizing-fixed max-h-40 min-h-20 resize-none overflow-y-auto text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            disabled={isPending || !trimmedReason || !applicationId}
            onClick={handleConfirm}
          >
            入会を取り消す
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
