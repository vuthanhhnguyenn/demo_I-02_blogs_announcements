'use client';

import { Suspense, useState } from 'react';

import { useParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import { parseAsStringEnum, useQueryState } from 'nuqs';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  adminBrandControllerDetailOptions,
  adminBrandControllerHistoryOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { UserRole } from '@/types/permission.type';

import { BrandFormSheet, type BrandFormTarget } from '../_components/brand-form-sheet';
import { isBrandGroup } from '../_constants/brand-real.constants';
import { BasicInfoTab } from './_components/basic-info-tab';
import { FeesTab } from './_components/fees-tab';
import { HISTORY_DEFAULT_PAGE_SIZE, HistoryTab } from './_components/history-tab';

const DETAIL_TABS = ['basic', 'fees', 'history'] as const;

const TAB_COUNT_BADGE_CLASS =
  'bg-muted-foreground/15 text-muted-foreground ml-1 min-w-5 border-transparent px-1 font-medium tabular-nums';

function BrandDetailPageContent() {
  const params = useParams();
  const { hasRole } = useAuthUser();

  // The route param is the brand group in Layer-2 UPPER notation (`/brands/JOYFIT`). Anything else
  // would only earn a 400 E-VAL-001 from the API, so it short-circuits to the empty state.
  const routeParam = params.id as string;
  const brandGroup = isBrandGroup(routeParam) ? routeParam : null;

  /**
   * 費用 and 変更履歴 answer E-AUTH-103 for the `staff` role (API-074 §6.3 — G-05's stricter rule
   * deliberately overrides Y-07's 権限マトリクス, which allowed staff read-only access). The tabs are
   * hidden rather than left to fail, matching the contracts/[id] precedent.
   */
  const canViewFees = hasRole([UserRole.System, UserRole.Headquarter, UserRole.Manager]);
  // `?variant=fees|history`; 基本情報 is the default and leaves the URL clean. Invalid values parse to
  // the default, and staff (no fee access) is forced back to 基本情報 below.
  const [requestedTab, setRequestedTab] = useQueryState(
    'variant',
    parseAsStringEnum([...DETAIL_TABS]).withDefault('basic'),
  );
  const activeTab = requestedTab !== 'basic' && !canViewFees ? 'basic' : requestedTab;

  const detailQuery = useQuery({
    ...adminBrandControllerDetailOptions({ path: { brandGroup: brandGroup ?? 'JOYFIT' } }),
    enabled: brandGroup !== null,
  });

  // Same key as the history tab's first page, so the two share one request.
  const historyQuery = useQuery({
    ...adminBrandControllerHistoryOptions({
      path: { brandGroup: brandGroup ?? 'JOYFIT' },
      query: { page: 1, limit: HISTORY_DEFAULT_PAGE_SIZE },
    }),
    enabled: brandGroup !== null && canViewFees,
  });

  const [editingBrand, setEditingBrand] = useState<BrandFormTarget | null>(null);

  const brand = brandGroup ? detailQuery.data : undefined;
  // Prototype 9/30 counts registered fee masters; a deleted one (`none`) shows as 未登録.
  const feeCount = brand?.subBrands.filter((sub) => sub.feeMasterStatus !== 'none').length ?? 0;
  const historyCount = historyQuery.data?.pagination.totalItems;

  return (
    <>
      {/* Not-found / error / loading states render no PageHeader, so keep a way back to the list. */}
      {!brand && !detailQuery.isLoading && (
        <div className="px-6 pt-4">
          <BackToListLink label="ブランド管理に戻る" listPath="/brands" />
        </div>
      )}
      <DataStateBoundary
        isLoading={detailQuery.isLoading && brandGroup !== null}
        isError={detailQuery.isError}
        isEmpty={!brand}
        onRetry={() => detailQuery.refetch()}
        emptyTitle="ブランドが見つかりません"
      >
        {brand && (
          <div className="bg-background flex min-h-0 flex-1 flex-col">
            <PageHeader
              breadcrumb={<BackToListLink label="ブランド管理に戻る" listPath="/brands" />}
              // No status badge: Y-07 defines no brand status, and prototype 9/30 dropped it.
              title={brand.displayName}
            />

            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                void setRequestedTab(value as (typeof DETAIL_TABS)[number]);
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex items-center justify-between gap-4 px-6 pt-4">
                <TabsList variant="line">
                  <TabsTrigger value="basic">基本情報</TabsTrigger>
                  {canViewFees && (
                    <TabsTrigger value="fees">
                      費用
                      <Badge variant="outline" className={TAB_COUNT_BADGE_CLASS}>
                        {feeCount}
                      </Badge>
                    </TabsTrigger>
                  )}
                  {canViewFees && (
                    <TabsTrigger value="history">
                      変更履歴
                      {historyCount !== undefined && (
                        <Badge variant="outline" className={TAB_COUNT_BADGE_CLASS}>
                          {historyCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="basic" className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
                <BasicInfoTab brand={brand} onEditBrand={() => setEditingBrand(brand)} />
              </TabsContent>

              {canViewFees && (
                <TabsContent value="fees" className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
                  {activeTab === 'fees' ? (
                    <FeesTab
                      brandGroup={brand.brandGroup}
                      parentBrandName={brand.displayName}
                      subBrands={brand.subBrands}
                    />
                  ) : null}
                </TabsContent>
              )}

              {canViewFees && (
                <TabsContent
                  value="history"
                  className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6"
                >
                  {activeTab === 'history' ? (
                    <HistoryTab brandGroup={brand.brandGroup} brandName={brand.displayName} />
                  ) : null}
                </TabsContent>
              )}
            </Tabs>

            <BrandFormSheet
              brand={editingBrand}
              onOpenChange={(open) => {
                if (!open) setEditingBrand(null);
              }}
            />
          </div>
        )}
      </DataStateBoundary>
    </>
  );
}

export default function BrandDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BrandDetailPageContent />
    </Suspense>
  );
}
