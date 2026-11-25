import { ToneBadge } from '@/components/common/tone-badge';

import {
  APP_VERSION_STATUS_LABELS,
  APP_VERSION_STATUS_TONES,
  type AppVersionStatus,
} from '../_constants/app-version.constants';

export function AppVersionStatusBadge({ status }: Readonly<{ status: AppVersionStatus }>) {
  return (
    <ToneBadge tone={APP_VERSION_STATUS_TONES[status]} dot>
      {APP_VERSION_STATUS_LABELS[status]}
    </ToneBadge>
  );
}
