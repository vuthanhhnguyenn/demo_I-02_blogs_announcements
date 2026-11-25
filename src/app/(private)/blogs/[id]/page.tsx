'use client';
// Client component: the article is fetched with React Query against the header store
// (CurrentStore context), and the page owns the confirm / preview dialog state.
import { Suspense, useState } from 'react';

import { useParams } from 'next/navigation';

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

import { BlogPreviewDialog } from '../_components/blog-preview-dialog';
import { NoticeDetailConfirmDialog } from '../_components/notice-detail-confirm-dialog';
import { NoticeDetailMetaCard } from '../_components/notice-detail-meta-card';
import { NoticeDetailPublishCard } from '../_components/notice-detail-publish-card';
import { NoticeDetailSkeleton } from '../_components/notice-detail-skeleton';
import { NoticeDetailStatusBadge } from '../_components/notice-detail-status-badge';
import { NoticeDetailStatusCard } from '../_components/notice-detail-status-card';
import { NoticeDetailTargetCard } from '../_components/notice-detail-target-card';
import { NoticeDetailWpSyncCard } from '../_components/notice-detail-wp-sync-card';
import {
  BLOG_DETAIL_ACTION_TOASTS,
  BLOG_DETAIL_CONFIRM_COPY,
  BLOG_DETAIL_DENY_TOOLTIPS,
  BLOG_DETAIL_WP_SYNC_CONFIG,
} from '../_constants/blog.constants';
import { useNoticeDetailActions } from '../_hooks/use-notice-detail-actions.hook';
import { getDisplayStatus, isOwnArticle, scopedBlogEditRoles } from '../_utils/blog-row.util';
import { BlogDetailBasicInfoCard } from './_components/blog-detail-basic-info-card';
import { BlogDetailBodyCard } from './_components/blog-detail-body-card';
import { BlogDetailHeaderActions } from './_components/blog-detail-header-actions';

const BACK_LINK = <BackToListLink label="ブログ管理に戻る" listPath={navigate('/blogs')} />;

function BlogDetailPageContent({ id, currentStoreId }: { id: string; currentStoreId: string }) {
  const { user, hasRole } = useAuthUser();
  const [previewOpen, setPreviewOpen] = useState(false);
  const actions = useNoticeDetailActions(id, { toasts: BLOG_DETAIL_ACTION_TOASTS });

  // Header store as a mock-only seam (research D3 / BD-05): part of the query key, so switching
  // the store refetches and an article not reaching it turns into the not-found state.
  const query = currentStoreId === ALL_STORES ? undefined : { storeId: currentStoreId };
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...getCrmNoticesByIdOptions({ path: { id }, query }),
    enabled: Boolean(id),
  });

  // 404 = unknown / out-of-scope article, 400 = malformed id; a 告知 (type notice) is not a
  // blog either. Only other errors keep the retry state.
  const errorStatus = getApiErrorStatus(error);
  const isNotFound = errorStatus === 404 || errorStatus === 400 || data?.type === 'notice';

  if (isLoading || isError || !data || isNotFound) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader breadcrumb={BACK_LINK} title="ブログ詳細" />
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError && !isNotFound}
          isEmpty
          onRetry={() => void refetch()}
          errorTitle="ブログ記事の取得に失敗しました"
          emptyTitle="ブログ記事が見つかりません"
          emptyDescription="指定されたブログ記事は存在しないか、削除された可能性があります。"
          skeleton={<NoticeDetailSkeleton />}
        />
      </div>
    );
  }

  const detail = data;
  const status = getDisplayStatus(detail);
  // FR-010: Staff only on their own article; the denial copy tells a Staff non-author apart.
  const isOwn = isOwnArticle(detail, user?.staffId);
  const editGate = {
    allowedRoles: scopedBlogEditRoles(isOwn),
    denyTooltip:
      hasRole([UserRole.Staff]) && !isOwn
        ? BLOG_DETAIL_DENY_TOOLTIPS.notAuthor
        : BLOG_DETAIL_DENY_TOOLTIPS.noEditPermission,
  };

  const statusAction =
    status === 'published' || status === 'scheduled' ? (
      <RoleGatedButton
        requiredPermission={Permission.BlogsPublish}
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
          <BlogDetailHeaderActions
            detail={detail}
            editGate={editGate}
            onConfirm={actions.openConfirm}
            onPreview={() => setPreviewOpen(true)}
          />
        }
      />

      <main className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <div className="flex gap-4">
          <div className="flex w-[60%] flex-col gap-4">
            <BlogDetailBasicInfoCard detail={detail} />
            <BlogDetailBodyCard detail={detail} />
            <NoticeDetailTargetCard detail={detail} />
            <NoticeDetailPublishCard detail={detail} />
          </div>
          <div className="w-[40%]">
            <div className="sticky top-0 flex flex-col gap-4">
              <NoticeDetailStatusCard detail={detail} action={statusAction} />
              <NoticeDetailWpSyncCard detail={detail} config={BLOG_DETAIL_WP_SYNC_CONFIG} />
              <NoticeDetailMetaCard detail={detail} />
            </div>
          </div>
        </div>
      </main>

      <NoticeDetailConfirmDialog
        kind={actions.confirmKind}
        copy={BLOG_DETAIL_CONFIRM_COPY}
        onOpenChange={(open) => {
          if (!open) actions.closeConfirm();
        }}
        onConfirm={actions.confirm}
        isPending={actions.isPending}
      />

      <BlogPreviewDialog
        article={previewOpen ? detail : null}
        onOpenChange={(open) => {
          if (!open) setPreviewOpen(false);
        }}
        dateFormat="detail"
      />
    </div>
  );
}

/** Remounts the content per article / header store so no dialog state carries over. */
function BlogDetailPageScope() {
  const { id } = useParams<{ id: string }>();
  const { currentStoreId } = useCurrentStore();
  return (
    <BlogDetailPageContent
      key={`${id}:${currentStoreId}`}
      id={id}
      currentStoreId={currentStoreId}
    />
  );
}

export default function BlogDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BlogDetailPageScope />
    </Suspense>
  );
}
