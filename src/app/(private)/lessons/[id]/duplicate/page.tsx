'use client';

import { useParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';

import { adminLessonControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { LessonForm } from '../../_components/lesson-form/lesson-form';
import { LessonFormSkeleton } from '../../_components/lesson-form/lesson-form-skeleton';
import { detailRestrictionLabels, detailToFormValues } from '../../_utils/lesson-form.util';

export default function LessonDuplicatePage() {
  const params = useParams<{ id: string }>();
  const lessonId = params.id;

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminLessonControllerDetailOptions({ path: { lessonId } }),
    enabled: Boolean(lessonId),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <PageHeader
          breadcrumb={
            <BackToListLink label="レッスン内容管理に戻る" listPath={navigate('/lessons')} />
          }
          title="新規レッスン作成"
        />
        <LessonFormSkeleton />
      </div>
    );
  }

  // 404 E-LSM-001 (unknown / outside the brand scope) or 400 (not a UUID) → not found
  if (isError || !data) {
    return (
      <div className="flex flex-col">
        <PageHeader
          breadcrumb={
            <BackToListLink label="レッスン内容管理に戻る" listPath={navigate('/lessons')} />
          }
          title="エラー"
        />
        <DataStateBoundary
          isLoading={false}
          isError={isError}
          isEmpty={!data}
          onRetry={() => refetch()}
          emptyTitle="レッスン内容が見つかりません"
          emptyDescription="指定されたレッスン内容は存在しないか、削除された可能性があります。"
        />
      </div>
    );
  }

  const defaultValues = detailToFormValues(data, 'duplicate');

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={
          <BackToListLink label="レッスン内容管理に戻る" listPath={navigate('/lessons')} />
        }
        title="新規レッスン作成"
      />
      <LessonForm
        mode="duplicate"
        defaultValues={defaultValues}
        restrictionLabels={detailRestrictionLabels(data)}
      />
    </div>
  );
}
