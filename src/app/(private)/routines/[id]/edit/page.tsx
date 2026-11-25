'use client';

import { Suspense, use } from 'react';

import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminRoutineMasterControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { RoutineForm } from '../../_components/routine-form/routine-form';

type RoutineEditPageProps = {
  params: Promise<{ id: string }>;
};

function RoutineEditPageContent({ params }: RoutineEditPageProps) {
  const { id } = use(params);

  // The detail page leaves this query cached (and fresh), so without a forced refetch 編集 would
  // prefill from a routine that may have been deleted or changed meanwhile. The form reads its
  // defaultValues once, so it waits for the fresh fetch instead of rendering the cached copy.
  const { data, isLoading, isFetchedAfterMount, isError, error, refetch } = useQuery({
    ...adminRoutineMasterControllerDetailOptions({ path: { id } }),
    refetchOnMount: 'always',
  });

  const routine = data;
  const isAwaitingFreshData = !isFetchedAfterMount && !isError;

  if (isLoading || isAwaitingFreshData || isError || !routine) {
    // 404 / 400 (malformed id) = not found: never an empty form that could be submitted.
    const errorStatus = getApiErrorStatus(error);
    const isNotFound = errorStatus === 404 || errorStatus === 400;
    return (
      <>
        <PageHeader
          breadcrumb={
            <BackToListLink label="ルーティン管理に戻る" listPath={navigate('/routines')} />
          }
          title="ルーティン 編集"
        />
        <div className="px-6 py-4">
          <DataStateBoundary
            isLoading={isLoading || isAwaitingFreshData}
            isError={isError && !isNotFound}
            isEmpty={isNotFound || !routine}
            onRetry={() => void refetch()}
            errorTitle="ルーティンの取得に失敗しました"
            emptyTitle="ルーティンが見つかりませんでした"
            emptyDescription="削除されたか、存在しないルーティンです。"
          />
        </div>
      </>
    );
  }

  return <RoutineForm mode="edit" defaultDetail={routine} />;
}

export default function RoutineEditPage({ params }: RoutineEditPageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <RoutineEditPageContent params={params} />
    </Suspense>
  );
}
