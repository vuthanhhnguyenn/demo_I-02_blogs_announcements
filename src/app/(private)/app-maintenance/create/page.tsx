'use client';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { PageHeader } from '@/components/common/page-header';

import { navigate } from '@/lib/routes/routes.util';

import { AppMaintenanceForm } from '../_components/app-maintenance-form/app-maintenance-form';

export default function AppMaintenanceCreatePage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={
          <BackToListLink
            label="アプリメンテナンス管理に戻る"
            listPath={navigate('/app-maintenance')}
          />
        }
        title="アプリメンテナンス新規登録"
      />
      <AppMaintenanceForm mode="create" />
    </div>
  );
}
