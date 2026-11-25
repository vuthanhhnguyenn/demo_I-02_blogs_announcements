'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQueries } from '@tanstack/react-query';
import { AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Loading } from '@/components/common/data-state-boundary/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminBrandControllerSetFeeMasterActiveMutation,
  adminBrandControllerSubBrandDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { BrandDetailDto, SubBrandDto } from '@/lib/api-real/types.gen';

import { useBrandFeeCache } from '../_hooks/use-brand-fee-cache';
import type { BrandFeeGroup, BrandFeeSheetTarget } from '../_types/brand-fee.type';
import { buildFeeGroup } from '../_utils/brand-fee-group.util';
import { BrandFeeGroupEditSheet } from './brand-fee-group-edit-sheet';
import { FeeEmptyState } from './fee-empty-state';
import { FeeGroupCard } from './fee-group-card';
import { FeeGroupDeleteDialog } from './fee-group-delete-dialog';
import { FeeGroupDisableDialog } from './fee-group-disable-dialog';
import { UnregisteredFeeCard } from './unregistered-fee-card';

interface FeesTabProps {
  brandGroup: BrandDetailDto['brandGroup'];
  parentBrandName: string;
  subBrands: SubBrandDto[];
}

/**
 * One card per sub-brand, in `detail.subBrands` order (plan R2-D1). Each card reads its own
 * `GET .../sub-brands/{brandEnum}` — the same shape every fee write answers with — so a write
 * updates exactly one card's cache entry. A deleted master renders as the 未登録 card in place.
 */
export function FeesTab({ brandGroup, parentBrandName, subBrands }: FeesTabProps) {
  const [sheetTarget, setSheetTarget] = useState<BrandFeeSheetTarget | null>(null);
  const [disablingFeeGroup, setDisablingFeeGroup] = useState<BrandFeeGroup | null>(null);
  const [deletingFeeGroup, setDeletingFeeGroup] = useState<BrandFeeGroup | null>(null);
  const { applyCard, refetchCard } = useBrandFeeCache(brandGroup);

  const cards = useQueries({
    queries: subBrands.map((subBrand) =>
      adminBrandControllerSubBrandDetailOptions({
        path: { brandGroup, brandEnum: subBrand.brandEnum },
      }),
    ),
    // `combine` keeps `data` referentially stable until a card actually changes.
    combine: (results) => ({
      data: results.map((result) => result.data),
      // A card is "failed" only while it holds nothing to show; a failed background refetch keeps
      // rendering the data it already has.
      isFailed: results.map((result) => result.isError && result.data === undefined),
      isCardLoading: results.map((result) => result.isLoading),
      refetchers: results.map((result) => () => void result.refetch()),
    }),
  });

  const hasMultipleSubBrands = subBrands.length > 1;
  const feeGroups = useMemo(
    () =>
      subBrands.map((subBrand, index) =>
        buildFeeGroup({
          brandGroup,
          parentBrandName,
          hasMultipleSubBrands,
          subBrand,
          detail: cards.data[index],
        }),
      ),
    [brandGroup, parentBrandName, hasMultipleSubBrands, subBrands, cards.data],
  );

  // 有効化 is immediate (no dialog) — the prototype's choice for the harmless, reversible direction.
  const enableMutation = useMutation({
    ...adminBrandControllerSetFeeMasterActiveMutation(),
    onSuccess: (card) => {
      applyCard(card);
      const feeGroup = feeGroups.find((group) => group.subBrandEnum === card.brandEnum);
      if (feeGroup) toast.success(`「${feeGroup.title}」の費用マスタを有効化しました`);
    },
    // The master was deleted elsewhere: reconcile that card to 未登録 (the global handler toasts).
    onError: (error, variables) => {
      if (getApiErrorStatus(error) === 404) refetchCard(variables.path.brandEnum);
    },
  });

  // Nothing has settled yet — one tab-wide spinner; afterwards each card carries its own state.
  if (cards.isCardLoading.length > 0 && cards.isCardLoading.every(Boolean)) {
    return <Loading />;
  }

  return (
    <>
      {feeGroups.length === 0 ? (
        <FeeEmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {feeGroups.map((feeGroup, index) =>
            cards.isCardLoading[index] ? (
              <FeeCardLoading key={feeGroup.subBrandEnum} />
            ) : cards.isFailed[index] ? (
              <FeeCardError
                key={feeGroup.subBrandEnum}
                title={feeGroup.title}
                onRetry={cards.refetchers[index]}
              />
            ) : feeGroup.feeMasterStatus === 'none' ? (
              <UnregisteredFeeCard
                key={feeGroup.subBrandEnum}
                feeGroup={feeGroup}
                onRegister={(group) => setSheetTarget({ mode: 'register', feeGroup: group })}
              />
            ) : (
              <FeeGroupCard
                key={feeGroup.subBrandEnum}
                feeGroup={feeGroup}
                isEnabling={
                  enableMutation.isPending &&
                  enableMutation.variables?.path.brandEnum === feeGroup.subBrandEnum
                }
                onEdit={(group) => setSheetTarget({ mode: 'edit', feeGroup: group })}
                onDisable={setDisablingFeeGroup}
                onEnable={(group) =>
                  enableMutation.mutate({
                    path: { brandGroup, brandEnum: group.subBrandEnum },
                    body: { isActive: true },
                  })
                }
                onDelete={setDeletingFeeGroup}
              />
            ),
          )}
        </div>
      )}

      <BrandFeeGroupEditSheet
        brandGroup={brandGroup}
        target={sheetTarget}
        onOpenChange={(open) => {
          if (!open) setSheetTarget(null);
        }}
      />

      <FeeGroupDisableDialog
        brandGroup={brandGroup}
        feeGroup={disablingFeeGroup}
        onOpenChange={(open) => {
          if (!open) setDisablingFeeGroup(null);
        }}
      />

      <FeeGroupDeleteDialog
        brandGroup={brandGroup}
        feeGroup={deletingFeeGroup}
        onOpenChange={(open) => {
          if (!open) setDeletingFeeGroup(null);
        }}
      />
    </>
  );
}

function FeeCardLoading() {
  return (
    <Card>
      <CardContent className="flex min-h-32 items-center justify-center gap-2">
        <Loader2 className="text-primary size-5 animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">読み込み中...</p>
      </CardContent>
    </Card>
  );
}

/** A card whose GET failed — never rendered as 未登録 / ［＋登録］ / ¥0, since its state is unknown. */
function FeeCardError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
        <AlertTriangle className="text-destructive size-6" />
        <h3 className="text-destructive text-base font-semibold [overflow-wrap:anywhere]">
          {title}
        </h3>
        <p className="text-destructive text-sm font-medium">費用データを取得できませんでした</p>
        <p className="text-muted-foreground text-sm">
          ネットワーク接続を確認して再度お試しください。
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="border-destructive/20 hover:bg-destructive/10 mt-2 gap-2"
        >
          <RefreshCcw className="size-4" />
          再試行
        </Button>
      </CardContent>
    </Card>
  );
}
