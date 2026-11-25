'use client';
// Client component: the article is fetched with React Query against the header store
// (CurrentStore context) and edited in a react-hook-form driven form.
import { Suspense, useMemo } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';

import { useBackToListHref } from '@/hooks/use-return-to.hook';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { getCrmNoticesByIdOptions } from '@/lib/api/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { BlogForm, BlogFormSkeleton } from '../../_components/blog-form';
import { BLOG_DETAIL_DENY_TOOLTIPS } from '../../_constants/blog.constants';
import { blogDetailToFormValues } from '../../_schemas/blog-form.mapper';
import { isOwnArticle } from '../../_utils/blog-row.util';

const PAGE_TITLE = 'ブログ編集';
const BACK_LINK = <BackToListLink label="ブログ管理に戻る" listPath={navigate('/blogs')} />;

/** Reason line of the not-allowed state (research F8). */
const DENY_REASONS = {
  notFound: '指定されたブログ記事は存在しないか、閲覧できる範囲外です。',
  deleted: '削除済みの記事は編集できません。詳細画面または一覧から復元してください。',
  notAuthor: `${BLOG_DETAIL_DENY_TOOLTIPS.notAuthor}。`,
} as const;

function BlogEditPageContent({ id, currentStoreId }: { id: string; currentStoreId: string }) {
  const { user, hasRole } = useAuthUser();
  const backToListHref = useBackToListHref(navigate('/blogs'));

  // Header store as a mock-only seam (blog-detail research D3 / BD-05), as the detail page.
  const query = currentStoreId === ALL_STORES ? undefined : { storeId: currentStoreId };
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...getCrmNoticesByIdOptions({ path: { id }, query }),
    enabled: Boolean(id),
  });

  // 404 = unknown / out-of-scope, 400 = malformed id; a 告知 is not a blog either (F8).
  const errorStatus = getApiErrorStatus(error);
  const isNotFound = errorStatus === 404 || errorStatus === 400 || data?.type === 'notice';
  const denyReason = isNotFound
    ? DENY_REASONS.notFound
    : data?.deletedAt
      ? DENY_REASONS.deleted
      : data && hasRole([UserRole.Staff]) && !isOwnArticle(data, user?.staffId)
        ? DENY_REASONS.notAuthor
        : null;

  const defaultValues = useMemo(() => (data ? blogDetailToFormValues(data) : null), [data]);

  if (isLoading || (isError && !isNotFound) || !data || !defaultValues || denyReason) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader breadcrumb={BACK_LINK} title={PAGE_TITLE} />
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError && !isNotFound}
          isEmpty
          onRetry={() => void refetch()}
          errorTitle="ブログ記事の取得に失敗しました"
          emptyState={{
            title: 'このブログ記事は編集できません',
            description: denyReason ?? DENY_REASONS.notFound,
            action: (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={backToListHref} />}
              >
                ブログ管理に戻る
              </Button>
            ),
          }}
          skeleton={<BlogFormSkeleton />}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BlogForm
        mode="edit"
        title={PAGE_TITLE}
        defaultValues={defaultValues}
        detail={data}
        onReloadDetail={async () => (await refetch()).data ?? null}
      />
    </div>
  );
}

/** Remounts the content per article / header store so no form state carries over. */
function BlogEditPageScope() {
  const { id } = useParams<{ id: string }>();
  const { currentStoreId } = useCurrentStore();
  return (
    <BlogEditPageContent key={`${id}:${currentStoreId}`} id={id} currentStoreId={currentStoreId} />
  );
}

export default function BlogEditPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BlogEditPageScope />
    </Suspense>
  );
}
