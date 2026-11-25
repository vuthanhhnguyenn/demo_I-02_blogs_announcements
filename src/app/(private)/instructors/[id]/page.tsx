'use client';

import { useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  adminTrainerControllerDetailOptions,
  adminTrainerControllerSummaryOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { COACH_TYPE_LABELS, INSTRUCTOR_ERROR_CODE, fullName } from '../_utils/instructor-api.util';
import { InstructorAssignedLessonsCard } from './_components/instructor-assigned-lessons-card';
import { InstructorBasicInfoCard } from './_components/instructor-basic-info-card';
import { InstructorBufferSettingsCard } from './_components/instructor-buffer-settings-card';
import { InstructorCrmLinkCard } from './_components/instructor-crm-link-card';
import { InstructorDeleteDialog } from './_components/instructor-delete-dialog';
import { InstructorDetailSkeleton } from './_components/instructor-detail-skeleton';
import { InstructorHistoryTab } from './_components/instructor-history-tab';
import { InstructorPerformanceSummaryCard } from './_components/instructor-performance-summary-card';
import { InstructorProfileCard } from './_components/instructor-profile-card';
import { InstructorStatusCard } from './_components/instructor-status-card';
import { InstructorUpcomingScheduleCard } from './_components/instructor-upcoming-schedule-card';

/** API-109 #8 change history — HQ / manager (403 E-TRN-101 otherwise, D12) */
const HISTORY_ROLES = [UserRole.System, UserRole.Headquarter, UserRole.Manager];

export default function InstructorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const backToListHref = useBackToListHref(navigate('/instructors'));
  const withReturnTo = useWithReturnTo();
  const instructorId = params.id as string;
  const fromContext = searchParams.get('from');
  const fromLessonDetail = fromContext === 'lesson-detail';
  const lessonName = searchParams.get('lessonName');
  const backLabel = fromLessonDetail
    ? lessonName
      ? `${lessonName}に戻る`
      : 'レッスン詳細に戻る'
    : '指導者管理に戻る';
  const [activeTab, setActiveTab] = useState('basic');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { user, hasRole } = useAuthUser();
  const canReadHistory = hasRole(HISTORY_ROLES);

  const {
    data: instructor,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminTrainerControllerDetailOptions({ path: { trainerId: instructorId } }),
    enabled: Boolean(instructorId),
  });
  // Unknown, deleted or outside the caller's scope (existence is not disclosed); a malformed id
  // (e.g. an old mock link) answers E-VAL-001 and is just as absent
  const isNotFound = error?.code === INSTRUCTOR_ERROR_CODE.notFound || error?.code === 'E-VAL-001';

  const { data: summary } = useQuery({
    ...adminTrainerControllerSummaryOptions({ path: { trainerId: instructorId } }),
    enabled: Boolean(instructor),
  });

  if (!instructor) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !instructor}
        onRetry={() => void refetch()}
        emptyTitle="指導者が見つかりません"
        emptyDescription={`指定された指導者ID（${instructorId}）は存在しないか、参照権限がありません。`}
        skeleton={<InstructorDetailSkeleton />}
      />
    );
  }

  // The trainer row's linked CRM account is the signed-in staff (D14)
  const isSelf = instructor.staffId !== null && user?.id === instructor.staffId;
  const instructorFullName = fullName(instructor);

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError && !isNotFound}
      isEmpty={isNotFound || !instructor}
      onRetry={() => void refetch()}
      emptyTitle="指導者が見つかりません"
      emptyDescription={`指定された指導者ID（${instructorId}）は存在しないか、参照権限がありません。`}
      skeleton={<InstructorDetailSkeleton />}
    >
      <div className="flex flex-col">
        <PageHeader
          breadcrumb={
            fromLessonDetail ? (
              <BackLink label={backLabel} onClick={() => router.back()} />
            ) : (
              <BackLink label={backLabel} href={backToListHref} />
            )
          }
          title={instructorFullName}
          badge={
            <>
              {instructor.coachTypes.map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="bg-info/10 text-info border-info/20 text-[11px]"
                >
                  {COACH_TYPE_LABELS[role]}
                </Badge>
              ))}
              {instructor.isActive ? (
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/20 text-[11px]"
                >
                  有効
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground border-muted-foreground/20 text-[11px]"
                >
                  無効
                </Badge>
              )}
            </>
          }
          actions={
            <div className="flex items-center gap-2">
              <RoleGatedButton
                allowedRoles={[UserRole.System, UserRole.Headquarter, UserRole.Manager]}
                denyTooltip="削除は本部・マネージャーのみ可能です"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive gap-1"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="size-4" />
                削除
              </RoleGatedButton>
              <RoleGatedButton
                allowedRoles={
                  isSelf
                    ? [
                        UserRole.System,
                        UserRole.Headquarter,
                        UserRole.Manager,
                        UserRole.Staff,
                        UserRole.Trainer,
                      ]
                    : [UserRole.System, UserRole.Headquarter, UserRole.Manager, UserRole.Staff]
                }
                denyTooltip="編集権限がありません"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  router.push(
                    withReturnTo(navigate('/instructors/[id]/edit', instructorId), backToListHref),
                  )
                }
              >
                <Pencil className="size-4" />
                編集
              </RoleGatedButton>
            </div>
          }
        />

        <div className="px-6 py-4">
          <Tabs
            value={canReadHistory ? activeTab : 'basic'}
            onValueChange={setActiveTab}
            className="gap-4"
          >
            <TabsList variant="line">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              {canReadHistory && <TabsTrigger value="history">変更履歴</TabsTrigger>}
            </TabsList>

            <TabsContent value="basic" className="pt-4">
              <div className="flex gap-6">
                <div className="min-w-0 flex-1 space-y-4">
                  <InstructorBasicInfoCard instructor={instructor} />
                  <InstructorCrmLinkCard linkedStaff={instructor.linkedStaff} />
                  <InstructorProfileCard instructor={instructor} />
                  <InstructorBufferSettingsCard instructor={instructor} />
                </div>

                <div className="w-90 shrink-0 space-y-4">
                  <InstructorStatusCard instructor={instructor} />
                  <InstructorPerformanceSummaryCard summary={summary} />
                  <InstructorAssignedLessonsCard lessons={summary?.assignedLessons} />
                  <InstructorUpcomingScheduleCard
                    trainerId={instructor.id}
                    instructorName={instructorFullName}
                    assignedLessons={summary?.assignedLessons ?? []}
                  />
                </div>
              </div>
            </TabsContent>

            {canReadHistory && (
              <TabsContent value="history" className="pt-4">
                <InstructorHistoryTab
                  instructor={instructor}
                  instructorName={instructorFullName}
                  active={activeTab === 'history'}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <InstructorDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          instructor={instructor}
          instructorName={instructorFullName}
        />
      </div>
    </DataStateBoundary>
  );
}
