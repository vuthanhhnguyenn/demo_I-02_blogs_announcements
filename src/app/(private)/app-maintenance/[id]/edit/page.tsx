'use client';

import { useParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';

import { getCrmAppMaintenancesByIdOptions } from '@/lib/api/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { AppMaintenanceForm } from '../../_components/app-maintenance-form/app-maintenance-form';
import { AppMaintenanceFormSkeleton } from '../../_components/app-maintenance-form/app-maintenance-form-skeleton';

export default function AppMaintenanceEditPage() {
  const params = useParams();
  const maintenanceId = params.id as string;

  const { data, isLoading, isError, refetch } = useQuery({
    ...getCrmAppMaintenancesByIdOptions({ path: { id: maintenanceId } }),
    enabled: Boolean(maintenanceId),
  });

  if (!data) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && !isError}
        onRetry={() => void refetch()}
        emptyTitle="メンテナンス情報が見つかりません"
        emptyDescription={`指定されたID（${maintenanceId}）のメンテナンス情報は存在しません。`}
        skeleton={<AppMaintenanceFormSkeleton />}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={
          <BackToListLink
            label="アプリメンテナンス管理に戻る"
            listPath={navigate('/app-maintenance')}
          />
        }
        title="アプリメンテナンス編集"
      />
      <AppMaintenanceForm
        mode="edit"
        maintenanceId={maintenanceId}
        currentStatus={data.status}
        defaultValues={{
          targetBrand: data.targetBrand,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          message: data.message,
        }}
      />
    </div>
  );
}
