'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { REAL_MEMBER_TYPE_LABELS } from '@/app/(private)/members/_constants/constants';
import { useAuthUser } from '@/contexts/auth-user.context';
import { downloadCsv, getCsvFilenameFromContentDisposition } from '@/utils/csv.util';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { BackToListLink } from '@/components/common/back-to-list-link';
import { useStoreLabel } from '@/components/common/data-select-input';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import { AdminQuestionnaireManagementApi090 } from '@/lib/api-real';
import {
  adminQuestionnaireControllerDetailOptions,
  adminQuestionnaireResponseControllerListCrossResponsesOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { QuestionnaireResponseListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { SURVEY_RESPONSE_CATEGORY_LABELS } from '../_constants/constants';
import {
  SURVEY_BRAND_GROUP_BY_URL_VALUE,
  SURVEY_BRAND_GROUP_LABELS,
} from '../_constants/survey-brand-group';
import { SurveyResponsesFilters } from './_components/survey-responses-filters';
import { SurveyResponsesTableColumns } from './_components/survey-responses-table-columns';
import { SurveyResponsesFiltersProvider } from './_contexts/survey-responses-filters-context';
import { useSurveyResponsesFilters } from './_hooks/use-survey-responses-filters';

type SurveyResponseRow = QuestionnaireResponseListItemDto;

function SurveyResponsesPageContent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filtersHook = useSurveyResponsesFilters();
  const {
    queryParams,
    filterQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filters,
    searchTerm,
    clearFilters,
    lockedStoreId,
  } = filtersHook;
  const isStoreLocked = lockedStoreId.length > 0;
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  // A Trainer reaches this screen straight from the sidebar and cannot open the survey list
  const { hasPermission } = useAuthUser();
  const canViewSurveys = hasPermission(Permission.SurveysView);

  const { data, error, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminQuestionnaireResponseControllerListCrossResponsesOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
  });

  // A carried `survey_id` is checked on its own: the cross-survey list answers an unknown id with
  // an empty page, so the questionnaire detail is what tells "not found" from "no answers yet".
  const carried = useQuery({
    ...adminQuestionnaireControllerDetailOptions({ path: { id: filters.survey_id } }),
    enabled: Boolean(filters.survey_id),
  });
  const carriedStatus = getApiErrorStatus(carried.error);
  const isSurveyNotFound =
    filters.survey_id.length > 0 && (carriedStatus === 404 || carriedStatus === 400);

  const responses = isSurveyNotFound ? [] : (data?.items ?? []);
  const pagination = data?.pagination;
  const totalResponses = pagination?.totalItems ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  // A page past the last one (bookmark, or the filter shrank the result) returns no rows: pull the URL
  // back to the last real page. Only on a settled response: mid-flight `keepPreviousData` still
  // describes the previous page.
  useEffect(() => {
    if (isFetching || !pagination) return;
    const lastPage = Math.max(1, pagination.totalPages);
    if (currentPage > lastPage) setCurrentPage(lastPage);
  }, [isFetching, pagination, currentPage, setCurrentPage]);

  const targetSurveyName = filters.survey_id
    ? (carried.data?.name ?? responses[0]?.questionnaire.name)
    : undefined;

  const { label: storeLabel } = useStoreLabel(filters.store_id || null, {
    enabled: !isStoreLocked,
  });

  const hasPeriod = filters.period_from.length > 0 || filters.period_to.length > 0;
  const hasSearch = searchTerm.length > 0;
  const activeFilterCount = [
    hasPeriod,
    filters.brand !== null,
    filters.store_id.length > 0 && !isStoreLocked,
    filters.member_type !== null,
    filters.template_type !== null,
  ].filter(Boolean).length;
  const hasActiveConditions = activeFilterCount > 0 || hasSearch;
  const filterSummary = [
    hasPeriod
      ? `期間: ${filters.period_from || '指定なし'}〜${filters.period_to || '指定なし'}`
      : '',
    filters.brand ? SURVEY_BRAND_GROUP_LABELS[SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand]] : '',
    filters.store_id && !isStoreLocked ? (storeLabel ?? '') : '',
    filters.member_type ? REAL_MEMBER_TYPE_LABELS[filters.member_type] : '',
    filters.template_type ? SURVEY_RESPONSE_CATEGORY_LABELS[filters.template_type] : '',
  ];

  // What the failed-load block offers, by what went wrong (same rule as the member list): a request the
  // conditions made invalid (400/422) is not fixed by resending it, a refused one (403) has no way out
  // from here, anything else is worth retrying (it is a GET).
  const listErrorAction = (() => {
    const status = getApiErrorStatus(error);
    if (status === 403) return {};
    if (status === 400 || status === 422) {
      return { onAction: clearFilters, actionLabel: '条件をクリア' };
    }
    return { onAction: () => void refetch(), actionLabel: '再試行' };
  })();

  // A header store other than 全店舗 scopes the whole list to one store: the 店舗 column adds nothing.
  const columns: ColumnDef<SurveyResponseRow>[] = useMemo(
    () =>
      SurveyResponsesTableColumns().filter(
        (column) => !(isStoreLocked && column.id === 'store_name'),
      ),
    [isStoreLocked],
  );
  // `isPending` only flips after a re-render, so clicks in the same tick need the in-flight guard.
  const runExport = useInFlightGuard();
  const exportMutation = useMutation({
    mutationFn: async () => {
      const { data: blob, response } =
        await AdminQuestionnaireManagementApi090.adminQuestionnaireResponseControllerExportCrossResponses(
          { query: filterQuery, parseAs: 'blob', throwOnError: true },
        );
      return {
        // Swagger types the CSV body as `string`; with `parseAs: 'blob'` the runtime value is a Blob.
        // The file comes without a BOM (API §15), so it goes through as text to get one for Excel.
        csv: await (blob as unknown as Blob).text(),
        filename: getCsvFilenameFromContentDisposition(
          response.headers.get('content-disposition'),
          'questionnaire_responses.csv',
        ),
      };
    },
    onSuccess: ({ csv, filename }) => {
      downloadCsv(csv, filename);
      toast.success('CSVを出力しました');
    },
  });

  return (
    <>
      <PageHeader
        breadcrumb={
          filters.survey_id ? (
            <BackLink
              label="アンケート詳細に戻る"
              href={navigate('/surveys/[id]', filters.survey_id)}
            />
          ) : canViewSurveys ? (
            <BackToListLink label="アンケート管理に戻る" listPath={navigate('/surveys')} />
          ) : undefined
        }
        title="回答データ一覧"
        badge={<Badge variant="secondary">{totalResponses}件</Badge>}
        subtitle={targetSurveyName ? `対象: ${targetSurveyName}` : undefined}
        actions={
          <RoleGatedButton
            variant="outline"
            className="gap-1"
            requiredPermission={Permission.SurveysExport}
            disabled={exportMutation.isPending || isSurveyNotFound}
            onClick={() =>
              void runExport(() => exportMutation.mutateAsync().catch(() => undefined))
            }
          >
            <FileDown className="size-4" />
            {exportMutation.isPending ? '出力中...' : 'CSV出力'}
          </RoleGatedButton>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Card className="gap-3 overflow-hidden rounded-xl border p-0">
          <div className="p-3 pb-0">
            <SurveyResponsesFiltersProvider value={filtersHook}>
              <SurveyResponsesFilters
                isFilterOpen={isFilterOpen}
                onFilterOpenChange={setIsFilterOpen}
                activeFilterCount={activeFilterCount}
              />
            </SurveyResponsesFiltersProvider>
          </div>

          {/* Hidden when there is nothing to count (failed load, unknown survey): it would announce
              「0 件を抽出中」 about a request that never returned a result. */}
          <FilterResultBanner
            show={hasActiveConditions && !isError && !isSurveyNotFound}
            totalCount={data?.pagination.totalAllItems ?? null}
            filteredCount={totalResponses}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataTable
            columns={columns}
            data={responses}
            isLoading={isLoading}
            isFetching={isFetching}
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            emptyContent={
              isSurveyNotFound ? (
                <Empty
                  title="指定されたアンケートが見つかりません。"
                  description="アンケートが存在しないか、削除された可能性があります。"
                />
              ) : isError ? (
                <Empty
                  title="回答データの取得に失敗しました"
                  description={resolveApiErrorMessage(error)}
                  {...listErrorAction}
                />
              ) : (
                <Empty
                  variant={hasActiveConditions ? 'filtered' : 'empty'}
                  entityLabel="回答データ"
                  onAction={hasActiveConditions ? clearFilters : undefined}
                />
              )
            }
            containerClassName={
              isFilterOpen ? 'max-h-[calc(100vh-330px)]' : 'max-h-[calc(100vh-286px)]'
            }
            onRowClick={(row) => {
              router.push(
                withReturnTo(
                  navigate('/surveys/responses/[responseId]', row.answerId, {
                    questionnaireId: row.questionnaire.questionnaireId,
                  }),
                ),
              );
            }}
          />

          {totalResponses > 0 && !isError && !isSurveyNotFound && (
            <TablePaginationWithSize
              currentPage={page}
              total={totalResponses}
              pageSize={limit}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>
    </>
  );
}

export default function SurveyResponsesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SurveyResponsesPageContent />
    </Suspense>
  );
}
