'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';
import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminQuestionnaireControllerDetailQueryKey,
  adminQuestionnaireControllerListOptions,
  adminQuestionnaireControllerListQueryKey,
  adminQuestionnaireControllerSetStatusMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { QuestionnaireListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { SurveyDisableDialog } from './[id]/_components/survey-disable-dialog';
import { SurveyListHeaderActions } from './_components/survey-list-header-actions';
import { SurveysFilters } from './_components/surveys-filters';
import { SurveysTableColumns } from './_components/surveys-table-columns';
import { SURVEY_REAL_STATUS_LABELS, SURVEY_RESPONSE_CATEGORY_LABELS } from './_constants/constants';
import {
  SURVEY_BRAND_GROUP_BY_URL_VALUE,
  SURVEY_BRAND_GROUP_LABELS,
} from './_constants/survey-brand-group';
import { SurveysFiltersProvider } from './_contexts/surveys-filters-context';
import { useSurveysFilters } from './_hooks/use-surveys-filters';

type SurveyRow = QuestionnaireListItemDto;

function SurveysPageContent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [disableTarget, setDisableTarget] = useState<SurveyRow | null>(null);
  const filtersHook = useSurveysFilters();
  const {
    filters,
    setFilters,
    queryParams,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchInput,
    hasActiveFilters,
    clearFilters,
  } = filtersHook;
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const runSetStatus = useInFlightGuard();

  const { data, error, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminQuestionnaireControllerListOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
  });

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
      setDisableTarget(null);
    },
    // Success or not, reload the server truth: a failed PATCH may mean the survey changed elsewhere.
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: adminQuestionnaireControllerListQueryKey() });
      // The detail screen (and the responses/analytics survey pickers) cache this survey's 状態 too.
      queryClient.invalidateQueries({
        queryKey: adminQuestionnaireControllerDetailQueryKey({ path: { id: variables.path.id } }),
      });
    },
  });

  const { mutateAsync: setSurveyStatus } = statusMutation;

  const surveys = data?.items ?? [];
  const pagination = data?.pagination;
  const totalSurveys = pagination?.totalItems ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  // Unfiltered baseline for the banner's 「全 N 件中」 (includeTotalAll=true → pagination.totalAllItems; surveys
  // have no store scope, so it is every survey). Never fall back to the filtered total: that would claim
  // nothing was filtered out. Absent → null → the banner drops its 「全 N 件中」 prefix.
  const totalAllSurveys = pagination?.totalAllItems ?? null;
  const filterSummary = [
    searchInput ? `"${searchInput}"` : '',
    filters.type ? SURVEY_RESPONSE_CATEGORY_LABELS[filters.type] : '',
    filters.brand ? SURVEY_BRAND_GROUP_LABELS[SURVEY_BRAND_GROUP_BY_URL_VALUE[filters.brand]] : '',
    filters.status ? SURVEY_REAL_STATUS_LABELS[filters.status] : '',
  ];

  useEffect(() => {
    if (!isFetching && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [isFetching, page, currentPage, setCurrentPage]);

  // A page past the last one (bookmark, or the filter shrank the result) returns no rows: jump to the
  // last real page instead of claiming that no survey exists.
  useEffect(() => {
    if (isFetching || isError || totalSurveys === 0 || surveys.length > 0 || currentPage <= 1)
      return;
    setCurrentPage(Math.max(1, Math.ceil(totalSurveys / limit)));
  }, [isFetching, isError, totalSurveys, surveys.length, currentPage, limit, setCurrentPage]);

  const sorting: SortingState = filters.sort_by
    ? [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }]
    : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    // 3rd click clears the sort for real (no `sort` / `order` sent), back to the API's newest-first order.
    if (next.length === 0) {
      setFilters({ sort_by: null, sort_order: null, page: 1 });
      return;
    }

    setFilters({
      sort_by: next[0].id as typeof filters.sort_by,
      sort_order: next[0].desc ? 'desc' : 'asc',
      page: 1,
    });
  };

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

  const columns: ColumnDef<SurveyRow>[] = useMemo(
    () =>
      SurveysTableColumns({
        onEditClick: (id) => {
          router.push(withReturnTo(navigate('/surveys/[id]/edit', id)));
        },
        onDisableClick: (survey) => {
          setDisableTarget(survey);
        },
        // Turning a survey back on loses nothing, so it skips the confirm dialog; a second active survey
        // on the same trigger is refused by the server (409 E-QST-010, shown by the global error toast).
        onEnableClick: (survey) => {
          // Two clicks in one tick would each send a PATCH before `isPending` re-renders.
          void runSetStatus(() =>
            setSurveyStatus({
              path: { id: survey.questionnaireId },
              body: { status: 'active' },
            }).catch(() => undefined),
          );
        },
      }),
    [router, withReturnTo, runSetStatus, setSurveyStatus],
  );

  return (
    <>
      <PageHeader title="アンケート管理" actions={<SurveyListHeaderActions />} />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Card className="gap-3 overflow-hidden rounded-xl border p-0">
          <div className="p-3 pb-0">
            <SurveysFiltersProvider value={filtersHook}>
              <SurveysFilters isFilterOpen={isFilterOpen} onFilterOpenChange={setIsFilterOpen} />
            </SurveysFiltersProvider>
          </div>

          {/* Hidden on a failed load: the counts come from `pagination`, which is absent, so it would
              announce 「0 件を抽出中」 when the request never returned a result to count. */}
          <FilterResultBanner
            show={hasActiveFilters && !isError}
            totalCount={totalAllSurveys}
            filteredCount={totalSurveys}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataTable
            columns={columns}
            data={surveys}
            isLoading={isLoading || statusMutation.isPending}
            isFetching={isFetching}
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            containerClassName={
              isFilterOpen ? 'max-h-[calc(100vh-330px)]' : 'max-h-[calc(100vh-286px)]'
            }
            emptyContent={
              isError ? (
                <Empty
                  title="アンケート一覧の取得に失敗しました"
                  description={resolveApiErrorMessage(error)}
                  {...listErrorAction}
                />
              ) : (
                <Empty
                  variant={hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="アンケート"
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              )
            }
            onRowClick={(row) => {
              if (disableTarget) {
                return;
              }
              router.push(withReturnTo(navigate('/surveys/[id]', row.questionnaireId)));
            }}
            tableOptions={{
              onSortingChange: handleSortingChange,
              manualSorting: true,
              state: { sorting },
            }}
          />

          {!isError && (
            <TablePaginationWithSize
              currentPage={page}
              total={totalSurveys}
              pageSize={limit}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>

      {disableTarget && (
        <SurveyDisableDialog
          showTrigger={false}
          open={Boolean(disableTarget)}
          isPending={statusMutation.isPending}
          onOpenChange={(open) => {
            if (!open) {
              setDisableTarget(null);
            }
          }}
          onConfirm={(reason) => {
            // Two clicks in one tick would each send a PATCH before `isPending` re-renders.
            void runSetStatus(() =>
              statusMutation
                .mutateAsync({
                  path: { id: disableTarget.questionnaireId },
                  body: { status: 'inactive', reason: reason || undefined },
                })
                .catch(() => undefined),
            );
          }}
        />
      )}
    </>
  );
}

export default function SurveysPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SurveysPageContent />
    </Suspense>
  );
}
