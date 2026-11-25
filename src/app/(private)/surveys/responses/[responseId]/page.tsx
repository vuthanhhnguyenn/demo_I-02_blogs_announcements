'use client';

import { useParams, useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminQuestionnaireControllerDetailOptions,
  adminQuestionnaireControllerGetResponseOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { SurveyResponseHistoryCard } from '../../_components/survey-response-history-card';
import {
  SURVEY_RESPONSE_ROW_STATUS_BADGE_CLASSES,
  SURVEY_RESPONSE_ROW_STATUS_LABELS,
  formatSurveyMemberName,
  getSurveyResponseRowStatus,
} from '../../_constants/constants';
import { ResponseAnswersSection } from './_components/response-answers-section';
import { ResponseBasicInfoSection } from './_components/response-basic-info-section';
import { ResponseDetailHeaderActions } from './_components/response-detail-header-actions';
import { ResponseDetailLayout } from './_components/response-detail-layout';
import { ResponseStatusSection } from './_components/response-status-section';

export default function SurveyResponseDetailPage() {
  const params = useParams();
  const responseId = params.responseId as string;
  // The answer is keyed by questionnaire + answer; callers put the questionnaire id in the query.
  const questionnaireId = useSearchParams().get('questionnaireId') ?? '';

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...adminQuestionnaireControllerGetResponseOptions({
      path: { id: questionnaireId, answerId: responseId },
    }),
    enabled: Boolean(questionnaireId),
  });

  // The response only lists the answered questions; the questionnaire supplies the full list so the
  // unanswered ones show as 未回答. Without it the section falls back to the answers alone.
  const { data: questionnaire } = useQuery({
    ...adminQuestionnaireControllerDetailOptions({ path: { id: questionnaireId } }),
    enabled: Boolean(questionnaireId),
  });

  if (isLoading) {
    return <DataStateBoundary isLoading isEmpty={false} />;
  }

  // 404 = unknown answer / questionnaire, 400 = a malformed (non-UUID) id, and no questionnaire in
  // the query means there is nothing to look up: all "not found", not a network failure.
  const errorStatus = getApiErrorStatus(error);
  const isNotFound = !questionnaireId || errorStatus === 404 || errorStatus === 400;
  const isError = Boolean(error) && !isNotFound;

  if (isError || !response) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          breadcrumb={
            <BackToListLink label="回答データに戻る" listPath={navigate('/surveys/responses')} />
          }
          title="個別回答詳細"
        />
        <DataStateBoundary
          isLoading={false}
          isError={isError}
          isEmpty={!response}
          onRetry={() => refetch()}
          emptyTitle="回答が見つかりません"
          emptyDescription="指定された回答は存在しないか、削除された可能性があります。"
        />
      </div>
    );
  }

  const status = getSurveyResponseRowStatus(response);
  const isCompleted = status === 'completed';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        breadcrumb={
          <BackToListLink label="回答データに戻る" listPath={navigate('/surveys/responses')} />
        }
        title={`${formatSurveyMemberName(response.member)} の回答`}
        badge={
          <Badge variant="outline" className={SURVEY_RESPONSE_ROW_STATUS_BADGE_CLASSES[status]}>
            <span
              className={cn('size-1.5 rounded-full', isCompleted ? 'bg-success' : 'bg-warning')}
            />
            {SURVEY_RESPONSE_ROW_STATUS_LABELS[status]}
          </Badge>
        }
        actions={
          <ResponseDetailHeaderActions
            memberId={response.member.memberId}
            surveyId={response.questionnaire.questionnaireId}
          />
        }
      />

      <main className="flex-1 overflow-auto px-6 py-4">
        <ResponseDetailLayout
          main={
            <>
              <ResponseBasicInfoSection response={response} />
              <ResponseAnswersSection
                answers={response.answers}
                questions={questionnaire?.questions}
              />
            </>
          }
          aside={
            <>
              <ResponseStatusSection status={status} submittedAt={response.submittedAt} />
              <SurveyResponseHistoryCard
                memberId={response.member.memberId}
                title="この会員の回答履歴"
                currentAnswerId={responseId}
              />
            </>
          }
        />
      </main>
    </div>
  );
}
