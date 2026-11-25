import {
  TERMS_STATUS_LABELS,
  TERMS_STATUS_TONES,
} from '@/app/(private)/terms/_constants/constants';

import { ToneBadge } from '@/components/common/tone-badge';

import type { TermsDocumentDetailDto as TermsDetailDto } from '@/lib/api-real/types.gen';

interface TermsStatusBadgeProps {
  terms: Pick<TermsDetailDto, 'status' | 'deletedAt'>;
  dot?: boolean;
}

export function TermsStatusBadge({ terms, dot }: Readonly<TermsStatusBadgeProps>) {
  return (
    <ToneBadge tone={terms.deletedAt ? 'destructive' : TERMS_STATUS_TONES[terms.status]} dot={dot}>
      {terms.deletedAt ? '削除済み' : TERMS_STATUS_LABELS[terms.status]}
    </ToneBadge>
  );
}
