'use client';

import { Suspense } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { adminCampaignControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import {
  CAMPAIGN_ACCEPTING_STATUS_BADGE_CLASSES,
  CAMPAIGN_ACCEPTING_STATUS_LABELS,
} from '../_constants/constants';
import { BasicInfoTab } from './_components/basic-info-tab';
import { CampaignDetailSkeleton } from './_components/campaign-detail-skeleton';
import { HistoryTab } from './_components/history-tab';
import { PromoCodeSection } from './_components/promo-code-section';
import { toPromoCodeCampaignRef } from './_utils/promo-code-campaign-ref';

const TAB_VALUES = ['basic', 'promo', 'history'] as const;

function CampaignDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/campaigns'));
  const withReturnTo = useWithReturnTo();
  const searchParams = useSearchParams();

  const campaignId = params.id as string;
  const tabParam = searchParams.get('tab');
  const defaultTab = TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number])
    ? (tabParam as (typeof TAB_VALUES)[number])
    : 'basic';

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminCampaignControllerDetailOptions({ path: { campaignId } }),
  });

  if (isLoading) {
    return <CampaignDetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError}
        isEmpty={!data}
        onRetry={() => refetch()}
        emptyTitle="キャンペーンが見つかりません"
      />
    );
  }

  const campaign = data;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackLink label="キャンペーン管理に戻る" href={backToListHref} />}
        title={campaign.name}
        badge={
          <Badge
            variant="outline"
            className={cn(
              'gap-1 text-xs font-medium',
              CAMPAIGN_ACCEPTING_STATUS_BADGE_CLASSES[campaign.acceptingStatus],
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {CAMPAIGN_ACCEPTING_STATUS_LABELS[campaign.acceptingStatus]}
          </Badge>
        }
        actions={
          /* G-03 L193: キャンペーン登録・受付フラグ制御は HQ/Sys のみ。削除は G-03 に FR が無いため導線を置かない（運用は受付停止＋新規追加） */
          <RoleGatedButton
            requiredPermission={Permission.CampaignsEdit}
            variant="default"
            className="gap-1"
            onClick={() =>
              router.push(
                withReturnTo(navigate('/campaigns/[id]/edit', campaignId), backToListHref),
              )
            }
          >
            <Pencil className="size-4" />
            編集
          </RoleGatedButton>
        }
      />

      <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="promo">プロモーションコード</TabsTrigger>
            <TabsTrigger value="history">変更履歴</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic" className="min-h-0 flex-1 overflow-y-auto px-6 pt-0 pb-4">
          <BasicInfoTab campaign={campaign} />
        </TabsContent>

        <TabsContent value="promo" className="min-h-0 flex-1 overflow-y-auto px-6 pt-0 pb-4">
          <PromoCodeSection campaign={toPromoCodeCampaignRef(campaign)} />
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-6 pt-0 pb-4">
          <HistoryTab campaignId={campaignId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CampaignDetailPage() {
  return (
    <Suspense fallback={<CampaignDetailSkeleton />}>
      <CampaignDetailPageContent />
    </Suspense>
  );
}
