'use client';
// Client component: the announcement is fetched with React Query against the header store
// (CurrentStore context), and the page owns the confirm / preview dialog state.
import { Suspense, useState } from 'react';

import { useParams } from 'next/navigation';

import { NoticeDetailConfirmDialog } from '@/app/(private)/blogs/_components/notice-detail-confirm-dialog';
import { NoticeDetailMetaCard } from '@/app/(private)/blogs/_components/notice-detail-meta-card';
import { NoticeDetailPublishCard } from '@/app/(private)/blogs/_components/notice-detail-publish-card';
import { NoticeDetailSkeleton } from '@/app/(private)/blogs/_components/notice-detail-skeleton';
import { NoticeDetailStatusBadge } from '@/app/(private)/blogs/_components/notice-detail-status-badge';
import { NoticeDetailStatusCard } from '@/app/(private)/blogs/_components/notice-detail-status-card';
import { NoticeDetailTargetCard } from '@/app/(private)/blogs/_components/notice-detail-target-card';
import { NoticeDetailWpSyncCard } from '@/app/(private)/blogs/_components/notice-detail-wp-sync-card';
import { NOTICE_DETAIL_DENY_TOOLTIPS } from '@/app/(private)/blogs/_constants/notice-detail.constants';
import { useNoticeDetailActions } from '@/app/(private)/blogs/_hooks/use-notice-detail-actions.hook';
import {
  getDisplayStatus,
  isOwnArticle,
  scopedNoticeEditRoles,
} from '@/app/(private)/blogs/_utils/notice-row.util';
import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { getCrmNoticesByIdOptions } from '@/lib/api/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

import { AnnouncementPreviewDialog } from '../_components/announcement-preview-dialog';
import { AnnouncementDetailBasicInfoCard } from './_components/announcement-detail-basic-info-card';
import { AnnouncementDetailHeaderActions } from './_components/announcement-detail-header-actions';
import { AnnouncementDetailReachCard } from './_components/announcement-detail-reach-card';
import {
  ANNOUNCEMENT_DETAIL_ACTION_TOASTS,
  ANNOUNCEMENT_DETAIL_BACK_LABEL,
  ANNOUNCEMENT_DETAIL_CONFIRM_COPY,
  ANNOUNCEMENT_DETAIL_ERROR_TITLE,
  ANNOUNCEMENT_DETAIL_NOT_FOUND,
  ANNOUNCEMENT_DETAIL_PAGE_TITLE,
  ANNOUNCEMENT_DETAIL_WP_SYNC_CONFIG,
} from './_constants/announcement-detail.constants';

const BACK_LINK = (
  <BackToListLink label={ANNOUNCEMENT_DETAIL_BACK_LABEL} listPath={navigate('/announcements')} />
);

