'use client';

// Client page: nuqs cloneFrom param + React Query prefill drive the form
import { Suspense, useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';

import { adminStaffPermissionControllerGetPositionOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { PositionForm } from '../_components/position-form/position-form';

function PositionCreatePageContent() {
  // 複製モード (FR-013): /positions/create?cloneFrom={id} — URL駆動でリロードにも耐える
  const [cloneFromId] = useQueryState('cloneFrom', parseAsString);
  const isCloneRequested = cloneFromId !== null && cloneFromId !== '';

  const {
    data: cloneSource,
    isLoading,
    isError,
  } = useQuery({
    ...adminStaffPermissionControllerGetPositionOptions({ path: { id: cloneFromId ?? '' } }),
    enabled: isCloneRequested,
  });

  // 同じ cloneFrom で何度もトーストを出さない
  const notifiedCloneIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isCloneRequested || !isError) return;
    if (notifiedCloneIdRef.current === cloneFromId) return;
    notifiedCloneIdRef.current = cloneFromId;
    toast.error('複製元の職位が見つかりませんでした。新規作成として続行します');
  }, [isCloneRequested, isError, cloneFromId]);

  if (isCloneRequested && isLoading) {
    return (
      <>
        <PageHeader
          breadcrumb={
            <BackToListLink label="職位マスター管理に戻る" listPath={navigate('/positions')} />
          }
          title="職位 複製して作成"
        />
        <DataStateBoundary isLoading isEmpty={false} />
      </>
    );
  }

  // 複製元が見つからない/取得失敗 → 空の新規作成フォームへフォールバック (spec edge case)。
  // 黙って通常の新規作成になると利用者が気づけないため、理由を明示する。
  if (isCloneRequested && !isError && cloneSource) {
    return <PositionForm mode="clone" defaultDetail={cloneSource} />;
  }

  return <PositionForm mode="create" />;
}

export default function PositionCreatePage() {
  return (
    <Suspense fallback={<Loading />}>
      <PositionCreatePageContent />
    </Suspense>
  );
}
