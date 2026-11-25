'use client';

import { useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

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

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminFcCompanyControllerDetailQueryKey,
  adminFcCompanyControllerListQueryKey,
  adminFcCompanyControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  FC_COMPANY_ERROR_CODE,
  getFcCompanyErrorCode,
  isFcCompanyNotFoundError,
} from '../../_utils/fc-company-api.util';

/** Shown when the BE refuses the delete because stores got linked meanwhile (E-FC-001) */
const SERVER_BLOCKED_REASON = '管轄店舗が存在するため';

interface FranchiseCompanyDeleteDialogProps {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
  blockedReason?: string | null;
  redirectOnSuccess?: boolean;
  /** 確認文の文言。UI v0 は詳細画面と一覧行メニューで言い回しが異なる（FR-031 はどちらも充足） */
  wording?: 'detail' | 'list';
}

export function FranchiseCompanyDeleteDialog({
  companyId,
  companyName,
  open,
  onOpenChange,
  onDeleted,
  blockedReason = null,
  redirectOnSuccess = true,
  wording = 'detail',
}: Readonly<FranchiseCompanyDeleteDialogProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);
  const [serverBlocked, setServerBlocked] = useState(false);
  const effectiveBlockedReason = blockedReason ?? (serverBlocked ? SERVER_BLOCKED_REASON : null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminFcCompanyControllerListQueryKey() });
    void queryClient.invalidateQueries({
      queryKey: adminFcCompanyControllerDetailQueryKey({ path: { id: companyId } }),
    });
  };

  const deleteMutation = useMutation({
    ...adminFcCompanyControllerRemoveMutation(),
    // E-FC-001 is rendered as the blocked variant of this dialog, not as a toast
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminFcCompanyControllerListQueryKey() });
      // Refetching the deleted detail while it is still mounted would flash "not found"
      if (!redirectOnSuccess) {
        void queryClient.invalidateQueries({
          queryKey: adminFcCompanyControllerDetailQueryKey({ path: { id: companyId } }),
        });
      }
      onOpenChange(false);
      onDeleted?.();
      if (redirectOnSuccess) {
        router.push(navigate('/franchise-companies'));
      }
    },
    onError: (error) => {
      if (getFcCompanyErrorCode(error) === FC_COMPANY_ERROR_CODE.hasActiveStores) {
        setServerBlocked(true);
        invalidate();
        return;
      }
      toast.error(resolveApiErrorMessage(error));
      // E-FC-002: already deleted elsewhere (another tab) — the outcome the user wanted is
      // already in place, so finish like the success flow: close, drop the stale row, and
      // leave the (now missing) detail screen
      if (isFcCompanyNotFoundError(error)) {
        void queryClient.invalidateQueries({ queryKey: adminFcCompanyControllerListQueryKey() });
        onOpenChange(false);
        onDeleted?.();
        if (redirectOnSuccess) {
          router.push(navigate('/franchise-companies'));
        }
      }
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleDelete = () => {
    // Ref guard (not just `deleteMutation.isPending`): two clicks dispatched in the
    // same tick both read the pre-mutate render state, so a state-only guard can
    // still let a second DELETE through.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    deleteMutation.mutate({
      path: { id: companyId },
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setServerBlocked(false);
        onOpenChange(next);
      }}
    >
      {/* A long unbroken company name must wrap inside the body — never widen the dialog
          past the viewport and push the buttons off-screen */}
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {effectiveBlockedReason ? 'FC企業を削除できません' : 'FC企業を削除しますか？'}
          </AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            「<span className="font-medium">{companyName}</span>」
            {/* FR-031: 論理削除であること・変更履歴が保持されることを明示する */}
            {effectiveBlockedReason ? (
              <>は削除できません。{effectiveBlockedReason}。</>
            ) : wording === 'detail' ? (
              <>を論理削除します。変更履歴は保持されます。</>
            ) : (
              <>を削除します。変更履歴は保持されます。この操作は取り消せません。</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {effectiveBlockedReason ? (
            <AlertDialogAction onClick={() => onOpenChange(false)}>閉じる</AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                削除する
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
