'use client';
import { useRef, useState } from 'react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  adminMemberControllerAnonymizeMutation,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

/** The literal the API wants, which the operator also types to confirm (A-01 FR-018 v9). */
const PERSONAL_DATA_DELETE_CONFIRMATION = 'ANONYMIZE';
/** Mirrors the backend's 500-char cap on the audit reason (A-01 FR-018). */
const PERSONAL_DATA_DELETE_REASON_MAX_LENGTH = 500;
/** A few characters over the literal, so stray spaces do not make the field unfillable. */
const CONFIRMATION_INPUT_SLACK = 4;

/**
 * Absorb the ways the literal can be typed: surrounding spaces, lower case, and the full-width
 * letters an IME left in Japanese input mode produces. The check guards against a misclick, not
 * against the input mode.
 */
function normalizeConfirmationInput(value: string): string {
  return value
    .trim()
    .replace(/[Ａ-Ｚａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toUpperCase();
}

interface PersonalDataDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  /** The operator-facing member number, shown in the target summary. */
  memberNumber: string;
  memberName: string;
  memberStatusLabel: string;
  /** Whether the member is blacklisted — blocks deletion (A-01 FR-018) */
  isBlacklisted: boolean;
  /** Whether the member has unpaid fees — blocks deletion (A-01 FR-018) */
  hasUnpaidFee: boolean;
}

export function PersonalDataDeleteDialog({
  open,
  onOpenChange,
  memberId,
  memberNumber,
  memberName,
  memberStatusLabel,
  isBlacklisted,
  hasUnpaidFee,
}: Readonly<PersonalDataDeleteDialogProps>) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  // A second click lands before `isPending` re-renders the button disabled; a ref (not state)
  // is what the second handler call sees synchronously.
  const submittingRef = useRef(false);

  const { mutate, isPending } = useMutation({
    ...adminMemberControllerAnonymizeMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: () => {
      toast.success('個人情報を削除しました');
      handleClose();
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setReason('');
      setConfirmation('');
    }, 300);
  };

  const handleConfirm = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    mutate({
      path: { memberId },
      body: { reason: reason.trim(), confirmation: PERSONAL_DATA_DELETE_CONFIRMATION },
    });
  };

  // A-01 FR-018: blacklisted members and members with unpaid fees cannot be deleted
  const hasBlocker = isBlacklisted || hasUnpaidFee;
  const blockerMessage =
    isBlacklisted && hasUnpaidFee
      ? 'ブラックリスト登録者かつ未納金があるため削除できません'
      : isBlacklisted
        ? 'ブラックリスト登録者のため削除できません'
        : '未納金があるため削除できません';

  const isConfirmationValid =
    normalizeConfirmationInput(confirmation) === PERSONAL_DATA_DELETE_CONFIRMATION;
  const canSubmit = !hasBlocker && !isPending && !!reason.trim() && isConfirmationValid;

  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>個人情報を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            氏名・住所・連絡先等をダミー値に置換します。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex min-w-0 flex-col gap-3 px-1 pb-2">
          {/* Target member — same block the blacklist dialog shows, so both name what is at stake */}
          <div className="rounded-lg border p-3 text-sm">
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-1.5">
              <span className="text-muted-foreground self-center text-xs">対象会員</span>
              <span className="font-medium break-all">{memberName}</span>
              <span className="text-muted-foreground self-center text-xs">会員ID</span>
              <span className="font-mono text-xs break-all">{memberNumber}</span>
              <span className="text-muted-foreground self-center text-xs">ステータス</span>
              <span className="text-xs">{memberStatusLabel}</span>
            </div>
          </div>

          {hasBlocker ? (
            <Alert className="border-destructive/30 bg-destructive/10">
              <AlertDescription className="text-destructive text-xs">
                {blockerMessage}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="personal-data-delete-reason" className="text-sm font-medium">
                  削除理由 <span className="text-destructive ml-1 text-xs">*</span>
                </Label>
                <Textarea
                  id="personal-data-delete-reason"
                  rows={3}
                  maxLength={PERSONAL_DATA_DELETE_REASON_MAX_LENGTH}
                  placeholder="削除理由を入力してください..."
                  className="max-h-32 resize-none overflow-y-auto text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-muted-foreground text-xs">
                  操作履歴に記録されます（{PERSONAL_DATA_DELETE_REASON_MAX_LENGTH}文字以内）
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="personal-data-delete-confirmation" className="text-sm font-medium">
                  確認のため{' '}
                  <span className="font-mono font-semibold">
                    {PERSONAL_DATA_DELETE_CONFIRMATION}
                  </span>{' '}
                  と入力
                  <span className="text-destructive ml-1 text-xs">*</span>
                </Label>
                <Input
                  id="personal-data-delete-confirmation"
                  autoComplete="off"
                  maxLength={PERSONAL_DATA_DELETE_CONFIRMATION.length + CONFIRMATION_INPUT_SLACK}
                  placeholder={PERSONAL_DATA_DELETE_CONFIRMATION}
                  className="font-mono text-sm"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={!canSubmit} onClick={handleConfirm}>
            削除を実行
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
