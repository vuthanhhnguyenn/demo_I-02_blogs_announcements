'use client';

// Client component: detail requires React Query fetch/mutation state and interactive dialogs.
import { useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getApiErrorCode, isRecordNotFoundError } from '@/lib/api-error.util';
import { adminSalesBillingControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { BillingBasicTab } from './_components/billing-basic-tab';
import { BillingDetailSkeleton } from './_components/billing-detail-skeleton';
import { BillingDocumentExportMenu } from './_components/billing-document-export-menu';
import { BillingHistoryTab } from './_components/billing-history-tab';
import { BILLING_ERROR_CODE } from './_utils/billing-detail-api.util';

export default function SalesDetailPage() {
  const params = useParams<{ id: string }>();
  // `[id]` is the billing UUID (`billingId`, API-114 §6) — `publicId` is display-only
  const billingId = params?.id ?? '';
  const [activeTab, setActiveTab] = useState('basic');

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminSalesBillingControllerDetailOptions({ path: { billingId } }),
    enabled: Boolean(billingId),
  });
  // A malformed id answers 400 E-VAL-001 naming `billingId`; an unknown one 404 E-BIL-001
  const isNotFound =
    isError &&
    (getApiErrorCode(error) === BILLING_ERROR_CODE.notFound ||
      isRecordNotFoundError(error, 'billingId'));
  const header = detail?.header;

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError && !isNotFound}
      isEmpty={isNotFound || !detail}
      onRetry={() => void refetch()}
      emptyTitle="請求が見つかりません"
      emptyDescription={`指定された請求ID（${billingId}）は存在しません。`}
      skeleton={<BillingDetailSkeleton />}
    >
      {detail && header && (
        <div className="flex flex-col">
          <PageHeader
            breadcrumb={<BackToListLink label="売上管理に戻る" listPath={navigate('/sales')} />}
            title={`請求 #${header.publicId}`}
            subtitle={
              <>
                <Link
                  href={navigate('/members/[id]', header.memberId)}
                  className="text-primary inline-flex items-center gap-0.5 align-middle underline-offset-2 hover:underline"
                >
                  {header.memberName ?? header.memberDisplayId ?? '—'}
                  <ArrowUpRight className="size-3" />
                </Link>
                {` — ${header.storeName ?? '—'}`}
              </>
            }
            actions={<BillingDocumentExportMenu header={header} items={detail.items} />}
          />

          <div className="px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
              <TabsList variant="line">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="history">変更履歴</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <BillingBasicTab detail={detail} />
              </TabsContent>

              <TabsContent value="history">
                <BillingHistoryTab detail={detail} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </DataStateBoundary>
  );
}
