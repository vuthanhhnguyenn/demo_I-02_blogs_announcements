'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';
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

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminBrandControllerDeleteFeeMasterMutation } from '@/lib/api-real/@tanstack/react-query.gen';

import type { BrandGroup } from '../../_constants/brand-real.constants';
import { useBrandFeeCache } from '../_hooks/use-brand-fee-cache';
import type { BrandFeeGroup } from '../_types/brand-fee.type';
import {
  buildFeeItemsSummary,
  buildUnchangedItems,
  countScheduledChanges,
} from '../_utils/fee-master-dialog.util';

interface FeeGroupDeleteDialogProps {
  brandGroup: BrandGroup;
  feeGroup: BrandFeeGroup | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * 費用マスタの物理削除 (Y-07 260928_v3 FR-001, G-05 運用方針「物理削除」). The sub-brand stays; its
 * card turns into the 未登録 card with ［＋登録］.
 */
export function FeeGroupDeleteDialog({
  brandGroup,
  feeGroup,
  onOpenChange,
}: FeeGroupDeleteDialogProps) {
  const { refetchCard } = useBrandFeeCache(brandGroup);

  // Keep showing the last fee group's details while the dialog animates closed.
  const [prevFeeGroup, setPrevFeeGroup] = useState(feeGroup);
  const [displayFeeGroup, setDisplayFeeGroup] = useState<BrandFeeGroup | null>(feeGroup);
  if (feeGroup !== prevFeeGroup) {
    setPrevFeeGroup(feeGroup);
    if (feeGroup) setDisplayFeeGroup(feeGroup);
  }

  const deleteMutation = useMutation({
    ...adminBrandControllerDeleteFeeMasterMutation(),
    onSuccess: (_data, variables) => {
      refetchCard(variables.path.brandEnum);
      if (displayFeeGroup) toast.success(`「${displayFeeGroup.title}」の費用マスタを削除しました`);
      onOpenChange(false);
    },
    // Already deleted elsewhere: reconcile the card to 未登録 and close (the global handler toasts).
    onError: (error, variables) => {
      if (getApiErrorStatus(error) !== 404) return;
      refetchCard(variables.path.brandEnum);
      onOpenChange(false);
    },
  });

  const handleConfirm = () => {
    if (!feeGroup) return;
    deleteMutation.mutate({ path: { brandGroup, brandEnum: feeGroup.subBrandEnum } });
  };

  const scheduledCount = displayFeeGroup ? countScheduledChanges(displayFeeGroup) : 0;

  return (
    <AlertDialog
      open={!!feeGroup}
      onOpenChange={(open) => {
        if (!deleteMutation.isPending) onOpenChange(open);
      }}
    >
      <AlertDialogContent className="min-w-0">
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle className="min-w-0 [overflow-wrap:anywhere]">
            {displayFeeGroup?.title} の費用マスタを削除しますか？
          </AlertDialogTitle>
          {displayFeeGroup && (
            <AlertDialogDescription render={<div />} className="min-w-0 [overflow-wrap:anywhere]">
              <p>
                {displayFeeGroup.title} の費用マスタ（{buildFeeItemsSummary(displayFeeGroup)}
                {scheduledCount > 0 && `、予約中の改定 ${scheduledCount}件`}）を削除します。
                {displayFeeGroup.ownerName} には費用マスタが無い状態になり、元に戻せません。
                {displayFeeGroup.feeMasterStatus === 'active' &&
                  '一時的に止めるだけなら「費用マスタを無効化」を使ってください。'}
              </p>
              <p className="text-foreground mt-4 font-medium">変わらないもの</p>
              <ul className="mt-2 ml-5 list-disc">
                {[...buildUnchangedItems(displayFeeGroup), 'これまでの変更履歴'].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteMutation.isPending || !feeGroup}
            onClick={handleConfirm}
          >
            削除する
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
