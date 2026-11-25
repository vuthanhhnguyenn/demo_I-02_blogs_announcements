'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { PageHeader } from '@/components/common/page-header';

import { navigate } from '@/lib/routes/routes.util';

import { BannerForm } from '../_components/banner-form/banner-form';

export default function BannerCreatePage() {
  const router = useRouter();

  const navigateToList = useCallback(() => {
    router.push(navigate('/banners'));
  }, [router]);

  return (
    <>
      <PageHeader
        breadcrumb={<BackToListLink label="バナー管理に戻る" listPath={navigate('/banners')} />}
        title="バナー新規登録"
      />

      <BannerForm mode="create" onNavigateBack={navigateToList} />
    </>
  );
}
