'use client';
// Client component: the announcement is fetched with React Query against the header store
// (CurrentStore context) and edited in a react-hook-form driven form.
import { Suspense, useMemo } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { NOTICE_DETAIL_DENY_TOOLTIPS } from '@/app/(private)/blogs/_constants/notice-detail.constants';
import { isOwnArticle } from '@/app/(private)/blogs/_utils/notice-row.util';
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

import { AnnouncementForm, AnnouncementFormSkeleton } from '../../_components/announcement-form';
import {
  ANNOUNCEMENT_FORM_BACK_LABEL,
  ANNOUNCEMENT_FORM_EDIT_TITLE,
} from '../../_constants/announcement-form.constants';
import { announcementDetailToFormValues } from '../../_schemas/announcement-form.mapper';

const PAGE_TITLE = ANNOUNCEMENT_FORM_EDIT_TITLE;
const BACK_LINK = (
  <BackToListLink label={ANNOUNCEMENT_FORM_BACK_LABEL} listPath={navigate('/announcements')} />
);

/** Reason line of the not-allowed state (blog-form research F8, spec US3-AC3). */
const DENY_REASONS = {
  notFound: '指定されたお知らせは存在しないか、閲覧できる範囲外です。',
  deleted: '削除済みのお知らせは編集できません。詳細画面または一覧から復元してください。',
  notAuthor: `${NOTICE_DETAIL_DENY_TOOLTIPS.notAuthor}。`,
} as const;

function AnnouncementEditPageContent({
  id,
  currentStoreId,
}: {
  id: string;
  currentStoreId: string;
}) {
  const { user, hasRole } = useAuthUser();
  const backToListHref = useBackToListHref(navigate('/announcements'));

  // Header store as a mock-only seam (blog-detail research D3 / BD-05), as the detail page.
  const query = currentStoreId === ALL_STORES ? undefined : { storeId: currentStoreId };
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...getCrmNoticesByIdOptions({ path: { id }, query }),
    enabled: Boolean(id),
  });

  // 404 = unknown / out-of-scope, 400 = malformed id; a ブログ article is not an お知らせ either.
  const errorStatus = getApiErrorStatus(error);
  const isNotFound = errorStatus === 404 || errorStatus === 400 || data?.type === 'blog';
  const denyReason = isNotFound
    ? DENY_REASONS.notFound
    : data?.deletedAt
      ? DENY_REASONS.deleted
      : data && hasRole([UserRole.Staff]) && !isOwnArticle(data, user?.staffId)
        ? DENY_REASONS.notAuthor
        : null;

  const defaultValues = useMemo(() => (data ? announcementDetailToFormValues(data) : null), [data]);

  if (isLoading || (isError && !isNotFound) || !data || !defaultValues || denyReason) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader breadcrumb={BACK_LINK} title={PAGE_TITLE} />
        <DataStateBoundary
          isLoading={isLoading}
          isError={isError && !isNotFound}
          isEmpty
          onRetry={() => void refetch()}
          errorTitle="お知らせの取得に失敗しました"
          emptyState={{
            title: 'このお知らせは編集できません',
            description: denyReason ?? DENY_REASONS.notFound,
            action: (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={backToListHref} />}
              >
                {ANNOUNCEMENT_FORM_BACK_LABEL}
              </Button>
            ),
          }}
          skeleton={<AnnouncementFormSkeleton />}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AnnouncementForm
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
function AnnouncementEditPageScope() {
  const { id } = useParams<{ id: string }>();
  const { currentStoreId } = useCurrentStore();
  return (
    <AnnouncementEditPageContent
      key={`${id}:${currentStoreId}`}
      id={id}
      currentStoreId={currentStoreId}
    />
  );
}

export default function AnnouncementEditPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AnnouncementEditPageScope />
    </Suspense>
  );
}
