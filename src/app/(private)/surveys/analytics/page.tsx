'use client';

import { Suspense, useState } from 'react';

import { downloadCsv, getCsvFilenameFromContentDisposition } from '@/utils/csv.util';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { BreadcrumbNav } from '@/components/common/breadcrumb-nav';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { AdminQuestionnaireManagementApi090 } from '@/lib/api-real';
import {
  adminQuestionnaireControllerAggregateOptions,
  adminQuestionnaireControllerDetailOptions,
  adminQuestionnaireControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { SurveyAnalyticsFilters } from './_components/survey-analytics-filters';
import { SurveyAnalyticsKpiSummary } from './_components/survey-analytics-kpi-summary';
import { SurveyAnalyticsQuestionCards } from './_components/survey-analytics-question-cards';
import { SurveyAnalyticsFiltersProvider } from './_contexts/survey-analytics-filters-context';
import { useSurveyAnalyticsFilters } from './_hooks/use-survey-analytics-filters';

function SurveyAnalyticsPageContent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filtersHook = useSurveyAnalyticsFilters();
  const { filters, queryParams } = filtersHook;

  // The aggregate is per questionnaire: the one picked in the dropdown / carried in from the detail
  // screen, else the first questionnaire of the list.
  const carried = useQuery({
    ...adminQuestionnaireControllerDetailOptions({ path: { id: filters.survey_id } }),
    enabled: Boolean(filters.survey_id),
  });
  const searched = useQuery({
    ...adminQuestionnaireControllerListOptions({ query: { page: 1, limit: 1 } }),
    enabled: !filters.survey_id,
  });
  const target = filters.survey_id ? carried.data : searched.data?.items[0];
  const isPicking = filters.survey_id ? carried.isLoading : searched.isLoading;
  const questionnaireId = filters.survey_id || target?.questionnaireId || '';

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminQuestionnaireControllerAggregateOptions({
      path: { id: questionnaireId },
      query: queryParams,
    }),
    enabled: Boolean(questionnaireId),
  });

  // A lookup failure is an error, not an empty catalogue: show the retry state for it too.
  const isLookupError = filters.survey_id ? carried.isError : searched.isError;
  // 404 E-QST-001 = unknown survey, 400 = a malformed (non-UUID) id: "not found", not a network
  // failure (same rule as the lesson detail) — only other errors keep the retry state.
  const errorStatus = getApiErrorStatus(error) ?? getApiErrorStatus(carried.error);
  const isNotFound = filters.survey_id.length > 0 && (errorStatus === 404 || errorStatus === 400);
  const hasError = isError || isLookupError;
  const handleRetry = () => {
    if (filters.survey_id) void carried.refetch();
    else void searched.refetch();
    if (questionnaireId) void refetch();
  };

  // `isPending` only flips after a re-render, so clicks in the same tick need the in-flight guard.
  const runExport = useInFlightGuard();
  const exportMutation = useMutation({
    mutationFn: async () => {
      const { data: blob, response } =
        await AdminQuestionnaireManagementApi090.adminQuestionnaireControllerExportAggregate({
          path: { id: questionnaireId },
          query: queryParams,
          parseAs: 'blob',
          throwOnError: true,
        });
      return {
        // Swagger types the CSV body as `string`; with `parseAs: 'blob'` the runtime value is a Blob.
        // The file comes without a BOM (API §15), so it goes through as text to get one for Excel.
        csv: await (blob as unknown as Blob).text(),
        filename: getCsvFilenameFromContentDisposition(
          response.headers.get('content-disposition'),
          'questionnaire_aggregate.csv',
        ),
      };
    },
    onSuccess: ({ csv, filename }) => {
      downloadCsv(csv, filename);
      toast.success('集計結果CSVをダウンロードしました');
    },
  });

  return (
    <>
      <PageHeader
        breadcrumb={
          <BreadcrumbNav
            items={[{ label: 'アンケート管理', url: navigate('/surveys') }, { label: '集計分析' }]}
          />
        }
        title="アンケート集計分析"
        actions={
          <RoleGatedButton
            variant="outline"
            className="gap-1"
            requiredPermission={Permission.SurveysExport}
            disabled={
              exportMutation.isPending || !questionnaireId || isPicking || isLoading || hasError
            }
            onClick={() =>
              void runExport(() => exportMutation.mutateAsync().catch(() => undefined))
            }
          >
            <FileDown className="size-4" />
            {exportMutation.isPending ? '出力中...' : 'CSV出力'}
          </RoleGatedButton>
        }
      />

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-4">
        <SurveyAnalyticsFiltersProvider value={filtersHook}>
          <SurveyAnalyticsFilters
            isFilterOpen={isFilterOpen}
            onFilterOpenChange={setIsFilterOpen}
            surveyId={questionnaireId}
            surveyName={target?.name}
            totalResponses={data?.submittedCount}
          />
        </SurveyAnalyticsFiltersProvider>

        <DataStateBoundary
          isLoading={isPicking || (Boolean(questionnaireId) && isLoading)}
          isError={hasError && !isNotFound}
          isEmpty={isNotFound || !data?.questions.length}
          onRetry={handleRetry}
          emptyTitle={
            isNotFound ? '指定されたアンケートが見つかりません。' : '集計データが見つかりません'
          }
          emptyDescription={
            isNotFound
              ? 'アンケートは存在しないか、削除された可能性があります。'
              : '表示できる集計データがありません。'
          }
        >
          {data && (
            <div className="flex flex-col gap-4">
              <SurveyAnalyticsKpiSummary
                totalResponses={data.submittedCount}
                responseRatePct={data.responseRatePct}
              />
              <SurveyAnalyticsQuestionCards questions={data.questions} surveyId={questionnaireId} />
            </div>
          )}
        </DataStateBoundary>
      </div>
    </>
  );
}

export default function SurveyAnalyticsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SurveyAnalyticsPageContent />
    </Suspense>
  );
}
