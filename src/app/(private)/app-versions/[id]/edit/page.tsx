'use client';

import { use } from 'react';

import { useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminAppVersionControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { AppVersionForm } from '../../_components/app-version-form/app-version-form';
import { AppVersionFormSkeleton } from '../../_components/app-version-form/app-version-form-skeleton';
import { appVersionRecordToFormValues } from '../../_schemas/app-version-form.mapper';
import { APP_VERSION_NOT_SCHEDULED_REASON } from '../../_utils/app-version-server-errors.util';

interface AppVersionEditPageProps {
  params: Promise<{ id: string }>;
}

export default function AppVersionEditPage({ params }: AppVersionEditPageProps) {
  const { id } = use(params);

  const { data, isLoading, isError, error, refetch } = useQuery(
    adminAppVersionControllerDetailOptions({ path: { id } }),
  );
  const isNotFound = getApiErrorStatus(error) === 404;

  if (!data || isLoading || isError) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || (!isLoading && !isError && !data)}
        onRetry={() => refetch()}
        emptyTitle="アプリバージョンが見つかりません"
        emptyDescription="指定されたアプリバージョンは存在しないか、削除された可能性があります。"
        skeleton={<AppVersionFormSkeleton />}
      />
    );
  }

  // FR-M004: only a scheduled setting can be edited; one in effect or ended stays as history.
  if (data.status !== 'scheduled') {
    return (
      <DataStateBoundary
        isLoading={false}
        isEmpty
        emptyTitle="このバージョン設定は編集できません"
        emptyDescription={APP_VERSION_NOT_SCHEDULED_REASON}
      />
    );
  }

  return (
    <AppVersionForm mode="edit" defaultValues={appVersionRecordToFormValues(data)} versionId={id} />
  );
}
