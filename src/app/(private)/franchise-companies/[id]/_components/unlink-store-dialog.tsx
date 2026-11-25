'use client';

import { useRef } from 'react';

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
  adminFcCompanyControllerDetailQueryKey,
  adminFcCompanyControllerHistoryQueryKey,
  adminFcCompanyControllerListQueryKey,
  adminFcCompanyControllerListStoresQueryKey,
  adminFcCompanyControllerUnassignStoreMutation,
  adminStoreControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { FC_COMPANY_ERROR_CODE, getFcCompanyErrorCode } from '../../_utils/fc-company-api.util';

interface UnlinkStoreDialogProps {
  companyId: string;
  store: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}

export function UnlinkStoreDialog({
  companyId,
  store,
  onOpenChange,
}: Readonly<UnlinkStoreDialogProps>) {
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: adminFcCompanyControllerDetailQueryKey({ path: { id: companyId } }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminFcCompanyControllerListStoresQueryKey({ path: { id: companyId } }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminFcCompanyControllerHistoryQueryKey({ path: { id: companyId } }),
    });
    void queryClient.invalidateQueries({ queryKey: adminFcCompanyControllerListQueryKey() });
    void queryClient.invalidateQueries({ queryKey: adminStoreControllerListQueryKey() });
  };

  const unlinkMutation = useMutation({
    ...adminFcCompanyControllerUnassignStoreMutation(),
    onSuccess: () => {
      refresh();
      toast.success(`「${store?.name ?? ''}」の紐づけを解除しました`);
      onOpenChange(false);
    },
    onError: (error) => {
      // E-FC-006: the store was already moved/unlinked elsewhere — show the current state
      if (getFcCompanyErrorCode(error) === FC_COMPANY_ERROR_CODE.storeNotLinked) {
        refresh();
        onOpenChange(false);
      }
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleUnlink = () => {
    if (!store || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    unlinkMutation.mutate({ path: { id: companyId, storeId: store.id } });
  };

  return (
    <AlertDialog open={store !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>店舗の紐づけを解除しますか？</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            「<span className="font-medium">{store?.name}</span>
            」をこのFC企業の管轄から外します。店舗自体は削除されません。変更は変更履歴に記録されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={unlinkMutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction disabled={unlinkMutation.isPending} onClick={handleUnlink}>
            解除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
