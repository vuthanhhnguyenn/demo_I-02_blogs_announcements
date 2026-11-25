'use client';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { PageHeader } from '@/components/common/page-header';

import { navigate } from '@/lib/routes/routes.util';

import { CrmMaintenanceForm } from '../_components/crm-maintenance-form/crm-maintenance-form';

export default function CrmMaintenanceCreatePage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={
          <BackToListLink
            label="CRMメンテナンス管理に戻る"
            listPath={navigate('/crm-maintenance')}
          />
        }
        title="CRMメンテナンス新規登録"
      />
      <CrmMaintenanceForm mode="create" />
    </div>
  );
}
