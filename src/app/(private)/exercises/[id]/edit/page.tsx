'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { useBackToListHref } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { buttonVariants } from '@/components/ui/button';

import { isRecordNotFoundError } from '@/lib/api-error.util';
import { adminExerciseMasterControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { ExerciseForm } from '../../_components/exercise-form';

const PAGE_TITLE = 'エクササイズ 編集';

export default function ExerciseEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const backToListHref = useBackToListHref(navigate('/exercises'));

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminExerciseMasterControllerDetailOptions({ path: { id } }),
    enabled: Boolean(id),
  });

  if (isLoading) return <Loading />;

  if (isError || !data) {
    // 404 E-EXM-001 (or a malformed id) is a not-found state, not a retryable error (C-24).
    const isNotFound = !isError || isRecordNotFoundError(error, 'id');
    return (
      <div className="flex flex-col">
        <PageHeader
          breadcrumb={<BackLink label="エクササイズ管理に戻る" href={backToListHref} />}
          title={PAGE_TITLE}
        />
        {isNotFound ? (
          <Empty
            variant="empty"
            title="エクササイズが見つかりません"
            description="指定されたエクササイズは存在しないか、削除された可能性があります。"
            action={
              <Link
                href={backToListHref}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                エクササイズ管理に戻る
              </Link>
            }
          />
        ) : (
          <DataStateBoundary isLoading={false} isError isEmpty={false} onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ExerciseForm mode="edit" defaultDetail={data} />
    </div>
  );
}
