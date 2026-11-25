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
import { adminBrandControllerSetFeeMasterActiveMutation } from '@/lib/api-real/@tanstack/react-query.gen';

import type { BrandGroup } from '../../_constants/brand-real.constants';
import { useBrandFeeCache } from '../_hooks/use-brand-fee-cache';
import type { BrandFeeGroup } from '../_types/brand-fee.type';
import { buildFeeItemsSummary, buildUnchangedItems } from '../_utils/fee-master-dialog.util';

interface FeeGroupDisableDialogProps {
  brandGroup: BrandGroup;
  feeGroup: BrandFeeGroup | null;
  onOpenChange: (open: boolean) => void;
}

/** 費用マスタの無効化 (Y-07 260928_v3 FR-001, G-05 運用方針「ステータス無効」). */
export function FeeGroupDisableDialog({
  brandGroup,
  feeGroup,
  onOpenChange,
}: FeeGroupDisableDialogProps) {
  const { applyCard, refetchCard } = useBrandFeeCache(brandGroup);

  // Keep showing the last fee group's details while the dialog animates closed.
  const [prevFeeGroup, setPrevFeeGroup] = useState(feeGroup);
  const [displayFeeGroup, setDisplayFeeGroup] = useState<BrandFeeGroup | null>(feeGroup);
  if (feeGroup !== prevFeeGroup) {
    setPrevFeeGroup(feeGroup);
    if (feeGroup) setDisplayFeeGroup(feeGroup);
  }

  const disableMutation = useMutation({
    ...adminBrandControllerSetFeeMasterActiveMutation(),
    onSuccess: (card) => {
      applyCard(card);
      if (displayFeeGroup)
        toast.success(`「${displayFeeGroup.title}」の費用マスタを無効にしました`);
      onOpenChange(false);
    },
    // Deleted elsewhere: reconcile the card to 未登録 and close (the global handler toasts).
    onError: (error, variables) => {
      if (getApiErrorStatus(error) !== 404) return;
      refetchCard(variables.path.brandEnum);
      onOpenChange(false);
    },
  });

  const handleConfirm = () => {
    if (!feeGroup) return;
    disableMutation.mutate({
      path: { brandGroup, brandEnum: feeGroup.subBrandEnum },
      body: { isActive: false },
    });
  };

  return (
    <AlertDialog
      open={!!feeGroup}
      onOpenChange={(open) => {
        if (!disableMutation.isPending) onOpenChange(open);
      }}
    >
      <AlertDialogContent className="min-w-0">
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle className="min-w-0 [overflow-wrap:anywhere]">
            {displayFeeGroup?.title} の費用マスタを無効にしますか？
          </AlertDialogTitle>
          {displayFeeGroup && (
            <AlertDialogDescription render={<div />} className="min-w-0 [overflow-wrap:anywhere]">
              <p>
                {displayFeeGroup.title} の費用マスタ（{buildFeeItemsSummary(displayFeeGroup)}
                ）を無効にします。新規入会の費用として使われなくなります。金額と予約中の改定は残り、「有効化」でいつでも戻せます。
              </p>
              <p className="text-foreground mt-4 font-medium">変わらないもの</p>
              <ul className="mt-2 ml-5 list-disc">
                {buildUnchangedItems(displayFeeGroup).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disableMutation.isPending}>キャンセル</AlertDialogCancel>
          <Button
            type="button"
            disabled={disableMutation.isPending || !feeGroup}
            onClick={handleConfirm}
          >
            無効にする
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
