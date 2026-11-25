'use client';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { PageHeader } from '@/components/common/page-header';

import { navigate } from '@/lib/routes/routes.util';

import { InstructorForm } from '../_components/instructor-form/instructor-form';

export default function InstructorCreatePage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={<BackToListLink label="指導者管理に戻る" listPath={navigate('/instructors')} />}
        title="新規指導者登録"
      />
      <InstructorForm mode="create" />
    </div>
  );
}
