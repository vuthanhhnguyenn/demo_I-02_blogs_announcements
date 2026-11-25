'use client';

import { useState } from 'react';

import { useParams } from 'next/navigation';

import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { formatDateYYYYMMDD } from '@/utils/date.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { useStoreLabel } from '@/components/common/data-select-input';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { StatusCard } from '@/components/common/status-card';
import { Badge } from '@/components/ui/badge';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminQuestionnaireControllerDetailOptions,
  adminQuestionnaireControllerDetailQueryKey,
  adminQuestionnaireControllerListQueryKey,
  adminQuestionnaireControllerSetStatusMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

import {
  SURVEY_REAL_STATUS_BADGE_CLASSES,
  SURVEY_REAL_STATUS_LABELS,
  type SurveyRealStatus,
} from '../_constants/constants';
import { SurveyBasicInfoSection } from './_components/survey-basic-info-section';
import { SurveyDetailHeaderActions } from './_components/survey-detail-header-actions';
import { SurveyDetailLayout } from './_components/survey-detail-layout';
import { SurveyDisableDialog } from './_components/survey-disable-dialog';
import { SurveyQuestionsSection } from './_components/survey-questions-section';
import { SurveySummaryCard } from './_components/survey-summary-card';

export default function SurveyDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const surveyId = params.id as string;
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const {
    data: survey,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminQuestionnaireControllerDetailOptions({ path: { id: surveyId } }),
  });

  const { currentStoreId } = useCurrentStore();
  const isStoreScoped = currentStoreId !== ALL_STORES;
  const { label: currentStoreName } = useStoreLabel(isStoreScoped ? currentStoreId : null);

  // Two clicks in one tick reach the handler before `isPending` disables the button.
  const runSetStatus = useInFlightGuard();
  const statusMutation = useMutation({
    ...adminQuestionnaireControllerSetStatusMutation(),
    // Offline: fail right away (error toast) instead of queueing the PATCH until the network returns.
    networkMode: 'always',
    onSuccess: (survey, variables) => {
      // The PATCH answers with the updated survey: an edit form opened before the refetch below
      // lands must not start from the old 状態.
      queryClient.setQueryData(
        adminQuestionnaireControllerDetailQueryKey({ path: { id: variables.path.id } }),
        survey,
      );
      toast.success(
        variables.body.status === 'active'
          ? 'アンケートを有効化しました'
          : 'アンケートを無効化しました',
      );
      setDisableDialogOpen(false);
    },
    // Success or not, reload the server truth: a failed PATCH may mean the survey changed elsewhere.
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: adminQuestionnaireControllerDetailQueryKey({ path: { id: surveyId } }),
      });
      // The list shows this survey's 状態 and picks its 無効化 / 有効化 menu item by it.
      queryClient.invalidateQueries({ queryKey: adminQuestionnaireControllerListQueryKey() });
    },
  });

  if (isLoading) {
    return <DataStateBoundary isLoading isEmpty={false} />;
  }

  if (isError || !survey) {
    // 404 E-QST-001 = unknown survey, 400 = a malformed (non-UUID) id: both are "not found", not a
    // network failure — only other errors keep the retry state.
    const errorStatus = getApiErrorStatus(error);
    const isNotFound = errorStatus === 404 || errorStatus === 400;
    return (
      <DataStateBoundary
        isLoading={false}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !survey}
        onRetry={() => refetch()}
        emptyTitle="指定されたアンケートが見つかりません。"
        emptyState={{
          action: <BackToListLink label="アンケート管理に戻る" listPath={navigate('/surveys')} />,
        }}
      />
    );
  }

  const status = survey.status as SurveyRealStatus;
  const isInactive = status === 'inactive';
  const isOperational = survey.category === 'operational';
  const statusTone = isInactive ? 'muted' : 'success';
  const statusMeta = [
    `作成: ${formatDateYYYYMMDD(survey.createdAt, '—')}`,
    `最終回答: ${formatDateYYYYMMDD(survey.stats.lastAnsweredAt, '—')}`,
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={<BackToListLink label="アンケート管理に戻る" listPath={navigate('/surveys')} />}
        title={survey.name}
        badge={
          <Badge variant="outline" className={SURVEY_REAL_STATUS_BADGE_CLASSES[status]}>
            <span
              className={`size-1.5 rounded-full ${isInactive ? 'bg-muted-foreground' : 'bg-success'}`}
            />
            {SURVEY_REAL_STATUS_LABELS[status]}
          </Badge>
        }
        actions={<SurveyDetailHeaderActions surveyId={surveyId} category={survey.category} />}
      />

      <main className="flex-1 overflow-auto px-6 py-4">
        <SurveyDetailLayout
          main={
            <>
              <SurveyBasicInfoSection survey={survey} />
              <SurveyQuestionsSection
                questions={survey.questions}
                isStoreScoped={isStoreScoped}
                storeName={currentStoreName ?? undefined}
                storeId={currentStoreId}
              />
            </>
          }
          aside={
            <>
              <StatusCard
                tone={statusTone}
                icon={ClipboardList}
                label={SURVEY_REAL_STATUS_LABELS[status]}
                meta={statusMeta}
                action={
                  isInactive ? (
                    // Same gate as 無効化する. Turning a survey back on loses nothing, so no confirm dialog;
                    // a second active survey on the same trigger is refused (409 E-QST-010, global toast).
                    <RoleGatedButton
                      allowedRoles={
                        isOperational ? undefined : [UserRole.Headquarter, UserRole.System]
                      }
                      requiredPermission={isOperational ? Permission.SurveysDelete : undefined}
                      variant="outline"
                      size="sm"
                      fullWidth
                      disabled={statusMutation.isPending}
                      onClick={() => {
                        void runSetStatus(() =>
                          statusMutation
                            .mutateAsync({ path: { id: surveyId }, body: { status: 'active' } })
                            .catch(() => undefined),
                        );
                      }}
                    >
                      有効化する
                    </RoleGatedButton>
                  ) : (
                    <SurveyDisableDialog
                      category={survey.category}
                      isPending={statusMutation.isPending}
                      open={disableDialogOpen}
                      onOpenChange={setDisableDialogOpen}
                      onConfirm={(reason) => {
                        void runSetStatus(() =>
                          statusMutation
                            .mutateAsync({
                              path: { id: surveyId },
                              body: { status: 'inactive', reason: reason || undefined },
                            })
                            .catch(() => undefined),
                        );
                      }}
                    />
                  )
                }
              />
              <SurveySummaryCard
                totalResponses={survey.stats.totalResponseCount ?? 0}
                monthlyResponses={survey.stats.monthlyResponseCount ?? 0}
                responseRate={survey.stats.responseRatePct ?? null}
              />
            </>
          }
        />
      </main>
    </div>
  );
}
