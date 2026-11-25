'use client';

import { useParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';

import {
  adminStudioControllerDetailOptions,
  adminStudioControllerLinkedLessonsOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { StudioForm } from '../../_components/studio-form/studio-form';
import { StudioFormSkeleton } from '../../_components/studio-form/studio-form-skeleton';
import { studioToFormValues } from '../../_utils/studio-form.util';

export default function StudioEditPage() {
  const params = useParams<{ id: string }>();
  const studioId = params.id;
  const backToListHref = useBackToListHref(navigate('/studios'));
  const withReturnTo = useWithReturnTo();
  const backToDetailHref = withReturnTo(navigate('/studios/[id]', studioId), backToListHref);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminStudioControllerDetailOptions({ path: { studioId } }),
    enabled: Boolean(studioId),
  });
  // The warning banner of a studio lessons run in (same read as the detail's linked-lesson card)
  const { data: linked } = useQuery({
    ...adminStudioControllerLinkedLessonsOptions({ path: { studioId } }),
    enabled: Boolean(studioId),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <PageHeader
          breadcrumb={<BackLink label="スタジオ詳細に戻る" href={backToDetailHref} />}
          title="読み込み中..."
        />
        <StudioFormSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col">
        <PageHeader
          breadcrumb={<BackLink label="スタジオ管理に戻る" href={backToDetailHref} />}
          title="エラー"
        />
        <DataStateBoundary
          isLoading={false}
          isError={isError}
          isEmpty={!data}
          onRetry={() => refetch()}
          emptyTitle="スタジオが見つかりません"
          emptyDescription="指定されたスタジオは存在しないか、削除された可能性があります。"
        />
      </div>
    );
  }

  const { defaultValues, layoutLocked } = studioToFormValues(data);

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={<BackLink label="スタジオ詳細に戻る" href={backToDetailHref} />}
        title="スタジオ編集"
      />
      <StudioForm
        // A refetch after a partial save brings a new updatedAt: remount so the form starts from it
        key={data.updatedAt}
        mode="edit"
        original={data}
        defaultValues={defaultValues}
        layoutLocked={layoutLocked}
        assignedLessonCount={linked?.items.length ?? 0}
      />
    </div>
  );
}