function AnnouncementDetailPageContent({
  id,
  currentStoreId,
}: {
  id: string;
  currentStoreId: string;
}) {
  const { user, hasRole } = useAuthUser();
  const [previewOpen, setPreviewOpen] = useState(false);
  const actions = useNoticeDetailActions(id, { toasts: ANNOUNCEMENT_DETAIL_ACTION_TOASTS });

  // Header store as a mock-only seam (blog-detail research D3 / BD-05): part of the query key,
  // so switching the store refetches and an announcement not reaching it turns into not-found.
  const query = currentStoreId === ALL_STORES ? undefined : { storeId: currentStoreId };
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...getCrmNoticesByIdOptions({ path: { id }, query }),
    enabled: Boolean(id),
  });

  // 404 = unknown / out-of-scope, 400 = malformed id; a ブログ article is not an お知らせ either
  // (FR-019, research R6). Only other errors keep the retry state.
  const errorStatus = getApiErrorStatus(error);
  const isNotFound = errorStatus === 404 || errorStatus === 400 || data?.type === 'blog';

  if (isLoading || isError || !data || isNotFound) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader breadcrumb={BACK_LINK} title={ANNOUNCEMENT_DETAIL_PAGE_TITLE} />
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError && !isNotFound}
          isEmpty
          onRetry={() => void refetch()}
          errorTitle={ANNOUNCEMENT_DETAIL_ERROR_TITLE}
          emptyTitle={ANNOUNCEMENT_DETAIL_NOT_FOUND.title}
          emptyDescription={ANNOUNCEMENT_DETAIL_NOT_FOUND.description}
          skeleton={<NoticeDetailSkeleton withBodyCard={false} withReachCard />}
        />
      </div>
    );
  }

  const detail = data;
  const status = getDisplayStatus(detail);
  // FR-011: Staff only on their own announcement; the denial copy tells a Staff non-author apart.
  const isOwn = isOwnArticle(detail, user?.staffId);
  const editGate = {
    allowedRoles: scopedNoticeEditRoles(isOwn),
    denyTooltip:
      hasRole([UserRole.Staff]) && !isOwn
        ? NOTICE_DETAIL_DENY_TOOLTIPS.notAuthor
        : NOTICE_DETAIL_DENY_TOOLTIPS.noEditPermission,
  };

  const statusAction =
    status === 'published' || status === 'scheduled' ? (
      <RoleGatedButton
        requiredPermission={Permission.AnnouncementsPublish}
        allowedRoles={editGate.allowedRoles}
        denyTooltip={editGate.denyTooltip}
        variant="outline"
        size="sm"
        fullWidth
        onClick={() => actions.openConfirm(status === 'published' ? 'unpublish' : 'cancelSchedule')}
      >
        {status === 'published' ? '非公開にする' : '予約を取り消す'}
      </RoleGatedButton>
    ) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        breadcrumb={BACK_LINK}
        title={detail.title}
        subtitle={detail.articleNo}
        badge={<NoticeDetailStatusBadge status={status} />}
        actions={
          <AnnouncementDetailHeaderActions
            detail={detail}
            editGate={editGate}
            onConfirm={actions.openConfirm}
            onPreview={() => setPreviewOpen(true)}
          />
        }
      />

      <main className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex w-[60%] flex-col gap-4">
            <AnnouncementDetailBasicInfoCard detail={detail} />
            <NoticeDetailTargetCard detail={detail} />
            <NoticeDetailPublishCard detail={detail} />
          </div>
          <div className="w-[40%]">
            <div className="sticky top-0 flex flex-col gap-4">
              <NoticeDetailStatusCard detail={detail} action={statusAction} />
              <NoticeDetailWpSyncCard detail={detail} config={ANNOUNCEMENT_DETAIL_WP_SYNC_CONFIG} />
              <AnnouncementDetailReachCard detail={detail} />
              <NoticeDetailMetaCard detail={detail} />
            </div>
          </div>
        </div>
      </main>

      <NoticeDetailConfirmDialog
        kind={actions.confirmKind}
        copy={ANNOUNCEMENT_DETAIL_CONFIRM_COPY}
        onOpenChange={(open) => {
          if (!open) actions.closeConfirm();
        }}
        onConfirm={actions.confirm}
        isPending={actions.isPending}
      />

      <AnnouncementPreviewDialog
        row={previewOpen ? detail : null}
        body={detail.body}
        dateFormat="detail"
        onOpenChange={(open) => {
          if (!open) setPreviewOpen(false);
        }}
      />
    </div>
  );
}

/** Remounts the content per announcement / header store so no dialog state carries over. */
function AnnouncementDetailPageScope() {
  const { id } = useParams<{ id: string }>();
  const { currentStoreId } = useCurrentStore();
  return (
    <AnnouncementDetailPageContent
      key={`${id}:${currentStoreId}`}
      id={id}
      currentStoreId={currentStoreId}
    />
  );
}

export default function AnnouncementDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AnnouncementDetailPageScope />
    </Suspense>
  );
}
