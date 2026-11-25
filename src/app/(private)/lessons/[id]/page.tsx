'use client';

import { Suspense, useState } from 'react';

import { useParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';

import { useBackToListHref } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminLessonControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import { TAB_BY_LESSON_TYPE } from '../_utils/lesson-api.util';
import { LessonDeleteDialog } from './_components/lesson-delete-dialog';
import { LessonDetailHeaderActions } from './_components/lesson-detail-header-actions';
import { LessonDetailSkeleton } from './_components/lesson-detail-skeleton';
import { LessonHistoryTab } from './_components/lesson-history-tab';
import { LessonInfoTab } from './_components/lesson-info-tab';
import {
  LESSON_DETAIL_STATUS_LABELS,
  LESSON_TYPE_BADGE_CLASSES,
  LESSON_TYPE_BADGE_LABELS,
} from './_constants/constants';
import { useLessonDetailNav } from './_hooks/use-lesson-detail-nav';

const STATUS_BADGE_CLASSES: Record<'active' | 'inactive', string> = {
  active: 'bg-success/15 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

function LessonDetailPageContent() {
  const params = useParams<{ id: string }>();
  const { hasPermission } = useAuthUser();

  const lessonId = params.id;
  const backToListHref = useBackToListHref(navigate('/lessons'));
  const canViewHistory = hasPermission(Permission.LessonContentsHistoryView);
  const { tab, setTab, isFromSchedule } = useLessonDetailNav(canViewHistory);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Once the lesson is really deleted the screen only waits for the redirect: keep the last
  // detail on screen instead of letting a refetch turn it into the not-found state.
  const [isDeleted, setIsDeleted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminLessonControllerDetailOptions({ path: { lessonId } }),
    enabled: Boolean(lessonId) && !isDeleted,
  });

  if (isLoading) return <LessonDetailSkeleton />;

  if (isError || !data) {
    // 404 E-LSM-001 = unknown / deleted / out-of-scope lesson, 400 = a malformed (non-UUID) id:
    // both are "not found", not a network failure — only other errors keep the retry state.
    const errorStatus = getApiErrorStatus(error);
    const isNotFound = errorStatus === 404 || errorStatus === 400;
    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !data}
        onRetry={() => refetch()}
        emptyTitle="レッスン内容が見つかりません"
        emptyDescription="指定されたレッスン内容は存在しないか、削除された可能性があります。"
      />
    );
  }

  const detail = data;
  const statusKey = detail.isActive ? 'active' : 'inactive';
  const lessonTab = TAB_BY_LESSON_TYPE[detail.lessonType];

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={
          <BackLink
            label={isFromSchedule ? '予約管理に戻る' : 'レッスン内容に戻る'}
            href={isFromSchedule ? navigate('/lesson-schedules') : backToListHref}
          />
        }
        title={detail.name}
        badge={
          <>
            <Badge
              variant="outline"
              className={cn('gap-1 text-xs font-medium', STATUS_BADGE_CLASSES[statusKey])}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  detail.isActive ? 'bg-success' : 'bg-muted-foreground',
                )}
              />
              {LESSON_DETAIL_STATUS_LABELS[statusKey]}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-xs', LESSON_TYPE_BADGE_CLASSES[lessonTab])}
            >
              {LESSON_TYPE_BADGE_LABELS[lessonTab]}
            </Badge>
          </>
        }
        actions={<LessonDetailHeaderActions detail={detail} onDelete={() => setDeleteOpen(true)} />}
      />

      <div className="px-6 py-4">
        <Tabs
          value={tab}
          onValueChange={(value) => void setTab(value as typeof tab)}
          className="gap-4"
        >
          <TabsList variant="line">
            <TabsTrigger value="info">基本情報</TabsTrigger>
            {canViewHistory && <TabsTrigger value="history">変更履歴</TabsTrigger>}
          </TabsList>

          <TabsContent value="info">
            <LessonInfoTab detail={detail} />
          </TabsContent>

          {canViewHistory && (
            <TabsContent value="history">
              <LessonHistoryTab
                lessonId={lessonId}
                canViewHistory={canViewHistory}
                active={tab === 'history' && !isDeleted}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <LessonDeleteDialog
        lessonId={lessonId}
        lessonName={detail.name}
        upcomingScheduleCount={detail.scheduleCounts.upcomingScheduleCount}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => setIsDeleted(true)}
      />
    </div>
  );
}

export default function LessonDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LessonDetailPageContent />
    </Suspense>
  );
}
