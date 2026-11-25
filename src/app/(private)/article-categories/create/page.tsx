import { BackToListLink } from '@/components/common/back-to-list-link';
import { PageHeader } from '@/components/common/page-header';

import { navigate } from '@/lib/routes/routes.util';

import { ArticleCategoryForm } from '../_components/article-category-form/article-category-form';

export default function ArticleCategoryCreatePage() {
  return (
    <>
      <PageHeader
        breadcrumb={
          <BackToListLink label="カテゴリ管理に戻る" listPath={navigate('/article-categories')} />
        }
        title="カテゴリ登録"
      />

      <ArticleCategoryForm mode="create" />
    </>
  );
}
