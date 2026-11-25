'use client';

// Client page: fetches the position detail to prefill the edit form
import { Suspense, use } from 'react';

import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';

import { adminStaffPermissionControllerGetPositionOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { PositionForm } from '../../_components/position-form/position-form';
import { isPositionNotFoundError } from '../../_utils/position-api.util';

type PositionEditPageProps = {
  params: Promise<{ id: string }>;
};

function PositionEditPageContent({ params }: Readonly<PositionEditPageProps>) {
  // 職位IDは uuid — ルートの値をそのまま使う
  const { id: positionId } = use(params);

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminStaffPermissionControllerGetPositionOptions({ path: { id: positionId } }),
    enabled: positionId.length > 0,
  });

  // 404 / E-STF-009 は「取得失敗」ではなく「見つかりません」として扱う。
  // BE が 404 に code を載せないケースがあるため HTTP ステータスでも判定する。
  const isNotFound = isError && isPositionNotFoundError(error);

  if (isLoading || isError || !data) {
    return (
      <>
        <PageHeader
          breadcrumb={
            <BackToListLink label="職位マスター管理に戻る" listPath={navigate('/positions')} />
          }
          title="職位 編集"
        />
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError && !isNotFound}
          isEmpty={isNotFound || !data}
          onRetry={() => void refetch()}
          errorTitle="職位の取得に失敗しました"
          emptyTitle="職位が見つかりませんでした"
        />
      </>
    );
  }

  return <PositionForm mode="edit" defaultDetail={data} />;
}

export default function PositionEditPage({ params }: Readonly<PositionEditPageProps>) {
  return (
    <Suspense fallback={<Loading />}>
      <PositionEditPageContent params={params} />
    </Suspense>
  );
}
