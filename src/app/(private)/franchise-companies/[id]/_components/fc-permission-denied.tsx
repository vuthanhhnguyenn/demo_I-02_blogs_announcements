import { ShieldAlert } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';

/** D15 — role / own-company scope denial (E-AUTH-100 / E-AUTH-103 / E-FC-003) */
export function FcPermissionDenied({ description }: Readonly<{ description?: string }>) {
  return (
    <Empty
      variant="empty"
      icon={ShieldAlert}
      title="閲覧権限がありません"
      description={description ?? 'このFC企業の情報を参照する権限がありません'}
    />
  );
}
