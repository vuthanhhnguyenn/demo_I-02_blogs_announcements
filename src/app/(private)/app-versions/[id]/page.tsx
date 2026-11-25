'use client';

import { use, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useBackToListHref } from '@/hooks/use-return-to.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminAppVersionControllerDetailOptions,
  adminAppVersionControllerDetailQueryKey,
  adminAppVersionControllerListQueryKey,
  adminAppVersionControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { AppVersionDeleteDialog } from '../_components/app-version-delete-dialog';
import {
  APP_VERSION_DETAIL_QUERY_PREFIX,
  formatAppVersionTitle,
} from '../_constants/app-version.constants';
import { AppVersionDetailHeaderActions } from './_components/app-version-detail-header-actions';
import { AppVersionDetailSkeleton } from './_components/app-version-detail-skeleton';
import { AppVersionInfoCard } from './_components/app-version-info-card';

type AppVersionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function AppVersionDetailPage({ params }: AppVersionDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const backToListHref = useBackToListHref(navigate('/app-versions'));
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    ...adminAppVersionControllerDetailOptions({ path: { id } }),
  });
  const isNotFound = getApiErrorStatus(error) === 404;

  // Drop the deleted setting's cached detail, or Back from the list shows it as live
  // until staleTime runs out. Only after unmount: removing it while mounted would flash the
  // not-found state before the list appears (same as `removeDeletedEquipmentQueries`).
  const deletedRef = useRef(false);
  useEffect(
    () => () => {
      if (deletedRef.current) {
        queryClient.removeQueries({
          queryKey: adminAppVersionControllerDetailQueryKey({ path: { id } }),
        });
      }
    },
    [queryClient, id],
  );

  const deleteMutation = useMutation({
    ...adminAppVersionControllerRemoveMutation(),
    onSuccess: () => {
      toast.success('アプリバージョンを削除しました');
      deletedRef.current = true;
      queryClient.invalidateQueries({ queryKey: adminAppVersionControllerListQueryKey() });
      // Every detail, since a later setting left blank carried over from the deleted one. Only
      // marked stale: this screen's own query is still mounted and would refetch into a 404.
      queryClient.invalidateQueries({
        queryKey: APP_VERSION_DETAIL_QUERY_PREFIX,
        refetchType: 'none',
      });
      router.push(backToListHref);
    },
  });

  if (!data || isLoading || isError) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || (!isLoading && !isError && !data)}
        onRetry={() => void refetch()}
        emptyTitle="アプリバージョンが見つかりません"
        skeleton={<AppVersionDetailSkeleton />}
      />
    );
  }

  const title = formatAppVersionTitle(data);

  return (
    <>
      <PageHeader
        breadcrumb={
          <BackToListLink
            label="アプリ配信バージョン管理に戻る"
            listPath={navigate('/app-versions')}
          />
        }
        title={title}
        subtitle={`ID: ${data.id}`}
        actions={
          // FR-M003: edit and delete are shown only while the setting is scheduled.
          data.status === 'scheduled' ? (
            <AppVersionDetailHeaderActions id={id} onDeleteClick={() => setDeleteOpen(true)} />
          ) : undefined
        }
      />
      <div className="bg-background min-h-0 flex-1 overflow-auto px-6 py-4">
        <AppVersionInfoCard data={data} />
      </div>

      <AppVersionDeleteDialog
        open={deleteOpen}
        targetName={title}
        onOpenChange={(open) => setDeleteOpen(open)}
        onConfirm={() => deleteMutation.mutateAsync({ path: { id } })}
        // The dialog stays open while the list loads; a late click must not send a second DELETE.
        isPending={deleteMutation.isPending || deleteMutation.isSuccess}
      />
    </>
  );
}
