'use client';
// Client component: the form's defaults depend on the signed-in user's role (auth context), and
// the form itself is react-hook-form driven.
import { Suspense } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';

import { navigate } from '@/lib/routes/routes.util';

import { BlogForm, BlogFormSkeleton } from '../_components/blog-form';
import { BLOG_WIDE_SCOPE_ROLES } from '../_constants/blog.constants';
import { type BlogFormValues, emptyBlogFormValues } from '../_schemas/blog-form.schema';

const PAGE_TITLE = 'ブログ新規登録';

function BlogCreatePageContent() {
  const { user, isLoading, hasRole } = useAuthUser();

  // The scope default needs the role, and useForm reads its defaults only once.
  if (isLoading || !user) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader
          breadcrumb={<BackToListLink label="ブログ管理に戻る" listPath={navigate('/blogs')} />}
          title={PAGE_TITLE}
        />
        <BlogFormSkeleton />
      </div>
    );
  }

  // US1-AC1: 全社配信 for Manager and above, 店舗指定 for Staff (Clarification Q1).
  const defaultValues: BlogFormValues = {
    ...emptyBlogFormValues,
    scope: hasRole(BLOG_WIDE_SCOPE_ROLES) ? 'company' : 'store',
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BlogForm mode="create" title={PAGE_TITLE} defaultValues={defaultValues} />
    </div>
  );
}

export default function BlogCreatePage() {
  return (
    <Suspense fallback={<Loading />}>
      <BlogCreatePageContent />
    </Suspense>
  );
}
