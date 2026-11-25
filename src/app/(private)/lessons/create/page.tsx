'use client';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { PageHeader } from '@/components/common/page-header';

import { navigate } from '@/lib/routes/routes.util';

import { LessonForm } from '../_components/lesson-form/lesson-form';

export default function LessonCreatePage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={
          <BackToListLink label="レッスン内容管理に戻る" listPath={navigate('/lessons')} />
        }
        title="新規レッスン作成"
      />
      <LessonForm mode="create" />
    </div>
  );
}
