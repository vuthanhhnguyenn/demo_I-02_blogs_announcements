'use client';

import { useState } from 'react';

import { useParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import { Ban, Check } from 'lucide-react';
import { parseAsStringEnum, useQueryState } from 'nuqs';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  adminStudioControllerDetailOptions,
  adminStudioControllerLinkedLessonsOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { UserRole } from '@/types/permission.type';

import { STUDIO_ERROR_CODE, STUDIO_KIND_BY_TYPE } from '../_utils/studio-api.util';
import { StudioBasicInfoCard } from './_components/studio-basic-info-card';
import { StudioDeleteDialog } from './_components/studio-delete-dialog';
import { StudioDetailHeaderActions } from './_components/studio-detail-header-actions';
import { StudioDetailSkeleton } from './_components/studio-detail-skeleton';
import { StudioHistoryTab } from './_components/studio-history-tab';
import { StudioImagesCard } from './_components/studio-images-card';
import { StudioLayoutCard } from './_components/studio-layout-card';
import { StudioLinkedLessonsCard } from './_components/studio-linked-lessons-card';
import { StudioUtilizationCard } from './_components/studio-utilization-card';

const STUDIO_STATUS_BADGE_CLASSES: Record<'active' | 'inactive', string> = {
  active: 'bg-success/15 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const STUDIO_TYPE_BADGE_CLASSES = {
  'studio-lesson': 'bg-info/10 text-info border-info/20',
  pt: 'bg-warning/10 text-warning border-warning/20',
  'body-care': 'bg-muted text-muted-foreground border-border',
} as const;

const DETAIL_TABS = ['basic', 'history'] as const;

/** API-110 §6.6: #11 utilization — HQ / manager / staff (D-03 KPI matrix: trainer ×, observer ×) */
const KPI_ROLES = [UserRole.System, UserRole.Headquarter, UserRole.Manager, UserRole.Staff];
/** API-110 §6.6: #12 change history — HQ / manager */
const HISTORY_ROLES = [UserRole.System, UserRole.Headquarter, UserRole.Manager];

export default function StudioDetailPage() {
  const params = useParams();
  const studioId = params.id as string;
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringEnum([...DETAIL_TABS]).withDefault('basic'),
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { hasRole } = useAuthUser();
  const canReadKpi = hasRole(KPI_ROLES);
  const canReadHistory = hasRole(HISTORY_ROLES);

  const {
    data: studioData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminStudioControllerDetailOptions({ path: { studioId } }),
    enabled: Boolean(studioId),
  });
  // Unknown, deleted or outside the caller's store scope (existence is not disclosed)
  const isNotFound = error?.code === STUDIO_ERROR_CODE.notFound;
  // Shared with the linked-lesson card (same query key): the status card count and the delete dialog
  const { data: linkedData } = useQuery({
    ...adminStudioControllerLinkedLessonsOptions({ path: { studioId } }),
    enabled: Boolean(studioId) && Boolean(studioData),
  });
  const linkedLessonCount = linkedData?.items.length ?? 0;

  if (!studioData && !isLoading && !isError) {
    return null;
  }

  const studio = studioData;
  if (!studio) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !studioData}
        onRetry={() => void refetch()}
        emptyTitle="スタジオが見つかりません"
        emptyDescription={`指定されたスタジオID（${studioId}）は存在しません。`}
        skeleton={<StudioDetailSkeleton />}
      />
    );
  }
  const studioKind = STUDIO_KIND_BY_TYPE[studio.studioType];
  const studioStatus = studio.isActive ? 'active' : 'inactive';
  const studioTypeLabel = {
    'studio-lesson': 'スタジオレッスン',
    pt: 'パーソナル',
    'body-care': 'ボディケア',
  }[studioKind];

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError && !isNotFound}
      isEmpty={isNotFound || !studioData}
      onRetry={() => void refetch()}
      emptyTitle="スタジオが見つかりません"
      emptyDescription={`指定されたスタジオID（${studioId}）は存在しません。`}
      skeleton={<StudioDetailSkeleton />}
    >
      <div className="flex flex-col">
        <PageHeader
          breadcrumb={<BackToListLink label="スタジオ管理に戻る" listPath={navigate('/studios')} />}
          title={studio.name}
          badge={
            <>
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', STUDIO_TYPE_BADGE_CLASSES[studioKind])}
              >
                {studioTypeLabel}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 text-xs font-medium',
                  STUDIO_STATUS_BADGE_CLASSES[studioStatus],
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    studio.isActive ? 'bg-success' : 'bg-muted-foreground',
                  )}
                />
                {studio.isActive ? '有効' : '無効'}
              </Badge>
            </>
          }
          actions={
            <StudioDetailHeaderActions
              studioId={studioId}
              onDelete={() => setShowDeleteDialog(true)}
            />
          }
        />

        <div className="px-6 py-4">
          <Tabs
            // A role without the history read (?tab=history in the URL) lands on 基本情報
            value={canReadHistory ? activeTab : 'basic'}
            onValueChange={(value) => void setActiveTab(value as (typeof DETAIL_TABS)[number])}
            className="gap-4"
          >
            <TabsList variant="line">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              {canReadHistory && <TabsTrigger value="history">変更履歴</TabsTrigger>}
            </TabsList>

            <TabsContent value="basic" className="pt-4">
              <div className="flex gap-6">
                <div className="min-w-0 flex-1 space-y-4">
                  <StudioBasicInfoCard studio={studio} />
                  <StudioLayoutCard studio={studio} />
                  <StudioImagesCard images={studio.images} />
                </div>

                <div className="w-[360px] shrink-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">ステータス</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center px-4">
                      <div
                        className={`mb-3 flex size-20 items-center justify-center rounded-full ${
                          studio.isActive ? 'bg-success/10' : 'bg-muted'
                        }`}
                      >
                        {studio.isActive ? (
                          <Check className="text-success size-10" />
                        ) : (
                          <Ban className="text-muted-foreground size-10" />
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`gap-1 text-xs font-medium ${
                          studio.isActive
                            ? 'bg-success/15 text-success border-success/20'
                            : 'bg-muted text-muted-foreground border-muted-foreground/20'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            studio.isActive ? 'bg-success' : 'bg-muted-foreground'
                          }`}
                        />
                        {studio.isActive ? '有効' : '無効'}
                      </Badge>
                      <p className="text-muted-foreground mt-3 text-xs">
                        リンクレッスン数：{linkedData ? `${linkedLessonCount}件` : '—'}
                      </p>
                    </CardContent>
                  </Card>

                  {canReadKpi && <StudioUtilizationCard studioId={studioId} />}

                  <StudioLinkedLessonsCard studioId={studioId} />
                </div>
              </div>
            </TabsContent>

            {canReadHistory && (
              <TabsContent value="history" className="pt-4">
                <StudioHistoryTab studioId={studioId} active={activeTab === 'history'} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <StudioDeleteDialog
          open={showDeleteDialog}
          studio={studio}
          assignedLessonCount={linkedLessonCount}
          onOpenChange={setShowDeleteDialog}
        />
      </div>
    </DataStateBoundary>
  );
}
