'use client';

import { useRef, useState } from 'react';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useDebounce } from '@/hooks/use-debounce.hook';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminCampaignControllerDetailQueryKey,
  adminCampaignControllerHistoryQueryKey,
  adminCampaignControllerListQueryKey,
  adminPromotionCodeControllerCreateMutation,
  adminPromotionCodeControllerListOptions,
  adminPromotionCodeControllerListQueryKey,
  adminPromotionCodeControllerUpdateDescriptionMutation,
  adminPromotionCodeControllerUpdateStatusMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { PromotionCodeListItemDto } from '@/lib/api-real/types.gen';

import type { PromoCodeIssuerType, PromoCodeStatus } from '../../_constants/constants';
import {
  PROMO_CODE_SCOPE_UNSELECTED,
  type PromoCodeIssuanceValues,
} from '../_schemas/promo-code-issuance.schema';
import type { PromoCodeCampaignRef } from '../_utils/promo-code-campaign-ref';
import {
  type PromoCodeFieldError,
  toPromoCodeFieldErrors,
} from '../_utils/promo-code-server-errors';

const ALL = 'all';
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 25;

/** プロモーションコードタブの検索・発行・無効化をまとめる。 */
export function usePromoCodesTab(campaign: PromoCodeCampaignRef) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromoCodeStatus | typeof ALL>(ALL);
  const [issuerFilter, setIssuerFilter] = useState<PromoCodeIssuerType | typeof ALL>(ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [disableTarget, setDisableTarget] = useState<PromotionCodeListItemDto | null>(null);
  const [editTarget, setEditTarget] = useState<PromotionCodeListItemDto | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const listQuery = useQuery({
    // API-089 only supports a code-prefix match (G-06 FR-014: 前方一致) — no free-text `keyword`.
    ...adminPromotionCodeControllerListOptions({
      query: {
        campaignId: campaign.id,
        codePrefix: debouncedSearchQuery.trim() || undefined,
        status: statusFilter === ALL ? undefined : statusFilter,
        issuerType: issuerFilter === ALL ? undefined : issuerFilter,
        page: currentPage,
        limit: pageSize,
      },
    }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: adminPromotionCodeControllerListQueryKey() });
    void queryClient.invalidateQueries({ queryKey: adminCampaignControllerListQueryKey() });
    void queryClient.invalidateQueries({
      queryKey: adminCampaignControllerHistoryQueryKey({ path: { campaignId: campaign.id } }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminCampaignControllerDetailQueryKey({ path: { campaignId: campaign.id } }),
    });
  };

  const issueMutation = useMutation({
    ...adminPromotionCodeControllerCreateMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      toast.success('プロモーションコードを発行しました');
      setIssueDialogOpen(false);
      invalidate();
    },
  });

  const statusMutation = useMutation({
    ...adminPromotionCodeControllerUpdateStatusMutation(),
    onSuccess: () => {
      toast.success(`プロモーションコード「${disableTarget?.code ?? ''}」を無効化しました`);
      setDisableTarget(null);
      invalidate();
    },
  });

  const reEnableMutation = useMutation({
    ...adminPromotionCodeControllerUpdateStatusMutation(),
    onSuccess: () => {
      toast.success('プロモーションコードを有効化しました');
      invalidate();
    },
  });

  // API-089 §6a: description is the only editable content field of an issued code.
  const descriptionMutation = useMutation({
    ...adminPromotionCodeControllerUpdateDescriptionMutation(),
    onSuccess: () => {
      toast.success('プロモーションコードの説明を更新しました');
      setEditTarget(null);
      invalidate();
    },
  });

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const issueCode = (
    values: PromoCodeIssuanceValues,
    options?: { onFieldErrors?: (errors: PromoCodeFieldError[]) => void },
  ) => {
    if (values.scopeType === PROMO_CODE_SCOPE_UNSELECTED) return;
    const scopeType = values.scopeType;

    issueMutation.mutate(
      {
        body: {
          campaignId: values.campaignId,
          generationMethod: values.generationMethod,
          code: values.generationMethod === 'manual' ? values.code : undefined,
          description: values.description || null,
          scopeType,
          issuedStoreId: scopeType === 'issuer_store_only' ? values.issuedStoreId : null,
          brandEnum: campaign.brandEnum,
          validFrom: values.validFrom,
          validTo: values.validTo,
          maxUses: values.maxUses === '' ? null : Number(values.maxUses),
        },
      },
      {
        // An error the API ties to a field is shown under that field; anything else is toasted.
        onError: (error) => {
          const fieldErrors = toPromoCodeFieldErrors(error);
          if (fieldErrors.length > 0) {
            options?.onFieldErrors?.(fieldErrors);
            return;
          }
          toast.error(resolveApiErrorMessage(error));
        },
      },
    );
  };

  // ボタンの disabled は再描画後に効くため、同一 tick のダブルクリックは ref で弾く
  const isDisableInFlight = useRef(false);
  const disableCode = (reason: string) => {
    if (!disableTarget || isDisableInFlight.current) return;
    isDisableInFlight.current = true;
    statusMutation.mutate(
      {
        path: { promotionCodeId: disableTarget.id },
        body: { action: 'disable', reason },
      },
      { onSettled: () => (isDisableInFlight.current = false) },
    );
  };

  const reEnableCode = (promotionCodeId: string) => {
    reEnableMutation.mutate({
      path: { promotionCodeId },
      body: { action: 're_enable' },
    });
  };

  const updateDescription = (description: string) => {
    if (!editTarget) return;
    descriptionMutation.mutate({
      path: { promotionCodeId: editTarget.id },
      body: { description: description.trim() || null },
    });
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== ALL || issuerFilter !== ALL;

  return {
    promoCodes: listQuery.data?.items ?? [],
    // 発行数はフィルターに影響されない。一覧 API には totalAllItems が無いため、キャンペーン詳細の件数を使う。
    totalCount: campaign.promotionCodeCount,
    filteredCount: listQuery.data?.pagination.totalItems ?? 0,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    hasActiveFilters,

    searchQuery,
    setSearchQuery: (next: string) => {
      setSearchQuery(next);
      setCurrentPage(1);
    },
    statusFilter,
    setStatusFilter: (next: PromoCodeStatus | typeof ALL) => {
      setStatusFilter(next);
      setCurrentPage(1);
    },
    issuerFilter,
    setIssuerFilter: (next: PromoCodeIssuerType | typeof ALL) => {
      setIssuerFilter(next);
      setCurrentPage(1);
    },
    clearFilters: () => {
      setSearchQuery('');
      setStatusFilter(ALL);
      setIssuerFilter(ALL);
      setCurrentPage(1);
    },

    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: (next: number) => {
      setPageSize(next);
      setCurrentPage(1);
    },

    issueDialogOpen,
    setIssueDialogOpen,
    issueCode,
    isIssuing: issueMutation.isPending,

    disableTarget,
    setDisableTarget,
    disableCode,
    isDisabling: statusMutation.isPending,

    reEnableCode,
    isReEnabling: reEnableMutation.isPending,

    editTarget,
    setEditTarget,
    updateDescription,
    isUpdatingDescription: descriptionMutation.isPending,

    copiedCode,
    copyCode,
  };
}

export type PromoCodesTabHook = ReturnType<typeof usePromoCodesTab>;
