import { BackToListLink } from '@/components/common/back-to-list-link';
import { PageHeader } from '@/components/common/page-header';

import { StudioForm } from '../_components/studio-form/studio-form';

export default function StudioCreatePage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={<BackToListLink label="スタジオ管理に戻る" listPath="/studios" />}
        title="スタジオ登録"
      />
      <StudioForm mode="create" />
    </div>
  );
}
