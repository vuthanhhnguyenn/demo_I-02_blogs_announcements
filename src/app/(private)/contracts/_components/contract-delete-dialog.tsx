'use client';

import { useRouter } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import {
  deleteCrmMainContractsByIdMutation,
  getCrmMainContractsQueryKey,
} from '@/lib/api/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

interface ContractDeleteDialogProps {
  contractId: string;
  contractName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Detail screen navigates back to the list after deletion; the list stays put. */
  redirectToList?: boolean;
}

export function ContractDeleteDialog({
  contractId,
  contractName,
  open,
  onOpenChange,
  redirectToList = false,
}: Readonly<ContractDeleteDialogProps>) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const deleteMutation = useMutation({
    ...deleteCrmMainContractsByIdMutation(),
    onSuccess: (data) => {
      toast.success(data.message || `主契約マスタ「${contractName}」を削除しました`);
      queryClient.invalidateQueries({
        queryKey: getCrmMainContractsQueryKey(),
      });
      onOpenChange(false);
      if (redirectToList) router.push(navigate('/contracts'));
    },
    // The 409 raised for remaining contract holders / derived masters carries its reason
    // in the body, so surface that instead of a generic message.
    onError: (error) => {
      toast.error(error?.error || '主契約の削除に失敗しました');
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>主契約を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「<span className="text-foreground font-medium">{contractName}</span>
            」を削除します。この操作は元に戻せません。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate({ path: { id: contractId } })}
          >
            削除する
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
